mod contiguous;
mod sparse;

use rethnet_eth::{B256, U256};

pub use self::{contiguous::ContiguousBlockchainStorage, sparse::SparseBlockchainStorage};

/// An error that occurs when trying to insert a block into storage.
#[derive(Debug, thiserror::Error)]
pub enum InsertError {
    /// Block already exists
    #[error("A block with hash {block_hash} and number {block_number} already exists.")]
    DuplicateBlock {
        /// Duplicated block hash
        block_hash: B256,
        /// Duplicated block number
        block_number: U256,
    },
    /// Transaction already exists
    #[error("A transaction with hash {hash} already exists.")]
    DuplicateTransaction {
        /// Hash of duplicated transaction
        hash: B256,
    },
}
