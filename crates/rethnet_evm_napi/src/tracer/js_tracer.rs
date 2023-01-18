use std::sync::mpsc::{channel, Sender};

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBufferValue, JsFunction, JsNumber, JsUndefined, NapiRaw, Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::{Gas, Return, OPCODE_JUMPMAP};

use crate::{
    sync::{await_void_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Account, ExecutionResult,
};

#[napi(object)]
pub struct TracingMessage {
    /// Recipient address. None if it is a Create message.
    #[napi(readonly)]
    pub to: Option<Buffer>,

    /// Depth of the message
    #[napi(readonly)]
    pub depth: u8,

    /// Input data of the message
    #[napi(readonly)]
    pub data: Buffer,

    /// Value sent in the message
    #[napi(readonly)]
    pub value: BigInt,

    /// Address of the code that is being executed. Can be different from `to` if a delegate call
    /// is being done.
    #[napi(readonly)]
    pub code_address: Option<Buffer>,
}

#[napi(object)]
pub struct TracingStep {
    /// Call depth
    #[napi(readonly)]
    pub depth: JsNumber,
    /// The program counter
    #[napi(readonly)]
    pub pc: BigInt,
    /// The executed op code
    #[napi(readonly)]
    pub opcode: String,
    // /// The return value of the step
    // #[napi(readonly)]
    // pub return_value: u8,
    /// The amount of gas that was used by the step
    #[napi(readonly)]
    pub gas_cost: BigInt,
    /// The amount of gas that was refunded by the step
    #[napi(readonly)]
    pub gas_refunded: BigInt,
    /// The amount of gas left
    #[napi(readonly)]
    pub gas_left: BigInt,
    /// The stack
    #[napi(readonly)]
    pub stack: Vec<BigInt>,
    /// The memory
    #[napi(readonly)]
    pub memory: Buffer,
    /// The contract being executed
    #[napi(readonly)]
    pub contract: Account,
    /// The address of the contract
    #[napi(readonly)]
    pub contract_address: Buffer,
    // /// The address of the code being executed
    // #[napi(readonly)]
    // pub code_address: Buffer,
}

#[napi(object)]
pub struct TracingMessageResult {
    /// Execution result
    #[napi(readonly)]
    pub execution_result: ExecutionResult,
}

#[napi(object)]
pub struct TracingCallbacks {
    #[napi(ts_type = "(message: TracingMessage, next: any) => Promise<void>")]
    pub before_message: JsFunction,
    #[napi(ts_type = "(step: TracingStep, next: any) => Promise<void>")]
    pub step: JsFunction,
    #[napi(ts_type = "(result: TracingMessageResult, next: any) => Promise<void>")]
    pub after_message: JsFunction,
}

pub struct BeforeMessageHandlerCall {
    pub depth: usize,
    pub to: Option<Address>,
    pub data: Bytes,
    pub value: U256,
    pub code_address: Option<Address>,
    pub sender: Sender<napi::Result<()>>,
}

pub struct StepHandlerCall {
    /// Call depth
    pub depth: usize,
    /// The program counter
    pub pc: u64,
    /// The executed op code
    pub opcode: u8,
    /// The return value of the step
    pub return_value: Return,
    /// The amount of gas that was used by the step
    pub gas_cost: u64,
    /// The amount of gas that was refunded by the step
    pub gas_refunded: i64,
    /// The amount of gas left
    pub gas_left: u64,
    /// The stack
    pub stack: Vec<U256>,
    /// The memory
    pub memory: Bytes,
    /// The contract being executed
    pub contract: rethnet_evm::AccountInfo,
    /// The address of the contract
    pub contract_address: Address,
    // /// The address of the code being executed
    // pub code_address: Address,
    pub sender: Sender<napi::Result<()>>,
}

pub struct AfterMessageHandlerCall {
    pub result: rethnet_evm::ExecutionResult,
    pub sender: Sender<napi::Result<()>>,
}

#[derive(Clone)]
struct StepData {
    depth: usize,
    pc: u64,
    opcode: u8,
    gas: Gas,
}

#[derive(Clone)]
pub struct JsTracer {
    before_message_fn: ThreadsafeFunction<BeforeMessageHandlerCall>,
    step_fn: ThreadsafeFunction<StepHandlerCall>,
    after_message_fn: ThreadsafeFunction<AfterMessageHandlerCall>,
    pre_step: Option<StepData>,
}

impl JsTracer {
    /// Constructs a `JsTracer` from `TracingCallbacks`.
    pub fn new(env: &Env, callbacks: TracingCallbacks) -> napi::Result<Self> {
        let before_message_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.before_message.raw() },
            0,
            |ctx: ThreadSafeCallContext<BeforeMessageHandlerCall>| {
                let sender = ctx.value.sender.clone();

                let mut tracing_message = ctx.env.create_object()?;

                ctx.env
                    .create_int64(ctx.value.depth as i64)
                    .and_then(|depth| tracing_message.set_named_property("depth", depth))?;

                ctx.value
                    .to
                    .as_ref()
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |to| {
                            ctx.env
                                .create_buffer_copy(to)
                                .map(JsBufferValue::into_unknown)
                        },
                    )
                    .and_then(|to| tracing_message.set_named_property("to", to))?;

                ctx.env
                    .create_buffer_copy(&ctx.value.data)
                    .and_then(|data| tracing_message.set_named_property("data", data.into_raw()))?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.value.as_limbs().to_vec())
                    .and_then(|value| tracing_message.set_named_property("value", value))?;

                ctx.value
                    .code_address
                    .as_ref()
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |address| {
                            ctx.env
                                .create_buffer_copy(address)
                                .map(JsBufferValue::into_unknown)
                        },
                    )
                    .and_then(|code_address| {
                        tracing_message.set_named_property("codeAddress", code_address)
                    })?;

                let next = ctx.env.create_object()?;

                let promise = ctx.callback.call(None, &[tracing_message, next])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let step_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.step.raw() },
            0,
            |ctx: ThreadSafeCallContext<StepHandlerCall>| {
                let sender = ctx.value.sender.clone();

                let mut tracing_step = ctx.env.create_object()?;

                ctx.env
                    .create_int64(ctx.value.depth as i64)
                    .and_then(|depth| tracing_step.set_named_property("depth", depth))?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.pc)
                    .and_then(|pc| tracing_step.set_named_property("pc", pc))?;

                ctx.env
                    .create_string(OPCODE_JUMPMAP[usize::from(ctx.value.opcode)].unwrap_or(""))
                    .and_then(|opcode| tracing_step.set_named_property("opcode", opcode))?;

                ctx.env
                    .create_uint32((ctx.value.return_value as u8).into())
                    .and_then(|return_value| {
                        tracing_step.set_named_property("returnValue", return_value)
                    })?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.gas_cost)
                    .and_then(|gas_cost| tracing_step.set_named_property("gasCost", gas_cost))?;

                ctx.env
                    .create_bigint_from_i64(ctx.value.gas_refunded)
                    .and_then(|gas_refunded| {
                        tracing_step.set_named_property("gasRefunded", gas_refunded)
                    })?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.gas_left)
                    .and_then(|gas_left| tracing_step.set_named_property("gasLeft", gas_left))?;

                let mut stack =
                    ctx.env
                        .create_array(u32::try_from(ctx.value.stack.len()).map_err(|e| {
                            napi::Error::new(Status::GenericFailure, e.to_string())
                        })?)?;

                for value in ctx.value.stack {
                    ctx.env
                        .create_bigint_from_words(false, value.as_limbs().to_vec())
                        .and_then(|value| stack.insert(value))?;
                }

                stack
                    .coerce_to_object()
                    .and_then(|stack| tracing_step.set_named_property("stack", stack))?;

                ctx.env
                    .create_buffer_copy(&ctx.value.memory)
                    .and_then(|memory| {
                        tracing_step.set_named_property("memory", memory.into_raw())
                    })?;

                let mut contract = ctx.env.create_object()?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.contract.balance.as_limbs().to_vec())
                    .and_then(|balance| contract.set_named_property("balance", balance))?;

                let nonce = ctx.env.create_bigint_from_u64(ctx.value.contract.nonce)?;
                contract.set_named_property("nonce", nonce)?;

                ctx.env
                    .create_buffer_copy(&ctx.value.memory)
                    .and_then(|code_hash| {
                        contract.set_named_property("codeHash", code_hash.into_unknown())
                    })?;

                ctx.value
                    .contract
                    .code
                    .as_ref()
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |code| {
                            ctx.env
                                .create_buffer_copy(&code.bytes()[..code.len()])
                                .map(|code| code.into_unknown())
                        },
                    )
                    .and_then(|code| contract.set_named_property("code", code))?;

                tracing_step.set_named_property("contract", contract)?;

                let contract_address = &ctx.value.contract_address;
                ctx.env
                    .create_buffer_copy(contract_address)
                    .and_then(|contract_address| {
                        tracing_step
                            .set_named_property("contractAddress", contract_address.into_unknown())
                    })?;

                let next = ctx.env.create_object()?;

                let promise = ctx.callback.call(None, &[tracing_step, next])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let after_message_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.after_message.raw() },
            0,
            |ctx: ThreadSafeCallContext<AfterMessageHandlerCall>| {
                let sender = ctx.value.sender.clone();

                let mut tracing_message_result = ctx.env.create_object()?;

                let mut execution_result = ctx.env.create_object()?;

                let exit_code = ctx
                    .env
                    .create_uint32((ctx.value.result.exit_reason as u8).into())?;
                execution_result.set_named_property("exitCode", exit_code)?;

                let mut transaction_output = ctx.env.create_object()?;

                let (output, address) = match &ctx.value.result.out {
                    rethnet_evm::TransactOut::None => (None, None),
                    rethnet_evm::TransactOut::Call(output) => (Some(output), None),
                    rethnet_evm::TransactOut::Create(output, address) => {
                        (Some(output), address.as_ref())
                    }
                };

                output
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |output| {
                            ctx.env
                                .create_buffer_copy(output)
                                .map(JsBufferValue::into_unknown)
                        },
                    )
                    .and_then(|output| transaction_output.set_named_property("output", output))?;

                address
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |address| {
                            ctx.env
                                .create_buffer_copy(address)
                                .map(JsBufferValue::into_unknown)
                        },
                    )
                    .and_then(|address| {
                        transaction_output.set_named_property("address", address)
                    })?;

                execution_result.set_named_property("output", transaction_output)?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.result.gas_used)
                    .and_then(|gas_used| {
                        execution_result.set_named_property("gasUsed", gas_used)
                    })?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.result.gas_refunded)
                    .and_then(|gas_refunded| {
                        execution_result.set_named_property("gasRefunded", gas_refunded)
                    })?;

                u32::try_from(ctx.value.result.logs.len())
                    .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
                    .and_then(|num_logs| ctx.env.create_array(num_logs))
                    .and_then(|mut logs| {
                        for log in ctx.value.result.logs {
                            let mut log_object = ctx.env.create_object()?;

                            ctx.env
                                .create_buffer_copy(log.address)
                                .and_then(|address| {
                                    log_object.set_named_property("address", address.into_raw())
                                })?;

                            u32::try_from(log.topics.len())
                                .map_err(|e| {
                                    napi::Error::new(Status::GenericFailure, e.to_string())
                                })
                                .and_then(|num_topics| ctx.env.create_array(num_topics))
                                .and_then(|mut topics| {
                                    for topic in log.topics {
                                        ctx.env
                                            .create_buffer_copy(topic)
                                            .and_then(|topic| topics.insert(topic.into_raw()))?
                                    }

                                    topics.coerce_to_object()
                                })
                                .and_then(|topics| {
                                    log_object.set_named_property("topics", topics)
                                })?;

                            ctx.env.create_buffer_copy(&log.data).and_then(|data| {
                                log_object.set_named_property("data", data.into_raw())
                            })?;

                            logs.insert(log_object)?;
                        }

                        logs.coerce_to_object()
                    })
                    .and_then(|logs| execution_result.set_named_property("logs", logs))?;

                ctx.env
                    .create_object()
                    .and_then(|trace| execution_result.set_named_property("trace", trace))?;

                tracing_message_result.set_named_property("executionResult", execution_result)?;

                let next = ctx.env.create_object()?;

                let promise = ctx.callback.call(None, &[tracing_message_result, next])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            before_message_fn,
            step_fn,
            after_message_fn,
            pre_step: None,
        })
    }
}

