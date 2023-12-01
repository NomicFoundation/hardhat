use std::{num::TryFromIntError, time::SystemTimeError};

use edr_eth::{
    remote::{filter::SubscriptionType, jsonrpc, BlockSpec},
    Address, Bytes, SpecId, U256,
};
use edr_evm::{
    blockchain::BlockchainError,
    state::{AccountOverrideConversionError, StateError},
    Halt, MineBlockError, MinerTransactionError, OutOfGasError, TransactionCreationError,
    TransactionError,
};

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
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
    /// Block number or hash doesn't exist in blockchain
    #[error("Block number or block hash doesn't exist: '{0}'")]
    InvalidBlockNumberOrHash(BlockSpec),
    /// The block tag is not allowed in pre-merge hardforks.
    /// https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1820
    #[error("The '{block_spec}' block tag is not allowed in pre-merge hardforks. You are using the '{spec:?}' hardfork.")]
    InvalidBlockTag { block_spec: BlockSpec, spec: SpecId },
    /// Invalid chain ID
    #[error("Invalid chainId ${actual} provided, expected ${expected} instead.")]
    InvalidChainId { expected: u64, actual: u64 },
    /// Invalid filter subscription type
    #[error("Subscription {filter_id} is not a {expected:?} subscription, but a {actual:?} subscription")]
    InvalidFilterSubscriptionType {
        filter_id: U256,
        expected: SubscriptionType,
        actual: SubscriptionType,
    },
    /// Invalid transaction index
    #[error("Transaction index '{0}' is too large")]
    InvalidTransactionIndex(U256),
    /// Invalid transaction request
    #[error("{0}")]
    InvalidTransactionInput(String),
    /// An error occurred while updating the mem pool.
    #[error(transparent)]
    MemPoolUpdate(StateError),
    /// An error occurred while mining a block.
    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),
    /// An error occurred while adding a pending transaction to the mem pool.
    #[error(transparent)]
    MinerTransactionError(#[from] MinerTransactionError<StateError>),
    /// Rlp decode error
    #[error(transparent)]
    RlpDecodeError(#[from] rlp::DecoderError),
    /// Unsupported RPC version
    #[error("unsupported JSON-RPC version: {0:?}")]
    RpcVersion(jsonrpc::Version),
    /// Error while running a transaction
    #[error(transparent)]
    RunTransaction(#[from] TransactionError<BlockchainError, StateError>),
    /// Serialization error
    #[error("Failed to serialize response: {0}")]
    Serialization(serde_json::Error),
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
    TransactionCreationError(#[from] TransactionCreationError<StateError>),
    /// `eth_sendTransaction` failed and
    /// [`ProviderConfig::bail_on_call_failure`] was enabled
    #[error(transparent)]
    TransactionFailed(#[from] TransactionFailure),
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
}

impl From<ProviderError> for jsonrpc::Error {
    fn from(value: ProviderError) -> Self {
        #[allow(clippy::match_same_arms)]
        let code = match &value {
            ProviderError::AccountOverrideConversionError(_) => -32000,
            ProviderError::AutoMineGasPriceTooLow { .. } => -32000,
            ProviderError::AutoMineMaxFeeTooLow { .. } => -32000,
            ProviderError::AutoMineNonceTooHigh { .. } => -32000,
            ProviderError::AutoMineNonceTooLow { .. } => -32000,
            ProviderError::AutoMinePriorityFeeTooLow { .. } => -32000,
            ProviderError::Blockchain(_) => -32000,
            ProviderError::InvalidBlockNumberOrHash(_) => -32000,
            ProviderError::InvalidBlockTag { .. } => -32000,
            ProviderError::InvalidChainId { .. } => -32000,
            ProviderError::InvalidFilterSubscriptionType { .. } => -32000,
            ProviderError::InvalidTransactionIndex(_) => -32000,
            ProviderError::InvalidTransactionInput(_) => -32000,
            ProviderError::MemPoolUpdate(_) => -32000,
            ProviderError::MineBlock(_) => -32000,
            ProviderError::MinerTransactionError(_) => -32000,
            ProviderError::RlpDecodeError(_) => -32000,
            ProviderError::RpcVersion(_) => -32000,
            ProviderError::RunTransaction(_) => -32000,
            ProviderError::Serialization(_) => -32000,
            ProviderError::Signature(_) => -32000,
            ProviderError::State(_) => -32000,
            ProviderError::SystemTime(_) => -32000,
            ProviderError::TimestampLowerThanPrevious { .. } => -32000,
            ProviderError::TimestampEqualsPrevious { .. } => -32000,
            ProviderError::TransactionFailed(_) => -32000,
            ProviderError::TransactionCreationError(_) => -32000,
            ProviderError::TryFromIntError(_) => -32000,
            ProviderError::Unimplemented(_) => -32000,
            ProviderError::UnknownAddress { .. } => -32000,
            ProviderError::UnmetHardfork { .. } => -32602,
        };

        Self {
            code,
            message: value.to_string(),
            data: None,
        }
    }
}

/// Wrapper around [`revm_primitives::Halt`] to convert error messages to match
/// Hardhat.
#[derive(Debug, thiserror::Error)]
pub enum TransactionFailure {
    #[error("{0:?}")]
    Inner(Halt),
    #[error("VM Exception while processing transaction: invalid opcode")]
    OpcodeNotFound,
    #[error("out of gas")]
    OutOfGas(OutOfGasError),
    #[error("{}", revert_error(.0))]
    Revert(Bytes),
}

impl TransactionFailure {
    pub fn revert(output: Bytes) -> Self {
        Self::Revert(output)
    }
}

impl From<Halt> for TransactionFailure {
    fn from(value: Halt) -> Self {
        match value {
            Halt::OpcodeNotFound => Self::OpcodeNotFound,
            Halt::OutOfGas(error) => Self::OutOfGas(error),
            halt => Self::Inner(halt),
        }
    }
}

fn revert_error(output: &Bytes) -> String {
    if output.is_empty() {
        "Transaction reverted without a reason".to_string()
    } else {
        // TODO: ABI decode reason
        format!("reverted with reason string '{output:x}'")
    }
}
