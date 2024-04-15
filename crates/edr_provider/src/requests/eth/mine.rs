use core::fmt::Debug;
use std::sync::Arc;

use tokio::{runtime, sync::Mutex};

use crate::{
    data::ProviderData, interval::IntervalMiner, requests, time::TimeSinceEpoch, IntervalConfig,
    ProviderError,
};

pub fn handle_set_interval_mining<
    LoggerErrorT: Debug + Send + Sync + 'static,
    TimerT: Clone + TimeSinceEpoch,
>(
    data: Arc<Mutex<ProviderData<LoggerErrorT, TimerT>>>,
    interval_miner: &mut Option<IntervalMiner<LoggerErrorT>>,
    runtime: runtime::Handle,
    config: requests::IntervalConfig,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    let config: Option<IntervalConfig> = config.try_into()?;
    *interval_miner = config.map(|config| IntervalMiner::new(runtime, config, data.clone()));

    Ok(true)
}
