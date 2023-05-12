mod builder;
mod difficulty;

use rethnet_eth::{block::Block, receipt::TypedReceipt, Address, Bloom, Bytes, B256, B64, U256};

use crate::transaction::TransactionInfo;

pub use builder::{BlockAndCallers, BlockBuilder, BlockTransactionError};

/// Container type that gathers all block data
#[derive(Debug, Clone)]
pub struct BlockInfo {
    pub block: Block,
    pub transactions: Vec<TransactionInfo>,
    pub receipts: Vec<TypedReceipt>,
}

/// Data of a block header
#[derive(Debug)]
pub struct BlockOptions {
    /// The parent block's hash
    pub parent_hash: Option<B256>,
    /// The block's beneficiary
    pub beneficiary: Option<Address>,
    /// The state's root hash
    pub state_root: Option<B256>,
    /// The receipts' root hash
    pub receipts_root: Option<B256>,
    /// The logs' bloom
    pub logs_bloom: Option<Bloom>,
    /// The block's difficulty
    pub difficulty: Option<U256>,
    /// The block's number
    pub number: Option<U256>,
    /// The block's gas limit
    pub gas_limit: Option<U256>,
    /// The block's timestamp
    pub timestamp: Option<U256>,
    /// The block's extra data
    pub extra_data: Option<Bytes>,
    /// The block's mix hash
    pub mix_hash: Option<B256>,
    /// The block's nonce
    pub nonce: Option<B64>,
    /// The block's base gas fee
    pub base_fee: Option<U256>,
}
