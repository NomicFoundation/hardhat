mod builder;

use rethnet_eth::{block::Block, receipt::TypedReceipt, Address, H256, U256};

use crate::transaction::TransactionInfo;

pub use builder::BlockBuilder;

/// Container type that gathers all block data
#[derive(Debug, Clone)]
pub struct BlockInfo {
    pub block: Block,
    pub transactions: Vec<TransactionInfo>,
    pub receipts: Vec<TypedReceipt>,
}

pub struct HeaderData {
    pub number: Option<U256>,
    pub coinbase: Option<Address>,
    pub timestamp: Option<U256>,
    pub difficulty: Option<U256>,
    pub basefee: Option<U256>,
    pub gas_limit: Option<U256>,
    pub parent_hash: Option<H256>,
    // pub uncle_hash: Option<H256>,
    // pub state_root: Option<H256>,
    // pub transactions_trie: Option<H256>,
    // pub receipt_trie: Option<H256>,
}
