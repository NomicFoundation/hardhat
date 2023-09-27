mod forked;
mod local;
mod remote;
/// Storage data structures for a blockchain
pub mod storage;

use std::{fmt::Debug, sync::Arc};

use async_trait::async_trait;
use edr_eth::{
    receipt::BlockReceipt, remote::RpcClientError, spec::HardforkActivations, B256, U256,
};
use revm::{db::BlockHashRef, primitives::SpecId, DatabaseCommit};

use crate::{
    state::{StateDiff, SyncState},
    Block, LocalBlock, SyncBlock,
};

use self::storage::ReservableSparseBlockchainStorage;
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
    /// Remote blocks cannot be deleted
    #[error("Cannot delete remote block.")]
    CannotDeleteRemote,
    /// Invalid block number
    #[error("Invalid block number: {actual}. Expected: {expected}.")]
    InvalidBlockNumber {
        /// Provided block number
        actual: u64,
        /// Expected block number
        expected: u64,
    },
    /// Invalid parent hash
    #[error("Invalid parent hash: {actual}. Expected: {expected}.")]
    InvalidParentHash {
        /// Provided parent hash
        actual: B256,
        /// Expected parent hash
        expected: B256,
    },
    /// JSON-RPC error
    #[error(transparent)]
    JsonRpcError(#[from] RpcClientError),
    /// Missing hardfork activation history
    #[error("No known hardfork for execution on historical block {block_number} (relative to fork block number {fork_block_number}). The node was not configured with a hardfork activation history.")]
    MissingHardforkActivations {
        /// Block number
        block_number: u64,
        /// Fork block number
        fork_block_number: u64,
    },
    /// Missing withdrawals for post-Shanghai blockchain
    #[error("Missing withdrawals for post-Shanghai blockchain")]
    MissingWithdrawals,
    /// Block number does not exist in blockchain
    #[error("Unknown block number")]
    UnknownBlockNumber,
    /// No hardfork found for block
    #[error("Could not find a hardfork to run for block {block_number}, after having looked for one in the hardfork activation history, which was: {hardfork_activations:?}.")]
    UnknownBlockSpec {
        /// Block number
        block_number: u64,
        /// Hardfork activation history
        hardfork_activations: HardforkActivations,
    },
}

/// Trait for implementations of an Ethereum blockchain.
#[async_trait]
pub trait Blockchain {
    /// The blockchain's error type
    type BlockchainError;

    /// The state's error type
    type StateError;

    /// Retrieves the block with the provided hash, if it exists.
    async fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>;

    /// Retrieves the block with the provided number, if it exists.
    async fn block_by_number(
        &self,
        number: u64,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>;

    /// Retrieves the block that contains a transaction with the provided hash, if it exists.
    async fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>;

    /// Retrieves the instances chain ID.
    async fn chain_id(&self) -> u64;

    /// Retrieves the last block in the blockchain.
    async fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::BlockchainError>>, Self::BlockchainError>;

    /// Retrieves the last block number in the blockchain.
    async fn last_block_number(&self) -> u64;

    /// Retrieves the receipt of the transaction with the provided hash, if it exists.
    async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, Self::BlockchainError>;

    /// Retrieves the hardfork specification of the block at the provided number.
    async fn spec_at_block_number(
        &self,
        block_number: u64,
    ) -> Result<SpecId, Self::BlockchainError>;

    /// Retrieves the hardfork specification used for new blocks.
    fn spec_id(&self) -> SpecId;

    /// Retrieves the state at a given block
    async fn state_at_block_number(
        &self,
        block_number: u64,
    ) -> Result<Box<dyn SyncState<Self::StateError>>, Self::BlockchainError>;

    /// Retrieves the total difficulty at the block with the provided hash.
    async fn total_difficulty_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<U256>, Self::BlockchainError>;
}

/// Trait for implementations of a mutable Ethereum blockchain
#[async_trait]
pub trait BlockchainMut {
    /// The blockchain's error type
    type Error;

    /// Inserts the provided block into the blockchain, returning a reference to the inserted block.
    async fn insert_block(
        &mut self,
        block: LocalBlock,
        state_diff: StateDiff,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::Error>>, Self::Error>;

    /// Reserves the provided number of blocks, starting from the next block number.
    async fn reserve_blocks(&mut self, additional: u64, interval: u64) -> Result<(), Self::Error>;

    /// Reverts to the block with the provided number, deleting all later blocks.
    async fn revert_to_block(&mut self, block_number: u64) -> Result<(), Self::Error>;
}

/// Trait that meets all requirements for a synchronous blockchain.
pub trait SyncBlockchain<BlockchainErrorT, StateErrorT>:
    Blockchain<BlockchainError = BlockchainErrorT, StateError = StateErrorT>
    + BlockchainMut<Error = BlockchainErrorT>
    + BlockHashRef<Error = BlockchainErrorT>
    + Send
    + Sync
    + Debug
    + 'static
where
    BlockchainErrorT: Debug + Send,
{
}

impl<BlockchainT, BlockchainErrorT, StateErrorT> SyncBlockchain<BlockchainErrorT, StateErrorT>
    for BlockchainT
where
    BlockchainT: Blockchain<BlockchainError = BlockchainErrorT, StateError = StateErrorT>
        + BlockchainMut<Error = BlockchainErrorT>
        + BlockHashRef<Error = BlockchainErrorT>
        + Send
        + Sync
        + Debug
        + 'static,
    BlockchainErrorT: Debug + Send,
{
}

fn compute_state_at_block<BlockT: Block + Clone>(
    state: &mut dyn DatabaseCommit,
    local_storage: &ReservableSparseBlockchainStorage<BlockT>,
    block_number: u64,
) {
    let state_diffs = local_storage
        .state_diffs_until_block(block_number)
        .expect("The block is validated to exist");

    for state_diff in state_diffs {
        state.commit(state_diff.clone());
    }
}

/// Validates whether a block is a valid next block.
fn validate_next_block(
    spec_id: SpecId,
    last_block: &dyn Block<Error = BlockchainError>,
    next_block: &dyn Block<Error = BlockchainError>,
) -> Result<(), BlockchainError> {
    let last_header = last_block.header();
    let next_header = next_block.header();

    let next_block_number = last_header.number + 1;
    if next_header.number != next_block_number {
        return Err(BlockchainError::InvalidBlockNumber {
            actual: next_header.number,
            expected: next_block_number,
        });
    }

    if next_header.parent_hash != *last_block.hash() {
        return Err(BlockchainError::InvalidParentHash {
            actual: next_header.parent_hash,
            expected: *last_block.hash(),
        });
    }

    if spec_id >= SpecId::SHANGHAI && next_header.withdrawals_root.is_none() {
        return Err(BlockchainError::MissingWithdrawals);
    }

    Ok(())
}
