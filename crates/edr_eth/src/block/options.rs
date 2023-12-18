use crate::{Address, Bloom, Bytes, B256, U256};

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
    pub number: Option<u64>,
    /// The block's gas limit
    pub gas_limit: Option<u64>,
    /// The block's timestamp
    pub timestamp: Option<u64>,
    /// The block's extra data
    pub extra_data: Option<Bytes>,
    /// The block's mix hash
    pub mix_hash: Option<B256>,
    /// The block's nonce
    pub nonce: Option<u64>,
    /// The block's base gas fee
    pub base_fee: Option<U256>,
    /// The block's withdrawals root
    pub withdrawals_root: Option<B256>,
    /// The hash tree root of the parent beacon block for the given execution
    /// block (EIP-4788).
    pub parent_beacon_block_root: Option<B256>,
}
