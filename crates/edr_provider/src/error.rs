use std::time::SystemTimeError;

use edr_eth::{
    remote::{filter::SubscriptionType, jsonrpc},
    Address, B256, U256,
};
use edr_evm::{
    blockchain::BlockchainError, state::StateError, MineBlockError, MinerTransactionError,
    TransactionCreationError,
};

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    /// Blockchain error
    #[error(transparent)]
    Blockchain(#[from] BlockchainError),
    /// Invalid filter subscription type
    #[error("Subscription {filter_id} is not a {expected:?} subscription, but a {actual:?} subscription")]
    InvalidFilterSubscriptionType {
        filter_id: U256,
        expected: SubscriptionType,
        actual: SubscriptionType,
    },
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
    /// The request hasn't been implemented yet
    #[error("Unimplemented: {0}")]
    Unimplemented(String),
    /// The address is not owned by this node.
    #[error("{address} is not owned by this node")]
    UnknownAddress { address: Address },
    /// Block number doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a block number
    /// and it's not found <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block number: {block_number}")]
    UnknownBlockNumber { block_number: u64 },
    /// Block hash doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a hash and it's
    /// not found <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block hash: {block_hash}")]
    UnknownBlockHash { block_hash: B256 },
}
