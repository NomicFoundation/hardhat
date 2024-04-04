use core::fmt::Debug;
use std::sync::Arc;

use tokio::{runtime, sync::Mutex};

use crate::{
    data::ProviderData, interval::IntervalMiner, IntervalConfig, OneUsizeOrTwo, ProviderError,
};

pub fn handle_set_interval_mining<LoggerErrorT: Debug + Send + Sync + 'static>(
    data: Arc<Mutex<ProviderData<LoggerErrorT>>>,
    interval_miner: &mut Option<IntervalMiner<LoggerErrorT>>,
    runtime: runtime::Handle,
    config: OneUsizeOrTwo,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    let config = IntervalConfig::try_from(config);

    *interval_miner = config
        .ok()
        .map(|config| IntervalMiner::new(runtime, config, data.clone()));

    Ok(true)
}
