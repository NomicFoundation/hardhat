use std::time::{SystemTime, SystemTimeError};

use edr_eth::{remote::RpcClientError, Address, B256, U256};
use edr_evm::{
    blockchain::{BlockchainError, ForkedCreationError, LocalCreationError},
    state::StateError,
    MineBlockError,
};

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    #[error("The initial date configuration value {0:?} is in the future")]
    InitialDateInFuture(SystemTime),
    #[error("Requested to mine too many blocks")]
    MineCountTooLarge { count: U256 },
    #[error("Subscription {filter_id} is not a logs subscription")]
    NotLogSubscription { filter_id: U256 },
    #[error(
        "The given timestamp {proposed} is lower than the previous block's timestamp {previous}."
    )]
    TimestampLowerThanPrevious { proposed: U256, previous: U256 },
    #[error("The given timestamp {proposed} is equal to the previous block's timestamp.")]
    TimestampEqualsPrevious { proposed: U256 },
    /// The address is not owned by this node.
    #[error("{address} is not owned by this node")]
    UnknownAddress { address: Address },
    /// Block hash doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a hash and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block hash: {block_hash}")]
    UnknownBlockHash { block_hash: B256 },
    /// Block number doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a block number and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block number: {block_number}")]
    UnknownBlockNumber { block_number: U256 },

    #[error(transparent)]
    Blockchain(#[from] BlockchainError),

    #[error(transparent)]
    ForkedBlockchainCreation(#[from] ForkedCreationError),

    #[error("Failed to construct forked state")]
    ForkedStateCreation(RpcClientError),

    #[error(transparent)]
    LocalBlockchainCreation(#[from] LocalCreationError),

    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),

    #[error(transparent)]
    Signature(#[from] edr_eth::signature::SignatureError),

    #[error(transparent)]
    State(#[from] StateError),

    #[error(transparent)]
    SystemTime(#[from] SystemTimeError),
}
