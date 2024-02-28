use std::{collections::BTreeMap, time::Instant};

use edr_eth::{Address, U256};
use edr_evm::{state::IrregularState, MemPool, RandomHashGenerator};

use crate::data::StateId;

pub(crate) struct Snapshot {
    pub block_number: u64,
    pub block_number_to_state_id: BTreeMap<u64, StateId>,
    pub block_time_offset_seconds: i64,
    pub coinbase: Address,
    pub irregular_state: IrregularState,
    pub mem_pool: MemPool,
    pub next_block_base_fee_per_gas: Option<U256>,
    pub next_block_timestamp: Option<u64>,
    pub parent_beacon_block_root_generator: RandomHashGenerator,
    pub prev_randao_generator: RandomHashGenerator,
    pub time: Instant,
}
