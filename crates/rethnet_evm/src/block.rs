mod builder;
mod local;
mod remote;

use std::fmt::Debug;

use auto_impl::auto_impl;
use rethnet_eth::{block, transaction::SignedTransaction, Address, B256};

pub use self::{
    builder::{BlockBuilder, BlockBuilderCreationError, BlockTransactionError},
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

    /// Returns the block's transactions.
    fn transactions(&self) -> &[SignedTransaction];

    /// Returns the caller addresses of the block's transactions.
    fn transaction_callers(&self) -> &[Address];
}

/// Trait that meets all requirements for a synchronous block.
pub trait SyncBlock: Block + Send + Sync + 'static {}

impl<BlockchainT> SyncBlock for BlockchainT where BlockchainT: Block + Send + Sync + 'static {}
