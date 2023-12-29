use std::{
    fmt::Debug,
    sync::mpsc::{channel, Sender},
};

use edr_eth::Bytes;
use edr_evm::{
    return_revert, trace::BeforeMessage, Bytecode, CallInputs, EVMData, Gas, InstructionResult,
    SuccessOrHalt,
};
use napi::{Env, JsBufferValue, JsFunction, JsUndefined, NapiRaw, Status};
use napi_derive::napi;

use crate::{
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    trace::TracingMessage,
    transaction::result::{ExceptionalHalt, ExecutionResult},
};

#[napi(object)]
pub struct TracingCallbacks {
    #[napi(ts_type = "(message: TracingMessage, next: any) => Promise<TracingMessage>")]
    pub before_call: JsFunction,
    #[napi(ts_type = "(result: ExecutionResult, next: any) => Promise<ExecutionResult>")]
    pub after_call: JsFunction,
}

struct BeforeCallEvent {
    data: BeforeMessage,
    sender: Sender<napi::Result<BeforeMessage>>,
}

pub struct AfterCallEvent {
    pub result: edr_evm::ExecutionResult,
    pub sender: Sender<napi::Result<edr_evm::ExecutionResult>>,
}

#[derive(Clone)]
pub struct JsTracer {
    before_call_fn: ThreadsafeFunction<BeforeCallEvent>,
    after_call_fn: ThreadsafeFunction<AfterCallEvent>,
    pending_before: Option<BeforeMessage>,
}

impl JsTracer {
    /// Constructs an instance from the provided callbacks.
    pub fn new(env: &Env, callbacks: TracingCallbacks) -> napi::Result<Self> {
        let before_call_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the tracer.
            unsafe { callbacks.before_call.raw() },
            0,
            |mut ctx: ThreadSafeCallContext<BeforeCallEvent>| {
                let sender = ctx.value.sender.clone();

                // beforeCall: TracingMessage
                let mut before_call = ctx.env.create_object()?;

                // TracingMessage.caller: Buffer
                ctx.env
                    .create_buffer_copy(ctx.value.data.caller)
                    .map(JsBufferValue::into_unknown)
                    .and_then(|caller| before_call.set_named_property("caller", caller))?;

                // TracingMessage.to: Buffer | undefined
                ctx.value
                    .data
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
                    .and_then(|to| before_call.set_named_property("to", to))?;

                // TracingMessage.gasLimit: bigint
                ctx.env
                    .create_bigint_from_u64(ctx.value.data.gas_limit)
                    .and_then(|gas_limit| before_call.set_named_property("gasLimit", gas_limit))?;

                // TracingMessage.depth: number
                ctx.env
                    .create_int64(ctx.value.data.depth as i64)
                    .and_then(|depth| before_call.set_named_property("depth", depth))?;

                // TracingMessage.data: Buffer
                let data = ctx.value.data.data;

                ctx.env
                    .adjust_external_memory(data.len() as i64)
                    .expect("Failed to adjust external memory");

                // SAFETY: The data is guaranteed to be valid until finalize_callback is called.
                unsafe {
                    ctx.env.create_buffer_with_borrowed_data(
                        data.as_ptr(),
                        data.len(),
                        data,
                        |data: Bytes, mut env| {
                            env.adjust_external_memory(-(data.len() as i64))
                                .expect("Failed to adjust external memory");
                        },
                    )
                }
                .and_then(|data| before_call.set_named_property("data", data.into_raw()))?;

                // TracingMessage.value: bigint
                ctx.env
                    .create_bigint_from_words(false, ctx.value.data.value.as_limbs().to_vec())
                    .and_then(|value| before_call.set_named_property("value", value))?;

                // TracingMessage.codeAddress: Buffer | undefined
                ctx.value
                    .data
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
                        before_call.set_named_property("codeAddress", code_address)
                    })?;

