use std::{num::TryFromIntError, time::SystemTimeError};

use edr_eth::{
    remote::{filter::SubscriptionType, jsonrpc, BlockSpec},
    Address, SpecId, U256,
};
use edr_evm::{
    blockchain::BlockchainError,
    state::{AccountOverrideConversionError, StateError},
    MineBlockError, MinerTransactionError, TransactionCreationError, TransactionError,
};

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    /// Account override conversion error.
    #[error(transparent)]
    AccountOverrideConversionError(#[from] AccountOverrideConversionError),
    /// The transaction gas price is too low, while automatically mining.
    #[error("Transaction gas price is 0x{actual:x}, which is below the minimum of 0x{expected:x}")]
    AutoMineGasPriceTooLow { expected: U256, actual: U256 },
    /// The transaction nonce is too high, while automatically mining.
    #[error("Nonce too high. Expected nonce to be 0x{expected:x}, but got 0x{actual:x}. Note that transactions can't be queued when automining.")]
    AutoMineNonceTooHigh { expected: u64, actual: u64 },
    /// Blockchain error
    #[error(transparent)]
    Blockchain(#[from] BlockchainError),
    /// Block number or hash doesn't exist in blockchain
    #[error("Block number or block hash doesn't exist: '{0}'")]
    InvalidBlockNumberOrHash(BlockSpec),
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
    #[error("Could not convert transaction request into a typed request")]
    InvalidTransactionRequest,
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
    /// Failed to convert an integer type
    #[error("Could not convert the integer argument, due to: {0}")]
    TryFromIntError(#[from] TryFromIntError),
    /// The request hasn't been implemented yet
    #[error("Unimplemented: {0}")]
    Unimplemented(String),
    /// The address is not owned by this node.
    #[error("{address} is not owned by this node")]
    UnknownAddress { address: Address },
    /// Minimum required hardfork not met
    #[error("Feature is only available in post-{minimum:?} hardforks, the current hardfork is {actual:?}")]
    UnmetHardfork { actual: SpecId, minimum: SpecId },
}
