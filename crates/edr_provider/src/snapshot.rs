use std::time::Instant;

use edr_eth::{Address, B256, U256};
use edr_evm::{
    state::{IrregularState, StateError, SyncState},
    MemPool,
};

pub struct Snapshot {
    pub block_number: u64,
    pub block_time_offset_seconds: u64,
    pub coinbase: Address,
    pub irregular_state: IrregularState,
    pub mem_pool: MemPool,
    pub next_block_base_fee_per_gas: Option<U256>,
    pub next_block_timestamp: Option<u64>,
    pub next_prev_randao: B256,
    pub state: Box<dyn SyncState<StateError>>,
    pub time: Instant,
}
