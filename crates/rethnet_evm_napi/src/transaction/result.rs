use napi::{
    bindgen_prelude::{BigInt, Buffer, Either3, ToNapiValue},
    Either,
};
use napi_derive::napi;

use crate::{log::Log, trace::Trace};

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

impl From<rethnet_evm::Eval> for SuccessReason {
    fn from(eval: rethnet_evm::Eval) -> Self {
        match eval {
            rethnet_evm::Eval::Stop => Self::Stop,
            rethnet_evm::Eval::Return => Self::Return,
            rethnet_evm::Eval::SelfDestruct => Self::SelfDestruct,
        }
    }
}

#[napi(object)]
pub struct CallOutput {
    /// Return value
    pub return_value: Buffer,
}

#[napi(object)]
pub struct CreateOutput {
    /// Return value
    pub return_value: Buffer,
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
    pub logs: Vec<Log>,
    /// The transaction output
    pub output: Either<CallOutput, CreateOutput>,
}

/// The result when the EVM terminates due to a revert.
#[napi(object)]
pub struct RevertResult {
    /// The amount of gas used
    pub gas_used: BigInt,
    /// The transaction output
    pub output: Buffer,
}

/// Indicates that the EVM has experienced an exceptional halt. This causes execution to
/// immediately end with all gas being consumed.
#[napi]
pub enum ExceptionalHalt {
    OutOfGas,
    OpcodeNotFound,
    // CallNotAllowedInsideStatic,
    InvalidFEOpcode,
    InvalidJump,
    NotActivated,
    StackUnderflow,
    StackOverflow,
    OutOfOffset,
    CreateCollision,
    OverflowPayment,
    PrecompileError,
    NonceOverflow,
    /// Create init code size exceeds limit (runtime).
    CreateContractSizeLimit,
    /// Error on created contract that begins with EF
    CreateContractStartingWithEF,
}

impl From<rethnet_evm::Halt> for ExceptionalHalt {
    fn from(halt: rethnet_evm::Halt) -> Self {
        match halt {
            rethnet_evm::Halt::OutOfGas(..) => ExceptionalHalt::OutOfGas,
            rethnet_evm::Halt::OpcodeNotFound => ExceptionalHalt::OpcodeNotFound,
            // rethnet_evm::Halt::CallNotAllowedInsideStatic => {
            //     ExceptionalHalt::CallNotAllowedInsideStatic
            // }
            rethnet_evm::Halt::InvalidFEOpcode => ExceptionalHalt::InvalidFEOpcode,
            rethnet_evm::Halt::InvalidJump => ExceptionalHalt::InvalidJump,
            rethnet_evm::Halt::NotActivated => ExceptionalHalt::NotActivated,
            rethnet_evm::Halt::StackUnderflow => ExceptionalHalt::StackUnderflow,
            rethnet_evm::Halt::StackOverflow => ExceptionalHalt::StackOverflow,
            rethnet_evm::Halt::OutOfOffset => ExceptionalHalt::OutOfOffset,
            rethnet_evm::Halt::CreateCollision => ExceptionalHalt::CreateCollision,
            rethnet_evm::Halt::OverflowPayment => ExceptionalHalt::OverflowPayment,
            rethnet_evm::Halt::PrecompileError => ExceptionalHalt::PrecompileError,
            rethnet_evm::Halt::NonceOverflow => ExceptionalHalt::NonceOverflow,
            rethnet_evm::Halt::CreateContractSizeLimit => ExceptionalHalt::CreateContractSizeLimit,
            rethnet_evm::Halt::CreateContractStartingWithEF => {
                ExceptionalHalt::CreateContractStartingWithEF
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
    /// The transaction trace
    pub trace: Trace,
}

impl From<(rethnet_evm::ExecutionResult, rethnet_evm::trace::Trace)> for ExecutionResult {
    fn from((result, trace): (rethnet_evm::ExecutionResult, rethnet_evm::trace::Trace)) -> Self {
        let result = match result {
            rethnet_evm::ExecutionResult::Success {
                reason,
                gas_used,
                gas_refunded,
                logs,
                output,
            } => {
                let logs = logs.into_iter().map(Log::from).collect();

                Either3::A(SuccessResult {
                    reason: reason.into(),
                    gas_used: BigInt::from(gas_used),
                    gas_refunded: BigInt::from(gas_refunded),
                    logs,
                    output: match output {
                        rethnet_evm::Output::Call(return_value) => Either::A(CallOutput {
                            return_value: Buffer::from(return_value.as_ref()),
                        }),
                        rethnet_evm::Output::Create(return_value, address) => {
                            Either::B(CreateOutput {
                                return_value: Buffer::from(return_value.as_ref()),
                                address: address.map(|address| Buffer::from(address.as_bytes())),
                            })
                        }
                    },
                })
            }
            rethnet_evm::ExecutionResult::Revert { gas_used, output } => Either3::B(RevertResult {
                gas_used: BigInt::from(gas_used),
                output: Buffer::from(output.as_ref()),
            }),
            rethnet_evm::ExecutionResult::Halt { reason, gas_used } => Either3::C(HaltResult {
                reason: reason.into(),
                gas_used: BigInt::from(gas_used),
            }),
        };

        Self {
            result,
            trace: trace.into(),
        }
    }
}

#[napi(object)]
pub struct TransactionResult {
    pub exec_result: ExecutionResult,
    pub state: serde_json::Value,
}

impl
    TryFrom<(
        rethnet_evm::ExecutionResult,
        rethnet_evm::State,
        rethnet_evm::trace::Trace,
    )> for TransactionResult
{
    type Error = napi::Error;

    fn try_from(
        (result, state, trace): (
            rethnet_evm::ExecutionResult,
            rethnet_evm::State,
            rethnet_evm::trace::Trace,
        ),
    ) -> std::result::Result<Self, Self::Error> {
        let exec_result = (result, trace).into();
        let state = serde_json::to_value(state)?;

        Ok(Self { exec_result, state })
    }
}
