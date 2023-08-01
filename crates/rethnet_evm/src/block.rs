mod builder;
mod difficulty;

use rethnet_eth::{Address, Bloom, Bytes, B256, B64, U256};

pub use self::builder::{BlockBuilder, BlockBuilderCreationError, BlockTransactionError};

/// Data of a block header
#[derive(Debug, Default)]
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
