mod builder;
mod local;
mod remote;

use std::{fmt::Debug, sync::Arc};

use auto_impl::auto_impl;
use edr_eth::{
    block, receipt::BlockReceipt, remote::eth, transaction::SignedTransaction,
    withdrawal::Withdrawal, Address, B256, U256,
};

pub use self::{
    builder::{BlockBuilder, BlockBuilderCreationError, BlockTransactionError, BuildBlockResult},
    local::LocalBlock,
    remote::{CreationError as RemoteBlockCreationError, RemoteBlock},
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

/// The result returned by requesting a block by number.
#[derive(Debug)]
pub struct BlockAndTotalDifficulty<BlockchainErrorT> {
    /// The block
    pub block: Arc<dyn SyncBlock<Error = BlockchainErrorT>>,
    /// The total difficulty with the block
    pub total_difficulty: Option<U256>,
}

impl<BlockchainErrorT> Clone for BlockAndTotalDifficulty<BlockchainErrorT> {
    fn clone(&self) -> Self {
        Self {
            block: self.block.clone(),
            total_difficulty: self.total_difficulty,
        }
    }
}

impl<BlockchainErrorT> From<BlockAndTotalDifficulty<BlockchainErrorT>> for eth::Block<B256> {
    fn from(value: BlockAndTotalDifficulty<BlockchainErrorT>) -> Self {
        let transactions = value
            .block
            .transactions()
            .iter()
            .map(|tx| *tx.hash())
            .collect();

        let header = value.block.header();
        eth::Block {
            hash: Some(*value.block.hash()),
            parent_hash: header.parent_hash,
            sha3_uncles: header.ommers_hash,
            state_root: header.state_root,
            transactions_root: header.transactions_root,
            receipts_root: header.receipts_root,
            number: Some(header.number),
            gas_used: header.gas_used,
            gas_limit: header.gas_limit,
            extra_data: header.extra_data.clone(),
            logs_bloom: header.logs_bloom,
            timestamp: header.timestamp,
            difficulty: header.difficulty,
            total_difficulty: value.total_difficulty,
            uncles: value.block.ommer_hashes().to_vec(),
            transactions,
            size: value.block.rlp_size(),
            mix_hash: Some(header.mix_hash),
            nonce: Some(header.nonce),
            base_fee_per_gas: header.base_fee_per_gas,
            miner: Some(header.beneficiary),
            withdrawals: value
                .block
                .withdrawals()
                .map(<[edr_eth::withdrawal::Withdrawal]>::to_vec),
            withdrawals_root: header.withdrawals_root,
            blob_gas_used: header.blob_gas.as_ref().map(|bg| bg.gas_used),
            excess_blob_gas: header.blob_gas.as_ref().map(|bg| bg.excess_gas),
            parent_beacon_block_root: header.parent_beacon_block_root,
        }
    }
}
