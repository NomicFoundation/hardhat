mod forked;
mod local;
mod remote;
/// Storage data structures for a blockchain
pub mod storage;

use std::{fmt::Debug, sync::Arc};

use rethnet_eth::{block::DetailedBlock, remote::RpcClientError, B256, U256};
use revm::db::BlockHashRef;

pub use self::{
    forked::{CreationError as ForkedCreationError, ForkedBlockchain},
    local::{CreationError as LocalCreationError, LocalBlockchain},
};

/// Combinatorial error for the blockchain API.
#[derive(Debug, thiserror::Error)]
pub enum BlockchainError {
    /// Block number exceeds storage capacity (usize::MAX)
    #[error("Block number exceeds storage capacity.")]
    BlockNumberTooLarge,
    /// Invalid block number
    #[error("Invalid block number: ${actual}. Expected: ${expected}.")]
    InvalidBlockNumber {
        /// Provided block number
        actual: U256,
        /// Expected block number
        expected: U256,
    },
    /// Invalid parent hash
    #[error("Invalid parent hash: ${actual}. Expected: ${expected}.")]
    InvalidParentHash {
        /// Provided parent hash
        actual: B256,
        /// Expected parent hash
        expected: B256,
    },
    /// JSON-RPC error
    #[error(transparent)]
    JsonRpcError(#[from] RpcClientError),
    /// Block number does not exist in blockchain
    #[error("Unknown block number")]
    UnknownBlockNumber,
}

/// Trait for implementations of an Ethereum blockchain.
pub trait Blockchain {
    /// The blockchain's error type
    type Error;

    /// Retrieves the block with the provided hash, if it exists.
    fn block_by_hash(&self, hash: &B256) -> Result<Option<Arc<DetailedBlock>>, Self::Error>;

    /// Retrieves the block with the provided number, if it exists.
    fn block_by_number(&self, number: &U256) -> Result<Option<Arc<DetailedBlock>>, Self::Error>;

    /// Retrieves the block that contains a transaction with the provided hash, if it exists.
    fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, Self::Error>;

    /// Retrieves the last block in the blockchain.
    fn last_block(&self) -> Result<Arc<DetailedBlock>, Self::Error>;

    /// Retrieves the last block number in the blockchain.
    fn last_block_number(&self) -> U256;

    /// Retrieves the total difficulty at the block with the provided hash.
    fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::Error>;
}

/// Trait for implementations of a mutable Ethereum blockchain
pub trait BlockchainMut {
    /// The blockchain's error type
    type Error;

    /// Inserts the provided block into the blockchain, returning a reference to the inserted block.
    fn insert_block(&mut self, block: DetailedBlock) -> Result<Arc<DetailedBlock>, Self::Error>;
}

/// Trait that meets all requirements for a synchronous blockchain.
pub trait SyncBlockchain<E>:
    Blockchain<Error = E>
    + BlockchainMut<Error = E>
    + BlockHashRef<Error = E>
    + Send
    + Sync
    + Debug
    + 'static
where
    E: Debug + Send,
{
}

impl<B, E> SyncBlockchain<E> for B
where
    B: Blockchain<Error = E>
        + BlockchainMut<Error = E>
        + BlockHashRef<Error = E>
        + Send
        + Sync
        + Debug
        + 'static,
    E: Debug + Send,
{
}

/// Validates whether a block is a valid next block.
fn validate_next_block(
    last_block: &DetailedBlock,
    next_block: &DetailedBlock,
) -> Result<(), BlockchainError> {
    let next_block_number = last_block.header.number + U256::from(1);
    if next_block.header.number != next_block_number {
        return Err(BlockchainError::InvalidBlockNumber {
            actual: next_block.header.number,
            expected: next_block_number,
        });
    }

    if next_block.header.parent_hash != *last_block.hash() {
        return Err(BlockchainError::InvalidParentHash {
            actual: next_block.header.parent_hash,
            expected: *last_block.hash(),
        });
    }

    Ok(())
}
