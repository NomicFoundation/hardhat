use std::mem;

use napi::{
    bindgen_prelude::{BigInt, Buffer, Either3, FromNapiValue, ToNapiValue},
    Either, Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

use crate::{
    log::ExecutionLog,
    trace::{TracingMessage, TracingMessageResult, TracingStep},
};

/// The possible reasons for successful termination of the EVM.
#[napi]
pub enum SuccessReason {
    /// The opcode `STOP` was called
    Stop,
    /// The opcode `RETURN` was called
    Return,
    /// The opcode `SELFDESTRUCT` was called
    SelfDestruct,
}

impl From<edr_evm::Eval> for SuccessReason {
    fn from(eval: edr_evm::Eval) -> Self {
        match eval {
            edr_evm::Eval::Stop => Self::Stop,
            edr_evm::Eval::Return => Self::Return,
            edr_evm::Eval::SelfDestruct => Self::SelfDestruct,
        }
    }
}

#[napi(object)]
pub struct CallOutput {
    /// Return value
    pub return_value: JsBuffer,
}

#[napi(object)]
pub struct CreateOutput {
    /// Return value
    pub return_value: JsBuffer,
    /// Optionally, a 160-bit address
    pub address: Option<Buffer>,
}

/// The result when the EVM terminates successfully.
#[napi(object)]
pub struct SuccessResult {
    /// The reason for termination
    pub reason: SuccessReason,
    /// The amount of gas used
    pub gas_used: BigInt,
    /// The amount of gas refunded
    pub gas_refunded: BigInt,
    /// The logs
    pub logs: Vec<ExecutionLog>,
    /// The transaction output
    pub output: Either<CallOutput, CreateOutput>,
}

/// The result when the EVM terminates due to a revert.
#[napi(object)]
pub struct RevertResult {
    /// The amount of gas used
    pub gas_used: BigInt,
    /// The transaction output
    pub output: JsBuffer,
}

/// Indicates that the EVM has experienced an exceptional halt. This causes execution to
/// immediately end with all gas being consumed.
#[napi]
pub enum ExceptionalHalt {
    OutOfGas,
    OpcodeNotFound,
    InvalidFEOpcode,
    InvalidJump,
    NotActivated,
    StackUnderflow,
    StackOverflow,
    OutOfOffset,
    CreateCollision,
    PrecompileError,
    NonceOverflow,
    /// Create init code size exceeds limit (runtime).
    CreateContractSizeLimit,
    /// Error on created contract that begins with EF
    CreateContractStartingWithEF,
    /// EIP-3860: Limit and meter initcode. Initcode size limit exceeded.
    CreateInitcodeSizeLimit,
}

impl From<edr_evm::Halt> for ExceptionalHalt {
    fn from(halt: edr_evm::Halt) -> Self {
        match halt {
            edr_evm::Halt::OutOfGas(..) => ExceptionalHalt::OutOfGas,
            edr_evm::Halt::OpcodeNotFound => ExceptionalHalt::OpcodeNotFound,
            edr_evm::Halt::InvalidFEOpcode => ExceptionalHalt::InvalidFEOpcode,
            edr_evm::Halt::InvalidJump => ExceptionalHalt::InvalidJump,
            edr_evm::Halt::NotActivated => ExceptionalHalt::NotActivated,
            edr_evm::Halt::StackUnderflow => ExceptionalHalt::StackUnderflow,
            edr_evm::Halt::StackOverflow => ExceptionalHalt::StackOverflow,
            edr_evm::Halt::OutOfOffset => ExceptionalHalt::OutOfOffset,
            edr_evm::Halt::CreateCollision => ExceptionalHalt::CreateCollision,
            edr_evm::Halt::PrecompileError => ExceptionalHalt::PrecompileError,
            edr_evm::Halt::NonceOverflow => ExceptionalHalt::NonceOverflow,
            edr_evm::Halt::CreateContractSizeLimit => ExceptionalHalt::CreateContractSizeLimit,
            edr_evm::Halt::CreateContractStartingWithEF => {
                ExceptionalHalt::CreateContractStartingWithEF
            }
            edr_evm::Halt::CreateInitcodeSizeLimit => ExceptionalHalt::CreateInitcodeSizeLimit,
            edr_evm::Halt::OverflowPayment
            | edr_evm::Halt::StateChangeDuringStaticCall
            | edr_evm::Halt::CallNotAllowedInsideStatic
            | edr_evm::Halt::OutOfFund
            | edr_evm::Halt::CallTooDeep => {
                unreachable!("Internal halts that can be only found inside Inspector: {halt:?}")
            }
        }
    }
}

/// The result when the EVM terminates due to an exceptional halt.
#[napi(object)]
pub struct HaltResult {
    /// The exceptional halt that occurred
    pub reason: ExceptionalHalt,
    /// Halting will spend all the gas and will thus be equal to the specified gas limit
    pub gas_used: BigInt,
}

/// The result of executing a transaction.
#[napi(object)]
pub struct ExecutionResult {
    /// The transaction result
    pub result: Either3<SuccessResult, RevertResult, HaltResult>,
}

impl ExecutionResult {
    pub fn new(env: &Env, result: &edr_evm::ExecutionResult) -> napi::Result<Self> {
        let result = match result {
            edr_evm::ExecutionResult::Success {
                reason,
                gas_used,
                gas_refunded,
                logs,
                output,
            } => {
                let logs = logs
                    .iter()
                    .map(|log| ExecutionLog::new(env, log))
                    .collect::<napi::Result<_>>()?;

                Either3::A(SuccessResult {
                    reason: SuccessReason::from(*reason),
                    gas_used: BigInt::from(*gas_used),
                    gas_refunded: BigInt::from(*gas_refunded),
                    logs,
                    output: match output {
                        edr_evm::Output::Call(return_value) => {
                            let return_value = return_value.clone();
                            Either::A(CallOutput {
                                return_value: unsafe {
                                    env.create_buffer_with_borrowed_data(
                                        return_value.as_ptr(),
                                        return_value.len(),
                                        return_value,
                                        |return_value: edr_eth::Bytes, _env| {
                                            mem::drop(return_value);
                                        },
                                    )
                                }
                                .map(JsBufferValue::into_raw)?,
                            })
                        }
                        edr_evm::Output::Create(return_value, address) => {
                            let return_value = return_value.clone();

                            Either::B(CreateOutput {
                                return_value: unsafe {
                                    env.create_buffer_with_borrowed_data(
                                        return_value.as_ptr(),
                                        return_value.len(),
                                        return_value,
                                        |return_value: edr_eth::Bytes, _env| {
                                            mem::drop(return_value);
                                        },
                                    )
                                }
                                .map(JsBufferValue::into_raw)?,
                                address: address.map(|address| Buffer::from(address.as_bytes())),
                            })
                        }
                    },
                })
            }
            edr_evm::ExecutionResult::Revert { gas_used, output } => {
                let output = output.clone();
                Either3::B(RevertResult {
                    gas_used: BigInt::from(*gas_used),
                    output: unsafe {
                        env.create_buffer_with_borrowed_data(
                            output.as_ptr(),
                            output.len(),
                            output,
                            |output: edr_eth::Bytes, _env| {
                                mem::drop(output);
                            },
                        )
                    }
                    .map(JsBufferValue::into_raw)?,
                })
            }
            edr_evm::ExecutionResult::Halt { reason, gas_used } => Either3::C(HaltResult {
                reason: ExceptionalHalt::from(*reason),
                gas_used: BigInt::from(*gas_used),
            }),
        };

        Ok(Self { result })
    }
}

#[napi]
pub struct TransactionResult {
    inner: edr_evm::ExecutionResult,
    state: Option<edr_evm::State>,
    trace: Option<edr_evm::trace::Trace>,
}

impl TransactionResult {
    /// Constructs a new [`TransactionResult`] instance.
    pub fn new(
        result: edr_evm::ExecutionResult,
        state: Option<edr_evm::State>,
        trace: Option<edr_evm::trace::Trace>,
    ) -> Self {
        Self {
            inner: result,
            state,
            trace,
        }
    }
}

#[napi]
impl TransactionResult {
    #[napi(getter)]
    pub fn result(&self, env: Env) -> napi::Result<ExecutionResult> {
        ExecutionResult::new(&env, &self.inner)
    }

    #[napi(getter)]
    pub fn state(&self) -> napi::Result<Option<serde_json::Value>> {
        serde_json::to_value(&self.state)
            .map(Some)
            .map_err(From::from)
    }

    #[napi(getter)]
    pub fn trace(
        &self,
        env: Env,
    ) -> napi::Result<Option<Vec<Either3<TracingMessage, TracingStep, TracingMessageResult>>>> {
        self.trace.as_ref().map_or(Ok(None), |trace| {
            trace
                .messages
                .iter()
                .map(|message| match message {
                    edr_evm::trace::TraceMessage::Before(message) => {
                        TracingMessage::new(&env, message).map(Either3::A)
                    }
                    edr_evm::trace::TraceMessage::Step(step) => {
                        Ok(Either3::B(TracingStep::new(step)))
                    }
                    edr_evm::trace::TraceMessage::After(result) => {
                        ExecutionResult::new(&env, result).map(|execution_result| {
                            Either3::C(TracingMessageResult { execution_result })
                        })
                    }
                })
                .collect::<napi::Result<_>>()
                .map(Some)
        })
    }
}
