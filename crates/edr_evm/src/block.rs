mod builder;
mod local;
mod remote;

use std::{fmt::Debug, sync::Arc};

use auto_impl::auto_impl;
use edr_eth::{
    block, receipt::BlockReceipt, transaction::SignedTransaction, withdrawal::Withdrawal, Address,
    B256,
};

pub use self::{
    builder::{BlockBuilder, BlockBuilderCreationError, BlockTransactionError, BuildBlockResult},
    local::LocalBlock,
    remote::RemoteBlock,
};

/// Trait for implementations of an Ethereum block.
#[auto_impl(Arc)]
pub trait Block: Debug {
    /// The blockchain error type.
    type Error;

    /// Returns the block's hash.
    fn hash(&self) -> &B256;

    /// Returns the block's header.
    fn header(&self) -> &block::Header;

    /// Ommer/uncle block hashes.
    fn ommer_hashes(&self) -> &[B256];

    /// The length of the RLP encoding of this block in bytes.
    fn rlp_size(&self) -> u64;

    /// Returns the block's transactions.
    fn transactions(&self) -> &[SignedTransaction];

    /// Returns the caller addresses of the block's transactions.
    fn transaction_callers(&self) -> &[Address];

    /// Returns the receipts of the block's transactions.
    fn transaction_receipts(&self) -> Result<Vec<Arc<BlockReceipt>>, Self::Error>;

    /// Withdrawals
    fn withdrawals(&self) -> Option<&[Withdrawal]>;
}

/// Trait that meets all requirements for a synchronous block.
pub trait SyncBlock: Block + Send + Sync {}

impl<BlockT> SyncBlock for BlockT where BlockT: Block + Send + Sync {}
