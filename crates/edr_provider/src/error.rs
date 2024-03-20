use core::fmt::Debug;
use std::{num::TryFromIntError, time::SystemTimeError};

use alloy_sol_types::{ContractError, SolInterface};
use edr_eth::{
    remote::{filter::SubscriptionType, jsonrpc, BlockSpec, BlockTag, RpcClientError},
    Address, Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::BlockchainError,
    hex,
    state::{AccountOverrideConversionError, StateError},
    trace::Trace,
    DebugTraceError, ExecutionResult, HaltReason, MemPoolAddTransactionError, MineBlockError,
    OutOfGasError, TransactionCreationError, TransactionError,
};
use ethers_core::types::transaction::eip712::Eip712Error;

use crate::data::CreationError;

#[derive(Debug, thiserror::Error)]
pub enum ProviderError<LoggerErrorT> {
    /// Account override conversion error.
    #[error(transparent)]
    AccountOverrideConversionError(#[from] AccountOverrideConversionError),
    /// The transaction's gas price is lower than the next block's base fee,
    /// while automatically mining.
    #[error("Transaction gasPrice ({actual}) is too low for the next block, which has a baseFeePerGas of {expected}")]
    AutoMineGasPriceTooLow { expected: U256, actual: U256 },
    /// The transaction's max fee is lower than the next block's base fee, while
    /// automatically mining.
    #[error("Transaction maxFeePerGas ({actual}) is too low for the next block, which has a baseFeePerGas of {expected}")]
    AutoMineMaxFeeTooLow { expected: U256, actual: U256 },
    /// The transaction's priority fee is lower than the minimum gas price,
    /// while automatically mining.
    #[error("Transaction gas price is {actual}, which is below the minimum of {expected}")]
    AutoMinePriorityFeeTooLow { expected: U256, actual: U256 },
    /// The transaction nonce is too high, while automatically mining.
    #[error("Nonce too high. Expected nonce to be {expected} but got {actual}. Note that transactions can't be queued when automining.")]
    AutoMineNonceTooHigh { expected: u64, actual: u64 },
    /// The transaction nonce is too high, while automatically mining.
    #[error("Nonce too low. Expected nonce to be {expected} but got {actual}. Note that transactions can't be queued when automining.")]
    AutoMineNonceTooLow { expected: u64, actual: u64 },
    /// Blockchain error
    #[error(transparent)]
    Blockchain(#[from] BlockchainError),
    #[error(transparent)]
    Creation(#[from] CreationError),
    #[error(transparent)]
    DebugTrace(#[from] DebugTraceError<BlockchainError, StateError>),
    #[error("An EIP-4844 (shard blob) transaction was received, but Hardhat doesn't have support for them yet.")]
    Eip4844TransactionUnsupported,
    #[error(transparent)]
    Eip712Error(#[from] Eip712Error),
    /// A transaction error occurred while estimating gas.
    #[error(transparent)]
    EstimateGasTransactionFailure(#[from] EstimateGasFailure),
    #[error("{0}")]
    InvalidArgument(String),
    /// Block number or hash doesn't exist in blockchain
    #[error(
        "Received invalid block tag {block_spec}. Latest block number is {latest_block_number}"
    )]
    InvalidBlockNumberOrHash {
        block_spec: BlockSpec,
        latest_block_number: u64,
    },
    /// The block tag is not allowed in pre-merge hardforks.
    /// https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1820
    #[error("The '{block_tag}' block tag is not allowed in pre-merge hardforks. You are using the '{spec:?}' hardfork.")]
    InvalidBlockTag { block_tag: BlockTag, spec: SpecId },
    /// Invalid chain ID
    #[error("Invalid chainId {actual} provided, expected ${expected} instead.")]
    InvalidChainId { expected: u64, actual: u64 },
    /// The transaction with the provided hash was already mined.
    #[error("Transaction {0} cannot be dropped because it's already mined")]
    InvalidDropTransactionHash(B256),
    /// The EIP-155 transaction was signed with another chain ID
    #[error("Trying to send an incompatible EIP-155 transaction, signed for another chain.")]
    InvalidEip155TransactionChainId,
    /// Invalid filter subscription type
    #[error("Subscription {filter_id} is not a {expected:?} subscription, but a {actual:?} subscription")]
    InvalidFilterSubscriptionType {
        filter_id: U256,
        expected: SubscriptionType,
        actual: SubscriptionType,
    },
    #[error("{0}")]
    InvalidInput(String),
    /// Transaction hash doesn't exist on the blockchain.
    #[error("Transaction hash '{0}' doesn't exist on the blockchain.")]
    InvalidTransactionHash(B256),
    /// Invalid transaction index
    #[error("Transaction index '{0}' is too large")]
    InvalidTransactionIndex(U256),
    /// Invalid transaction request
    #[error("{0}")]
    InvalidTransactionInput(String),
    #[error("Invalid transaction type {0}.")]
    InvalidTransactionType(u8),
    /// An error occurred while logging.
    #[error("Failed to log: {0:?}")]
    Logger(LoggerErrorT),
    /// An error occurred while adding a pending transaction to the mem pool.
    #[error(transparent)]
    MemPoolAddTransaction(#[from] MemPoolAddTransactionError<StateError>),
    /// An error occurred while updating the mem pool.
    #[error(transparent)]
    MemPoolUpdate(StateError),
    /// An error occurred while mining a block.
    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),
    /// Rpc client error
    #[error(transparent)]
    RpcClientError(#[from] RpcClientError),
    /// Unsupported RPC version
    #[error("unsupported JSON-RPC version: {0:?}")]
    RpcVersion(jsonrpc::Version),
    /// Error while running a transaction
    #[error(transparent)]
    RunTransaction(#[from] TransactionError<BlockchainError, StateError>),
    /// The `hardhat_setMinGasPrice` method is not supported when EIP-1559 is
    /// active.
    #[error("hardhat_setMinGasPrice is not supported when EIP-1559 is active")]
    SetMinGasPriceUnsupported,
    /// Serialization error
    #[error("Failed to serialize response: {0}")]
    Serialization(serde_json::Error),
    #[error("New nonce ({proposed}) must not be smaller than the existing nonce ({previous})")]
    SetAccountNonceLowerThanCurrent { previous: u64, proposed: u64 },
    /// Cannot set account nonce when the mem pool is not empty
    #[error("Cannot set account nonce when the transaction pool is not empty")]
    SetAccountNonceWithPendingTransactions,
    /// The `hardhat_setNextBlockBaseFeePerGas` method is not supported due to
    /// an older hardfork.
    #[error("hardhat_setNextBlockBaseFeePerGas is disabled because EIP-1559 is not active")]
    SetNextBlockBaseFeePerGasUnsupported { spec_id: SpecId },
    /// The `hardhat_setPrevRandao` method is not supported due to an older
    /// hardfork.
    #[error("hardhat_setPrevRandao is only available in post-merge hardforks, the current hardfork is {spec_id:?}")]
    SetNextPrevRandaoUnsupported { spec_id: SpecId },
    /// An error occurred while recovering a signature.
    #[error(transparent)]
    Signature(#[from] edr_eth::signature::SignatureError),
    /// State error
    #[error(transparent)]
    State(#[from] StateError),
    /// System time error
    #[error(transparent)]
    SystemTime(#[from] SystemTimeError),
    /// Timestamp lower than previous timestamp
    #[error("Timestamp {proposed} is lower than the previous block's timestamp {previous}")]
    TimestampLowerThanPrevious { proposed: u64, previous: u64 },
    /// Timestamp equals previous timestamp
    #[error("Timestamp {proposed} is equal to the previous block's timestamp. Enable the 'allowBlocksWithSameTimestamp' option to allow this")]
    TimestampEqualsPrevious { proposed: u64 },
    /// An error occurred while creating a pending transaction.
    #[error(transparent)]
    TransactionCreationError(#[from] TransactionCreationError),
    /// `eth_sendTransaction` failed and
    /// [`ProviderConfig::bail_on_call_failure`] was enabled
    #[error(transparent)]
    TransactionFailed(#[from] TransactionFailureWithTraces),
    /// Failed to convert an integer type
    #[error("Could not convert the integer argument, due to: {0}")]
    TryFromIntError(#[from] TryFromIntError),
    /// The request hasn't been implemented yet
    #[error("Unimplemented: {0}")]
    Unimplemented(String),
    /// The address is not owned by this node.
    #[error("Unknown account {address}")]
    UnknownAddress { address: Address },
    /// Minimum required hardfork not met
    #[error("Feature is only available in post-{minimum:?} hardforks, the current hardfork is {actual:?}")]
    UnmetHardfork { actual: SpecId, minimum: SpecId },
    #[error("The transaction contains an access list parameter, but this is not supported by the current hardfork: {current_hardfork:?}")]
    UnsupportedAccessListParameter {
        current_hardfork: SpecId,
        minimum_hardfork: SpecId,
    },
    #[error("The transaction contains EIP-1559 parameters, but they are not supported by the current hardfork: {current_hardfork:?}")]
    UnsupportedEIP1559Parameters {
        current_hardfork: SpecId,
        minimum_hardfork: SpecId,
    },
    #[error("{method_name} - Method not supported")]
    UnsupportedMethod { method_name: String },
}

impl<LoggerErrorT: Debug> From<ProviderError<LoggerErrorT>> for jsonrpc::Error {
    fn from(value: ProviderError<LoggerErrorT>) -> Self {
        const INVALID_INPUT: i16 = -32000;
        const INTERNAL_ERROR: i16 = -32603;
        const INVALID_PARAMS: i16 = -32602;

        #[allow(clippy::match_same_arms)]
        let code = match &value {
            ProviderError::AccountOverrideConversionError(_) => INVALID_INPUT,
            ProviderError::AutoMineGasPriceTooLow { .. } => INVALID_INPUT,
            ProviderError::AutoMineMaxFeeTooLow { .. } => INVALID_INPUT,
            ProviderError::AutoMineNonceTooHigh { .. } => INVALID_INPUT,
            ProviderError::AutoMineNonceTooLow { .. } => INVALID_INPUT,
            ProviderError::AutoMinePriorityFeeTooLow { .. } => INVALID_INPUT,
            ProviderError::Blockchain(_) => INVALID_INPUT,
            ProviderError::Creation(_) => INVALID_INPUT,
            ProviderError::DebugTrace(_) => INTERNAL_ERROR,
            ProviderError::Eip4844TransactionUnsupported => INVALID_INPUT,
            ProviderError::Eip712Error(_) => INVALID_INPUT,
            ProviderError::EstimateGasTransactionFailure(_) => INVALID_INPUT,
            ProviderError::InvalidArgument(_) => INVALID_PARAMS,
            ProviderError::InvalidBlockNumberOrHash { .. } => INVALID_INPUT,
            ProviderError::InvalidBlockTag { .. } => INVALID_PARAMS,
            ProviderError::InvalidChainId { .. } => INVALID_PARAMS,
            ProviderError::InvalidDropTransactionHash(_) => INVALID_PARAMS,
            ProviderError::InvalidEip155TransactionChainId => INVALID_PARAMS,
            ProviderError::InvalidFilterSubscriptionType { .. } => INVALID_PARAMS,
            ProviderError::InvalidInput(_) => INVALID_INPUT,
            ProviderError::InvalidTransactionHash { .. } => INVALID_PARAMS,
            ProviderError::InvalidTransactionIndex(_) => INVALID_PARAMS,
            ProviderError::InvalidTransactionInput(_) => INVALID_INPUT,
            ProviderError::InvalidTransactionType(_) => INVALID_PARAMS,
            ProviderError::Logger(_) => INTERNAL_ERROR,
            ProviderError::MemPoolAddTransaction(_) => INVALID_INPUT,
            ProviderError::MemPoolUpdate(_) => INVALID_INPUT,
            ProviderError::MineBlock(_) => INVALID_INPUT,
            ProviderError::RpcClientError(_) => INTERNAL_ERROR,
            ProviderError::RpcVersion(_) => INVALID_INPUT,
            ProviderError::RunTransaction(_) => INVALID_INPUT,
            ProviderError::Serialization(_) => INVALID_INPUT,
            ProviderError::SetAccountNonceLowerThanCurrent { .. } => INVALID_INPUT,
            ProviderError::SetAccountNonceWithPendingTransactions => INTERNAL_ERROR,
            ProviderError::SetMinGasPriceUnsupported => INVALID_INPUT,
            ProviderError::SetNextBlockBaseFeePerGasUnsupported { .. } => INVALID_INPUT,
            ProviderError::SetNextPrevRandaoUnsupported { .. } => INVALID_INPUT,
            ProviderError::Signature(_) => INVALID_INPUT,
            ProviderError::State(_) => INVALID_INPUT,
            ProviderError::SystemTime(_) => INVALID_INPUT,
            ProviderError::TimestampLowerThanPrevious { .. } => INVALID_INPUT,
            ProviderError::TimestampEqualsPrevious { .. } => INVALID_INPUT,
            ProviderError::TransactionFailed(_) => INVALID_INPUT,
            ProviderError::TransactionCreationError(_) => INVALID_INPUT,
            ProviderError::TryFromIntError(_) => INVALID_INPUT,
            ProviderError::Unimplemented(_) => INVALID_INPUT,
            ProviderError::UnknownAddress { .. } => INVALID_INPUT,
            ProviderError::UnmetHardfork { .. } => INVALID_PARAMS,
            ProviderError::UnsupportedAccessListParameter { .. } => INVALID_PARAMS,
            ProviderError::UnsupportedEIP1559Parameters { .. } => INVALID_PARAMS,
            ProviderError::UnsupportedMethod { .. } => -32004,
        };

        let data = match &value {
            ProviderError::EstimateGasTransactionFailure(EstimateGasFailure {
                transaction_failure,
                ..
            })
            | ProviderError::TransactionFailed(transaction_failure) => Some(
                serde_json::to_value(&transaction_failure.failure)
                    .expect("transaction_failure to json"),
            ),
            _ => None,
        };

        let message = match &value {
            ProviderError::TransactionFailed(inner)
                if matches!(
                    inner.failure.reason,
                    TransactionFailureReason::Inner(HaltReason::CreateContractSizeLimit)
                ) =>
            {
                "Transaction reverted: trying to deploy a contract whose code is too large".into()
            }
            _ => value.to_string(),
        };

        Self {
            code,
            message,
            data,
        }
    }
}

/// Failure that occurred while estimating gas.
#[derive(Debug, thiserror::Error)]
pub struct EstimateGasFailure {
    pub console_log_inputs: Vec<Bytes>,
    pub transaction_failure: TransactionFailureWithTraces,
}

impl std::fmt::Display for EstimateGasFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.transaction_failure)
    }
}

#[derive(Clone, Debug, thiserror::Error)]
pub struct TransactionFailureWithTraces {
    pub failure: TransactionFailure,
    pub traces: Vec<Trace>,
}

impl std::fmt::Display for TransactionFailureWithTraces {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.failure)
    }
}

/// Wrapper around [`revm_primitives::Halt`] to convert error messages to match
/// Hardhat.
#[derive(Clone, Debug, thiserror::Error, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFailure {
    pub reason: TransactionFailureReason,
    pub data: String,
    #[serde(skip)]
    pub solidity_trace: Trace,
    pub transaction_hash: Option<B256>,
}

impl TransactionFailure {
    pub fn from_execution_result(
        execution_result: &ExecutionResult,
        transaction_hash: Option<&B256>,
        solidity_trace: &Trace,
    ) -> Option<Self> {
        match execution_result {
            ExecutionResult::Success { .. } => None,
            ExecutionResult::Revert { output, .. } => Some(Self::revert(
                output.clone(),
                transaction_hash.copied(),
                solidity_trace.clone(),
            )),
            ExecutionResult::Halt { reason, .. } => Some(Self::halt(
                *reason,
                transaction_hash.copied(),
                solidity_trace.clone(),
            )),
        }
    }

    pub fn revert(output: Bytes, transaction_hash: Option<B256>, solidity_trace: Trace) -> Self {
        let data = format!("0x{}", hex::encode(output.as_ref()));
        Self {
            reason: TransactionFailureReason::Revert(output),
            data,
            solidity_trace,
            transaction_hash,
        }
    }

    pub fn halt(halt: HaltReason, tx_hash: Option<B256>, solidity_trace: Trace) -> Self {
        let reason = match halt {
            HaltReason::OpcodeNotFound | HaltReason::InvalidFEOpcode => {
                TransactionFailureReason::OpcodeNotFound
            }
            HaltReason::OutOfGas(error) => TransactionFailureReason::OutOfGas(error),
            halt => TransactionFailureReason::Inner(halt),
        };

        Self {
            reason,
            data: "0x".to_string(),
            solidity_trace,
            transaction_hash: tx_hash,
        }
    }
}

impl std::fmt::Display for TransactionFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.reason {
            TransactionFailureReason::Inner(halt) => write!(f, "{halt:?}"),
            TransactionFailureReason::OpcodeNotFound => {
                write!(
                    f,
                    "VM Exception while processing transaction: invalid opcode"
                )
            }
            TransactionFailureReason::OutOfGas(_error) => write!(f, "Transaction ran out of gas"),
            TransactionFailureReason::Revert(output) => write!(f, "{}", revert_error(output)),
        }
    }
}

#[derive(Clone, Debug, serde::Serialize)]
pub enum TransactionFailureReason {
    Inner(HaltReason),
    OpcodeNotFound,
    OutOfGas(OutOfGasError),
    Revert(Bytes),
}

fn revert_error(output: &Bytes) -> String {
    if output.is_empty() {
        return "Transaction reverted without a reason".to_string();
    }

    match alloy_sol_types::GenericContractError::abi_decode(
        output.as_ref(),
        /* validate */ false,
    ) {
        Ok(contract_error) => {
            match contract_error {
                ContractError::CustomError(custom_error) => {
                    format!("VM Exception while processing transaction: reverted with an unrecognized custom error (return data: {custom_error})")
                }
                ContractError::Revert(revert) => {
                    format!("reverted with reason string '{}'", revert.reason())
                }
                ContractError::Panic(panic) => {
                    format!(
                        "VM Exception while processing transaction: reverted with panic code {} ({})",
                        serde_json::to_string(&panic.code).unwrap().replace('\"', ""),
                        panic_code_to_error_reason(panic.code.try_into().expect("panic code fits into u64"))
                    )
                }
            }
        }
        Err(decode_error) => match decode_error {
            alloy_sol_types::Error::TypeCheckFail { .. }
            | alloy_sol_types::Error::UnknownSelector { .. } => {
                format!("VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0x{})", hex::encode(output))
            }
            _ => format!(
                "Internal: Since we are not validating, this error should not occur: {decode_error:?}"
            ),
        },
    }
}

fn panic_code_to_error_reason(error_code: u64) -> &'static str {
    match error_code {
        0x1 => "Assertion error",
        0x11 => "Arithmetic operation underflowed or overflowed outside of an unchecked block",
        0x12 => "Division or modulo division by zero",
        0x21 => "Tried to convert a value into an enum, but the value was too big or negative",
        0x22 => "Incorrectly encoded storage byte array",
        0x31 => ".pop() was called on an empty array",
        0x32 => "Array accessed at an out-of-bounds or negative index",
        0x41 => "Too much memory was allocated, or an array was created that is too large",
        0x51 => "Called a zero-initialized variable of internal function type",
        _ => "Unknown panic code",
    }
}