                // TracingMessage.code: Buffer | undefined
                if let Some(code) = &ctx.value.data.code {
                    let code = code.original_bytes();
                    ctx.env
                        .adjust_external_memory(code.len() as i64)
                        .expect("Failed to adjust external memory");

                    // SAFETY: The code is guaranteed to be valid until finalize_callback is called.
                    unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            code.as_ptr(),
                            code.len(),
                            code,
                            |code: Bytes, mut env| {
                                env.adjust_external_memory(-(code.len() as i64))
                                    .expect("Failed to adjust external memory");
                            },
                        )
                    }
                    .map(JsBufferValue::into_unknown)
                } else {
                    ctx.env.get_undefined().map(JsUndefined::into_unknown)
                }
                .and_then(|code_address| before_call.set_named_property("code", code_address))?;

                // next: any
                let next = ctx.env.create_object()?;

                let promise = ctx.callback.call(None, &[before_call, next])?;
                let result = await_promise::<TracingMessage, BeforeMessage>(
                    ctx.env,
                    promise,
                    ctx.value.sender,
                );

                handle_error(sender, result)
            },
        )?;

        let after_call_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the tracer.
            unsafe { callbacks.after_call.raw() },
            0,
            |mut ctx: ThreadSafeCallContext<AfterCallEvent>| {
                let sender = ctx.value.sender.clone();

                // result: SuccessResult | RevertResult | HaltResult
                let mut result = ctx.env.create_object()?;

                // All variants have a `gasUsed` field, so return it to avoid code duplication
                let gas_used = match ctx.value.result {
                    edr_evm::ExecutionResult::Success {
                        reason,
                        gas_used,
                        gas_refunded,
                        logs,
                        output,
                    } => {
                        // SuccessResult.reason: SuccessReason
                        ctx.env
                            .create_uint32(reason as u32)
                            .and_then(|reason| result.set_named_property("reason", reason))?;

                        // SuccessResult.gasRefunded: bigint
                        ctx.env
                            .create_bigint_from_u64(gas_refunded)
                            .and_then(|gas_refunded| {
                                result.set_named_property("gasRefunded", gas_refunded)
                            })?;

                        // SuccessResult.logs: ExecutionLog[]
                        u32::try_from(logs.len())
                            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
                            .and_then(|num_logs| ctx.env.create_array(num_logs))
                            .and_then(|mut logs_object| {
                                for log in logs {
                                    let mut log_object = ctx.env.create_object()?;

                                    // ExecutionLog.address: Buffer
                                    ctx.env.create_buffer_copy(log.address).and_then(
                                        |address| {
                                            log_object
                                                .set_named_property("address", address.into_raw())
                                        },
                                    )?;

                                    // ExecutionLog.topics: Buffer[]
                                    u32::try_from(log.topics.len())
                                        .map_err(|e| {
                                            napi::Error::new(Status::GenericFailure, e.to_string())
                                        })
                                        .and_then(|num_topics| ctx.env.create_array(num_topics))
                                        .and_then(|mut topics| {
                                            for topic in log.topics {
                                                ctx.env.create_buffer_copy(topic).and_then(
                                                    |topic| topics.insert(topic.into_raw()),
                                                )?;
                                            }

                                            topics.coerce_to_object()
                                        })
                                        .and_then(|topics| {
                                            log_object.set_named_property("topics", topics)
                                        })?;

                                    // ExecutionLog.data: Buffer
                                    ctx.env
                                        .adjust_external_memory(log.data.len() as i64)
                                        .expect("Failed to adjust external memory");

                                    // SAFETY: The data is guaranteed to be valid until
                                    // finalize_callback is called.
                                    unsafe {
                                        ctx.env.create_buffer_with_borrowed_data(
                                            log.data.as_ptr(),
                                            log.data.len(),
                                            log.data,
                                            |data: Bytes, mut env| {
                                                env.adjust_external_memory(-(data.len() as i64))
                                                    .expect("Failed to adjust external memory");
                                            },
                                        )
                                    }
                                    .and_then(|data| {
                                        log_object.set_named_property("data", data.into_raw())
                                    })?;

                                    logs_object.insert(log_object)?;
                                }

                                logs_object.coerce_to_object()
                            })
                            .and_then(|logs| result.set_named_property("logs", logs))?;

                        let (output, address) = match output {
                            edr_evm::Output::Call(output) => (output, None),
                            edr_evm::Output::Create(output, address) => (output, address),
                        };

                        // SuccessResult.output: CallOutput | CreateOutput
                        let mut transaction_output = ctx.env.create_object()?;

                        // [CallOutput | CreateOutput].returnValue: Buffer
                        ctx.env
                            .adjust_external_memory(output.len() as i64)
                            .expect("Failed to adjust external memory");

                        // SAFETY: The output is guaranteed to be valid until finalize_callback is
                        // called.
                        unsafe {
                            ctx.env.create_buffer_with_borrowed_data(
                                output.as_ptr(),
                                output.len(),
                                output,
                                |output: Bytes, mut env| {
                                    env.adjust_external_memory(-(output.len() as i64))
                                        .expect("Failed to adjust external memory");
                                },
                            )
                        }
                        .map(JsBufferValue::into_unknown)
                        .and_then(|output| {
                            transaction_output.set_named_property("returnValue", output)
                        })?;

                        // CreateOutput.address: Buffer
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
                    edr_evm::ExecutionResult::Revert { gas_used, output } => {
                        // RevertResult.output: Buffer
                        ctx.env
                            .adjust_external_memory(output.len() as i64)
                            .expect("Failed to adjust external memory");

                        // SAFETY: The output is guaranteed to be valid until finalize_callback is
                        // called.
                        unsafe {
                            ctx.env.create_buffer_with_borrowed_data(
                                output.as_ptr(),
                                output.len(),
                                output,
                                |output: Bytes, mut env| {
                                    env.adjust_external_memory(-(output.len() as i64))
                                        .expect("Failed to adjust external memory");
                                },
                            )
                        }
                        .map(JsBufferValue::into_unknown)
                        .and_then(|output| result.set_named_property("output", output))?;

                        gas_used
                    }
                    edr_evm::ExecutionResult::Halt { reason, gas_used } => {
                        // HaltResult.reason: HaltReason
                        let halt = ExceptionalHalt::from(reason);
                        ctx.env
                            .create_uint32(halt as u32)
                            .and_then(|reason| result.set_named_property("reason", reason))?;

                        gas_used
                    }
                };

                // [SuccessResult | RevertResult | HaltResult].gasUsed: bigint
                ctx.env
                    .create_bigint_from_u64(gas_used)
                    .and_then(|gas_used| result.set_named_property("gasUsed", gas_used))?;

                // executionResult: ExecutionResult
                let mut execution_result = ctx.env.create_object()?;
                execution_result.set_named_property("result", result)?;

                // next: any
                let next = ctx.env.create_object()?;

                let promise = ctx.callback.call(None, &[execution_result, next])?;
                let result = await_promise::<ExecutionResult, edr_evm::ExecutionResult>(
                    ctx.env,
                    promise,
                    ctx.value.sender,
                );

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            before_call_fn,
            after_call_fn,
            pending_before: None,
        })
    }

    fn validate_before_message(&mut self) {
        if let Some(message) = self.pending_before.take() {
            let (sender, receiver) = channel();

            let status = self.before_call_fn.call(
                BeforeCallEvent {
                    data: message,
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
    }
}

impl Debug for JsTracer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsTracer").finish()
    }
}

