use std::{
    fmt::Debug,
    sync::mpsc::{channel, Sender},
};

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBufferValue, JsFunction, JsNumber, JsUndefined, NapiRaw, Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::{
    opcode, return_revert, Bytecode, Gas, InstructionResult, SuccessOrHalt, OPCODE_JUMPMAP,
};

use crate::{
    account::Account,
    sync::{await_void_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    transaction::result::{ExceptionalHalt, ExecutionResult},
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

    /// Code of the contract that is being executed.
    #[napi(readonly)]
    pub code: Option<Buffer>,
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

#[derive(Clone)]
struct BeforeMessage {
    pub depth: usize,
    pub to: Option<Address>,
    pub data: Bytes,
    pub value: U256,
    pub code_address: Option<Address>,
    pub code: Option<Bytecode>,
}

struct BeforeMessageHandlerCall {
    message: BeforeMessage,
    sender: Sender<napi::Result<()>>,
}

pub struct StepHandlerCall {
    /// Call depth
    pub depth: usize,
    /// The program counter
    pub pc: u64,
    /// The executed op code
    pub opcode: u8,
    // /// The return value of the step
    // pub return_value: InstructionResult,
    // /// The amount of gas that was used by the step
    // pub gas_cost: u64,
    // /// The amount of gas that was refunded by the step
    // pub gas_refunded: i64,
    // /// The amount of gas left
    // pub gas_left: u64,
    // /// The stack
    // pub stack: Vec<U256>,
    // /// The memory
    // pub memory: Bytes,
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
pub struct JsTracer {
    before_message_fn: ThreadsafeFunction<BeforeMessageHandlerCall>,
    step_fn: ThreadsafeFunction<StepHandlerCall>,
    after_message_fn: ThreadsafeFunction<AfterMessageHandlerCall>,
    pending_before: Option<BeforeMessage>,
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
                    .create_int64(ctx.value.message.depth as i64)
                    .and_then(|depth| tracing_message.set_named_property("depth", depth))?;

                ctx.value
                    .message
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
                    .create_buffer_copy(&ctx.value.message.data)
                    .and_then(|data| tracing_message.set_named_property("data", data.into_raw()))?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.message.value.as_limbs().to_vec())
                    .and_then(|value| tracing_message.set_named_property("value", value))?;

                ctx.value
                    .message
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

                ctx.value
                    .message
                    .code
                    .as_ref()
                    .map_or_else(
                        || ctx.env.get_undefined().map(JsUndefined::into_unknown),
                        |code| {
                            ctx.env
                                .create_buffer_copy(&code.bytes()[..code.len()])
                                .map(JsBufferValue::into_unknown)
                        },
                    )
                    .and_then(|code_address| {
                        tracing_message.set_named_property("code", code_address)
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

                // ctx.env
                //     .create_uint32((ctx.value.return_value as u8).into())
                //     .and_then(|return_value| {
                //         tracing_step.set_named_property("returnValue", return_value)
                //     })?;

                // ctx.env
                //     .create_bigint_from_u64(ctx.value.gas_cost)
                //     .and_then(|gas_cost| tracing_step.set_named_property("gasCost", gas_cost))?;

                // ctx.env
                //     .create_bigint_from_i64(ctx.value.gas_refunded)
                //     .and_then(|gas_refunded| {
                //         tracing_step.set_named_property("gasRefunded", gas_refunded)
                //     })?;

                // ctx.env
                //     .create_bigint_from_u64(ctx.value.gas_left)
                //     .and_then(|gas_left| tracing_step.set_named_property("gasLeft", gas_left))?;

                // let mut stack =
                //     ctx.env
                //         .create_array(u32::try_from(ctx.value.stack.len()).map_err(|e| {
                //             napi::Error::new(Status::GenericFailure, e.to_string())
                //         })?)?;

                // for value in ctx.value.stack {
                //     ctx.env
                //         .create_bigint_from_words(false, value.as_limbs().to_vec())
                //         .and_then(|value| stack.insert(value))?;
                // }

                // stack
                //     .coerce_to_object()
                //     .and_then(|stack| tracing_step.set_named_property("stack", stack))?;

                // ctx.env
                //     .create_buffer_copy(&ctx.value.memory)
                //     .and_then(|memory| {
                //         tracing_step.set_named_property("memory", memory.into_raw())
                //     })?;

                let mut contract = ctx.env.create_object()?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.contract.balance.as_limbs().to_vec())
                    .and_then(|balance| contract.set_named_property("balance", balance))?;

                let nonce = ctx.env.create_bigint_from_u64(ctx.value.contract.nonce)?;
                contract.set_named_property("nonce", nonce)?;

                ctx.env
                    .create_buffer_copy(ctx.value.contract.code_hash)
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

                let mut result = ctx.env.create_object()?;

                let gas_used = match ctx.value.result {
                    rethnet_evm::ExecutionResult::Success {
                        reason,
                        gas_used,
                        gas_refunded,
                        logs,
                        output,
                    } => {
                        ctx.env
                            .create_uint32(reason as u32)
                            .and_then(|reason| result.set_named_property("reason", reason))?;

                        ctx.env
                            .create_bigint_from_u64(gas_refunded)
                            .and_then(|gas_refunded| {
                                result.set_named_property("gasRefunded", gas_refunded)
                            })?;

                        u32::try_from(logs.len())
                            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
                            .and_then(|num_logs| ctx.env.create_array(num_logs))
                            .and_then(|mut logs_object| {
                                for log in logs {
                                    let mut log_object = ctx.env.create_object()?;

                                    ctx.env.create_buffer_copy(log.address).and_then(
                                        |address| {
                                            log_object
                                                .set_named_property("address", address.into_raw())
                                        },
                                    )?;

                                    u32::try_from(log.topics.len())
                                        .map_err(|e| {
                                            napi::Error::new(Status::GenericFailure, e.to_string())
                                        })
                                        .and_then(|num_topics| ctx.env.create_array(num_topics))
                                        .and_then(|mut topics| {
                                            for topic in log.topics {
                                                ctx.env.create_buffer_copy(topic).and_then(
                                                    |topic| topics.insert(topic.into_raw()),
                                                )?
                                            }

                                            topics.coerce_to_object()
                                        })
                                        .and_then(|topics| {
                                            log_object.set_named_property("topics", topics)
                                        })?;

                                    ctx.env.create_buffer_copy(&log.data).and_then(|data| {
                                        log_object.set_named_property("data", data.into_raw())
                                    })?;

                                    logs_object.insert(log_object)?;
                                }

                                logs_object.coerce_to_object()
                            })
                            .and_then(|logs| result.set_named_property("logs", logs))?;

                        let (output, address) = match output {
                            rethnet_evm::Output::Call(output) => (output, None),
                            rethnet_evm::Output::Create(output, address) => (output, address),
                        };

                        let mut transaction_output = ctx.env.create_object()?;

                        ctx.env
                            .create_buffer_copy(output)
                            .map(JsBufferValue::into_unknown)
                            .and_then(|output| {
                                transaction_output.set_named_property("returnValue", output)
                            })?;

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

                        result.set_named_property("output", transaction_output)?;

                        gas_used
                    }
                    rethnet_evm::ExecutionResult::Revert { gas_used, output } => {
                        ctx.env
                            .create_buffer_copy(output)
                            .map(JsBufferValue::into_unknown)
                            .and_then(|output| result.set_named_property("output", output))?;

                        gas_used
                    }
                    rethnet_evm::ExecutionResult::Halt { reason, gas_used } => {
                        let halt = ExceptionalHalt::from(reason);
                        ctx.env
                            .create_uint32(halt as u32)
                            .and_then(|reason| result.set_named_property("reason", reason))?;

                        gas_used
                    }
                };

                ctx.env
                    .create_bigint_from_u64(gas_used)
                    .and_then(|gas_used| result.set_named_property("gasUsed", gas_used))?;

                let mut execution_result = ctx.env.create_object()?;

                execution_result.set_named_property("result", result)?;

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
            pending_before: None,
        })
    }

    fn validate_before_message(&mut self) {
        if let Some(message) = self.pending_before.take() {
            let (sender, receiver) = channel();

            let status = self.before_message_fn.call(
                BeforeMessageHandlerCall { message, sender },
                ThreadsafeFunctionCallMode::Blocking,
            );
            assert_eq!(status, Status::Ok);

            receiver
                .recv()
                .unwrap()
                .expect("Failed call to BeforeMessageHandler");
        }
    }
}

