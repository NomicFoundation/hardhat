use core::fmt::Debug;
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::runtime;

use crate::{data::ProviderData, interval::IntervalMiner, OneUsizeOrTwo, ProviderError};

pub fn handle_set_interval_mining<LoggerErrorT: Debug + Send + Sync + 'static>(
    data: Arc<Mutex<ProviderData<LoggerErrorT>>>,
    interval_miner: &mut Option<IntervalMiner<LoggerErrorT>>,
    runtime: runtime::Handle,
    config: OneUsizeOrTwo,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    *interval_miner = Some(IntervalMiner::new(runtime, config.into(), data.clone()));

    Ok(true)
}
