mod builder;

use rethnet_eth::{block::Block, receipt::TypedReceipt, Address, B256, U256};

use crate::transaction::TransactionInfo;

pub use builder::BlockBuilder;

/// Container type that gathers all block data
#[derive(Debug, Clone)]
pub struct BlockInfo {
    pub block: Block,
    pub transactions: Vec<TransactionInfo>,
    pub receipts: Vec<TypedReceipt>,
}

/// Data of a block header
pub struct HeaderData {
    /// The block number
    pub number: Option<U256>,
    /// The block's beneficiary
    pub coinbase: Option<Address>,
    /// The block's timestamp
    pub timestamp: Option<U256>,
    /// The block's difficulty
    pub difficulty: Option<U256>,
    /// The block's base gas fee
    pub basefee: Option<U256>,
    /// The block's gas limit
    pub gas_limit: Option<U256>,
    /// The parent block's hash
    pub parent_hash: Option<B256>,
    // pub uncle_hash: Option<B256>,
    // pub state_root: Option<B256>,
    // pub transactions_trie: Option<B256>,
    // pub receipt_trie: Option<B256>,
}