impl<E> edr_evm::Inspector<E> for JsTracer
where
    E: Debug,
{
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn call(
        &mut self,
        data: &mut EVMData<'_, E>,
        inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, edr_eth::Bytes) {
        self.validate_before_message();

        // This needs to be split into two functions to avoid borrow checker issues
        #[allow(clippy::map_unwrap_or)]
        let code = data
            .journaled_state
            .state
            .get(&inputs.context.code_address)
            .cloned()
            .map(|account| {
                if let Some(code) = &account.info.code {
                    code.clone()
                } else {
                    data.db.code_by_hash(account.info.code_hash).unwrap()
                }
            })
            .unwrap_or_else(|| {
                data.db.basic(inputs.context.code_address).unwrap().map_or(
                    Bytecode::new(),
                    |account_info| {
                        account_info.code.unwrap_or_else(|| {
                            data.db.code_by_hash(account_info.code_hash).unwrap()
                        })
                    },
                )
            });

        self.pending_before = Some(BeforeMessage {
            depth: data.journaled_state.depth,
            caller: inputs.context.caller,
            to: Some(inputs.context.address),
            gas_limit: inputs.gas_limit,
            data: inputs.input.clone(),
            value: inputs.context.apparent_value,
            code_address: Some(inputs.context.code_address),
            code: Some(code),
        });

        (InstructionResult::Continue, Gas::new(0), Bytes::default())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn call_end(
        &mut self,
        data: &mut EVMData<'_, E>,
        _inputs: &CallInputs,
        remaining_gas: Gas,
        ret: InstructionResult,
        out: Bytes,
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
            SuccessOrHalt::Success(reason) => edr_evm::ExecutionResult::Success {
                reason,
                gas_used: remaining_gas.spend(),
                gas_refunded: remaining_gas.refunded() as u64,
                logs: data.journaled_state.logs.clone(),
                output: edr_evm::Output::Call(out.clone()),
            },
            SuccessOrHalt::Revert => edr_evm::ExecutionResult::Revert {
                gas_used: remaining_gas.spend(),
                output: out.clone(),
            },
            SuccessOrHalt::Halt(reason) => edr_evm::ExecutionResult::Halt {
                reason,
                gas_used: remaining_gas.limit(),
            },
            SuccessOrHalt::InternalContinue => panic!("Internal error: {safe_ret:?}"),
            SuccessOrHalt::FatalExternalError => panic!("Fatal external error"),
        };

        let (sender, receiver) = channel();

        let status = self.after_call_fn.call(
            AfterCallEvent { result, sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to BeforeMessageHandler");

        (ret, remaining_gas, out)
    }
}
