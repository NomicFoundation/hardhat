use std::sync::Arc;

use parking_lot::Mutex;
use tokio::runtime;

use crate::{data::ProviderData, interval::IntervalMiner, OneUsizeOrTwo, ProviderError};

pub fn handle_set_interval_mining(
    data: Arc<Mutex<ProviderData>>,
    interval_miner: &mut Option<IntervalMiner>,
    runtime: runtime::Handle,
    config: OneUsizeOrTwo,
) -> Result<bool, ProviderError> {
    *interval_miner = Some(IntervalMiner::new(runtime, config.into(), data.clone()));

    Ok(true)
}