impl<D> rethnet_evm::Inspector<D> for JsTracer
where
    D: rethnet_evm::Database,
    D::Error: Debug,
{
    fn call(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        inputs: &mut rethnet_evm::CallInputs,
        _is_static: bool,
    ) -> (InstructionResult, Gas, rethnet_eth::Bytes) {
        self.validate_before_message();

        let code = data
            .journaled_state
            .state
            .get(&inputs.context.code_address)
            .map(|account| {
                if let Some(code) = &account.info.code {
                    code.clone()
                } else {
                    data.db.code_by_hash(account.info.code_hash).unwrap()
                }
            })
            .unwrap_or_else(|| {
                let account = data.db.basic(inputs.context.code_address).unwrap().unwrap();
                account
                    .code
                    .unwrap_or_else(|| data.db.code_by_hash(account.code_hash).unwrap())
            });

        self.pending_before = Some(BeforeMessage {
            depth: data.journaled_state.depth,
            to: Some(inputs.context.address),
            data: inputs.input.clone(),
            value: inputs.transfer.value,
            code_address: Some(inputs.context.code_address),
            code: Some(code),
        });

        (InstructionResult::Continue, Gas::new(0), Bytes::default())
    }

    fn call_end(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _inputs: &rethnet_evm::CallInputs,
        remaining_gas: Gas,
        ret: InstructionResult,
        out: Bytes,
        _is_static: bool,
    ) -> (InstructionResult, Gas, Bytes) {
        match ret {
            return_revert!() if self.pending_before.is_some() => {
                self.pending_before = None;
                return (ret, remaining_gas, out);
            }
            _ => (),
        }

        self.validate_before_message();

        let safe_ret = if ret == InstructionResult::CallTooDeep
            || ret == InstructionResult::OutOfFund
            || ret == InstructionResult::StateChangeDuringStaticCall
        {
            InstructionResult::Revert
        } else {
            ret
        };

        let result = match safe_ret.into() {
            SuccessOrHalt::Success(reason) => rethnet_evm::ExecutionResult::Success {
                reason,
                gas_used: remaining_gas.spend(),
                gas_refunded: remaining_gas.refunded() as u64,
                logs: data.journaled_state.logs.clone(),
                output: rethnet_evm::Output::Call(out.clone()),
            },
            SuccessOrHalt::Revert => rethnet_evm::ExecutionResult::Revert {
                gas_used: remaining_gas.spend(),
                output: out.clone(),
            },
            SuccessOrHalt::Halt(reason) => rethnet_evm::ExecutionResult::Halt {
                reason,
                gas_used: remaining_gas.limit(),
            },
            SuccessOrHalt::Internal => panic!("Internal error: {:?}", safe_ret),
            SuccessOrHalt::FatalExternalError => panic!("Fatal external error"),
        };

        let (sender, receiver) = channel();

        let status = self.after_message_fn.call(
            AfterMessageHandlerCall { result, sender },
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
    ) -> (InstructionResult, Option<rethnet_eth::B160>, Gas, Bytes) {
        self.validate_before_message();

        self.pending_before = Some(BeforeMessage {
            depth: data.journaled_state.depth,
            to: None,
            data: inputs.init_code.clone(),
            value: inputs.value,
            code_address: None,
            code: None,
        });

        (
            InstructionResult::Continue,
            None,
            Gas::new(0),
            Bytes::default(),
        )
    }

    fn create_end(
        &mut self,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _inputs: &rethnet_evm::CreateInputs,
        ret: InstructionResult,
        address: Option<rethnet_eth::B160>,
        remaining_gas: Gas,
        out: Bytes,
    ) -> (InstructionResult, Option<rethnet_eth::B160>, Gas, Bytes) {
        self.validate_before_message();

        let safe_ret =
            if ret == InstructionResult::CallTooDeep || ret == InstructionResult::OutOfFund {
                InstructionResult::Revert
            } else {
                ret
            };

        let result = match safe_ret.into() {
            SuccessOrHalt::Success(reason) => rethnet_evm::ExecutionResult::Success {
                reason,
                gas_used: remaining_gas.spend(),
                gas_refunded: remaining_gas.refunded() as u64,
                logs: data.journaled_state.logs.clone(),
                output: rethnet_evm::Output::Create(out.clone(), address),
            },
            SuccessOrHalt::Revert => rethnet_evm::ExecutionResult::Revert {
                gas_used: remaining_gas.spend(),
                output: out.clone(),
            },
            SuccessOrHalt::Halt(reason) => rethnet_evm::ExecutionResult::Halt {
                reason,
                gas_used: remaining_gas.limit(),
            },
            SuccessOrHalt::Internal => panic!("Internal error: {:?}", safe_ret),
            SuccessOrHalt::FatalExternalError => panic!("Fatal external error"),
        };

        let (sender, receiver) = channel();

        let status = self.after_message_fn.call(
            AfterMessageHandlerCall { result, sender },
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
    ) -> InstructionResult {
        // Skip the step
        let skip_step = self.pending_before.as_ref().map_or(false, |message| {
            message.code.is_some() && interp.current_opcode() == opcode::STOP
        });

        self.validate_before_message();

        if !skip_step {
            // self.pre_steps.push(StepData {
            //     depth: data.journaled_state.depth,
            //     pc: interp.program_counter() as u64,
            //     opcode: interp.current_opcode(),
            //     gas: *interp.gas(),
            // });

            let (sender, receiver) = channel();

            let status = self.step_fn.call(
                StepHandlerCall {
                    depth: data.journaled_state.depth,
                    pc: interp.program_counter() as u64,
                    opcode: interp.current_opcode(),
                    // return_value: interp.instruction_result,
                    // gas_cost: post_step_gas.spend() - pre_step_gas.spend(),
                    // gas_refunded: post_step_gas.refunded() - pre_step_gas.refunded(),
                    // gas_left: interp.gas().remaining(),
                    // stack: interp.stack().data().clone(),
                    // memory: Bytes::copy_from_slice(interp.memory.data().as_slice()),
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
        }

        InstructionResult::Continue
    }

    // fn step_end(
    //     &mut self,
    //     interp: &mut rethnet_evm::Interpreter,
    //     _data: &mut rethnet_evm::EVMData<'_, D>,
    //     _is_static: bool,
    //     _eval: InstructionResult,
    // ) -> InstructionResult {
    //     // TODO: temporary fix
    //     let StepData {
    //         depth,
    //         pc,
    //         opcode,
    //         gas: pre_step_gas,
    //     } = self
    //         .pre_steps
    //         .pop()
    //         .expect("At least one pre-step should exist");

    //     let post_step_gas = interp.gas();

    //     InstructionResult::Continue
    // }
}