impl<D> rethnet_evm::Inspector<D> for JsTracer
where
    D: rethnet_evm::Database,
{
    fn call(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        inputs: &mut rethnet_evm::CallInputs,
        _is_static: bool,
    ) -> (Return, Gas, rethnet_eth::Bytes) {
        let (sender, receiver) = channel();

        let status = self.before_message_fn.call(
            BeforeMessageHandlerCall {
                depth: data.journaled_state.depth,
                to: Some(inputs.context.address),
                data: inputs.input.clone(),
                value: inputs.transfer.value,
                code_address: Some(inputs.context.code_address),
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        (Return::Continue, Gas::new(0), Bytes::default())
    }

    fn call_end(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _inputs: &rethnet_evm::CallInputs,
        remaining_gas: Gas,
        ret: Return,
        out: Bytes,
        _is_static: bool,
    ) -> (Return, Gas, Bytes) {
        let (sender, receiver) = channel();

        let status = self.after_message_fn.call(
            AfterMessageHandlerCall {
                result: rethnet_evm::ExecutionResult {
                    exit_reason: ret,
                    out: rethnet_evm::TransactOut::Call(out.clone()),
                    gas_used: if ret == Return::InvalidOpcode || ret == Return::OpcodeNotFound {
                        remaining_gas.limit()
                    } else {
                        remaining_gas.spend()
                    },
                    gas_refunded: remaining_gas.refunded() as u64,
                    logs: data.journaled_state.logs.clone(),
                },
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        (ret, remaining_gas, out)
    }

    fn create(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        inputs: &mut rethnet_evm::CreateInputs,
    ) -> (Return, Option<rethnet_eth::B160>, Gas, Bytes) {
        let (sender, receiver) = channel();

        let status = self.before_message_fn.call(
            BeforeMessageHandlerCall {
                depth: data.journaled_state.depth,
                to: None,
                data: inputs.init_code.clone(),
                value: inputs.value,
                code_address: None,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        (Return::Continue, None, Gas::new(0), Bytes::default())
    }

    fn create_end(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _inputs: &rethnet_evm::CreateInputs,
        ret: Return,
        address: Option<rethnet_eth::B160>,
        remaining_gas: Gas,
        out: Bytes,
    ) -> (Return, Option<rethnet_eth::B160>, Gas, Bytes) {
        let (sender, receiver) = channel();

        let status = self.after_message_fn.call(
            AfterMessageHandlerCall {
                result: rethnet_evm::ExecutionResult {
                    exit_reason: ret,
                    out: rethnet_evm::TransactOut::Create(out.clone(), address),
                    gas_used: if ret == Return::InvalidOpcode || ret == Return::OpcodeNotFound {
                        remaining_gas.limit()
                    } else {
                        remaining_gas.spend()
                    },
                    gas_refunded: remaining_gas.refunded() as u64,
                    logs: data.journaled_state.logs.clone(),
                },
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        (ret, address, remaining_gas, out)
    }

    fn step(
        &mut self,
        interp: &mut rethnet_evm::Interpreter,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _is_static: bool,
    ) -> Return {
        self.pre_step = Some(StepData {
            depth: data.journaled_state.depth,
            pc: interp.program_counter() as u64,
            opcode: interp.current_opcode(),
            gas: *interp.gas(),
        });

        Return::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut rethnet_evm::Interpreter,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _is_static: bool,
        _eval: Return,
    ) -> Return {
        // TODO: temporary fix
        let pre_step_option = self.pre_step.take();
        if pre_step_option.is_none() {
            return Return::Continue;
        }

        let StepData {
            depth,
            pc,
            opcode,
            gas: pre_step_gas,
        } = pre_step_option.expect("Gas must exist");
        let post_step_gas = interp.gas();

        let (sender, receiver) = channel();

        let status = self.step_fn.call(
            StepHandlerCall {
                depth,
                pc,
                opcode,
                return_value: interp.instruction_result,
                gas_cost: post_step_gas.spend() - pre_step_gas.spend(),
                gas_refunded: post_step_gas.refunded() - pre_step_gas.refunded(),
                gas_left: interp.gas().remaining(),
                stack: interp.stack().data().clone(),
                memory: Bytes::copy_from_slice(interp.memory.data().as_slice()),
                contract: data
                    .journaled_state
                    .account(interp.contract.address)
                    .info
                    .clone(),
                contract_address: interp.contract().address,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        Return::Continue
    }
}
