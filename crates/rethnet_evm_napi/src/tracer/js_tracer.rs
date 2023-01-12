use std::sync::mpsc::{channel, Sender};

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    noop_finalize, Env, JsFunction, NapiRaw, Status,
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
    pub depth: BigInt,
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
    pub depth: u64,
    pub to: Option<Address>,
    pub data: Bytes,
    pub value: U256,
    pub code_address: Option<Address>,
    pub sender: Sender<napi::Result<()>>,
}

pub struct StepHandlerCall {
    /// Call depth
    pub depth: u64,
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
pub struct JsTracer {
    before_message_fn: ThreadsafeFunction<BeforeMessageHandlerCall>,
    step_fn: ThreadsafeFunction<StepHandlerCall>,
    after_message_fn: ThreadsafeFunction<AfterMessageHandlerCall>,
    pre_step_gas: Option<Gas>,
}

impl JsTracer {
    /// Constructs a `JsTracer` from `TracingCallbacks`.
    pub fn new(env: &Env, callbacks: TracingCallbacks) -> napi::Result<Self> {
        let before_message_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.after_message.raw() },
            0,
            |ctx: ThreadSafeCallContext<BeforeMessageHandlerCall>| {
                let sender = ctx.value.sender.clone();

                let mut tracing_message = ctx.env.create_object()?;

                let depth = ctx.env.create_bigint_from_u64(ctx.value.depth)?;
                tracing_message.set_named_property("depth", depth)?;

                let to = if let Some(to) = ctx.value.to.as_ref() {
                    let to = unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            to.as_ptr(),
                            to.len(),
                            (),
                            noop_finalize,
                        )
                    }?;
                    to.into_unknown()
                } else {
                    ctx.env.get_null()?.into_unknown()
                };
                tracing_message.set_named_property("to", to)?;

                let data = &ctx.value.data;
                let data = unsafe {
                    ctx.env.create_buffer_with_borrowed_data(
                        data.as_ptr(),
                        data.len(),
                        (),
                        noop_finalize,
                    )
                }?;
                tracing_message.set_named_property("data", data.into_raw())?;

                let value = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.value.as_limbs().to_vec())?;
                tracing_message.set_named_property("value", value)?;

                let code_address = if let Some(address) = ctx.value.code_address.as_ref() {
                    let to = unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            address.as_ptr(),
                            address.len(),
                            (),
                            noop_finalize,
                        )
                    }?;
                    to.into_unknown()
                } else {
                    ctx.env.get_null()?.into_unknown()
                };
                tracing_message.set_named_property("codeAddress", code_address)?;

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
                    .create_bigint_from_u64(ctx.value.depth)
                    .and_then(|depth| tracing_step.set_named_property("depth", depth))?;

                ctx.env
                    .create_bigint_from_u64(ctx.value.pc)
                    .and_then(|pc| tracing_step.set_named_property("pc", pc))?;

                ctx.env
                    .create_string(OPCODE_JUMPMAP[usize::from(ctx.value.opcode)].unwrap())
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

                let memory = &ctx.value.memory;
                unsafe {
                    ctx.env.create_buffer_with_borrowed_data(
                        memory.as_ptr(),
                        memory.len(),
                        (),
                        noop_finalize,
                    )
                }
                .and_then(|memory| tracing_step.set_named_property("memory", memory.into_raw()))?;

                let mut contract = ctx.env.create_object()?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.contract.balance.as_limbs().to_vec())
                    .and_then(|balance| contract.set_named_property("balance", balance))?;

                let nonce = ctx.env.create_bigint_from_u64(ctx.value.contract.nonce)?;
                contract.set_named_property("nonce", nonce)?;

                let code_hash = &ctx.value.memory;
                unsafe {
                    ctx.env.create_buffer_with_borrowed_data(
                        code_hash.as_ptr(),
                        code_hash.len(),
                        (),
                        noop_finalize,
                    )
                }
                .and_then(|code_hash| {
                    contract.set_named_property("codeHash", code_hash.into_unknown())
                })?;

                ctx.value
                    .contract
                    .code
                    .as_ref()
                    .map_or_else(
                        || ctx.env.get_null().map(|null| null.into_unknown()),
                        |code| {
                            unsafe {
                                ctx.env.create_buffer_with_borrowed_data(
                                    code.bytes().as_ptr(),
                                    code.len(),
                                    (),
                                    noop_finalize,
                                )
                            }
                            .map(|code| code.into_unknown())
                        },
                    )
                    .and_then(|code| contract.set_named_property("code", code))?;

                tracing_step.set_named_property("contract", contract)?;

                let contract_address = &ctx.value.contract_address;
                unsafe {
                    ctx.env.create_buffer_with_borrowed_data(
                        contract_address.as_ptr(),
                        contract_address.len(),
                        (),
                        noop_finalize,
                    )
                }
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

                let output = if let Some(output) = output {
                    unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            output.as_ptr(),
                            output.len(),
                            (),
                            noop_finalize,
                        )
                    }?
                    .into_unknown()
                } else {
                    ctx.env.get_null()?.into_unknown()
                };
                transaction_output.set_named_property("output", output)?;

                let address = if let Some(address) = address {
                    unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            address.as_ptr(),
                            address.len(),
                            (),
                            noop_finalize,
                        )
                    }?
                    .into_unknown()
                } else {
                    ctx.env.get_null()?.into_unknown()
                };
                transaction_output.set_named_property("address", address)?;

                execution_result.set_named_property("output", transaction_output)?;

                let gas_used = ctx.env.create_bigint_from_u64(ctx.value.result.gas_used)?;
                execution_result.set_named_property("gasUsed", gas_used)?;

                let gas_refunded = ctx
                    .env
                    .create_bigint_from_u64(ctx.value.result.gas_refunded)?;
                execution_result.set_named_property("gasRefunded", gas_refunded)?;

                let logs = ctx.env.create_empty_array()?;
                execution_result.set_named_property("logs", logs)?;

                let trace = ctx.env.create_object()?;
                execution_result.set_named_property("trace", trace)?;

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
            pre_step_gas: None,
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
                depth: data.journaled_state.depth(),
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
        _data: &mut rethnet_evm::EVMData<'_, D>,
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
                    gas_used: remaining_gas.spend(),
                    gas_refunded: remaining_gas.refunded() as u64,
                    logs: Vec::new(),
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
                depth: data.journaled_state.depth(),
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
        _data: &mut rethnet_evm::EVMData<'_, D>,
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
                    gas_used: remaining_gas.spend(),
                    gas_refunded: remaining_gas.refunded() as u64,
                    logs: Vec::new(),
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
        _data: &mut rethnet_evm::EVMData<'_, D>,
        _is_static: bool,
    ) -> Return {
        self.pre_step_gas = Some(*interp.gas());

        Return::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut rethnet_evm::Interpreter,
        data: &mut rethnet_evm::EVMData<'_, D>,
        _is_static: bool,
        _eval: Return,
    ) -> Return {
        let pre_step_gas = self.pre_step_gas.take().expect("Gas must exist");
        let post_step_gas = interp.gas();

        let (sender, receiver) = channel();

        let status = self.step_fn.call(
            StepHandlerCall {
                depth: data.journaled_state.depth(),
                pc: interp.program_counter() as u64,
                opcode: interp.current_opcode(),
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
