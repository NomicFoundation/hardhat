use core::fmt::Debug;
use std::num::NonZeroU64;

use edr_eth::{block::BlockOptions, U64};
use edr_evm::trace::Trace;

use crate::{
    data::ProviderData, requests::methods::U64OrUsize, time::TimeSinceEpoch, ProviderError,
};

pub fn handle_increase_time_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    increment: U64OrUsize,
) -> Result<String, ProviderError<LoggerErrorT>> {
    let new_block_time = data.increase_block_time(increment.into());

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_block_time.to_string())
}

pub fn handle_mine_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    timestamp: Option<U64OrUsize>,
) -> Result<(String, Vec<Trace>), ProviderError<LoggerErrorT>> {
    let mine_block_result = data.mine_and_commit_block(BlockOptions {
        timestamp: timestamp.map(U64OrUsize::into),
        ..BlockOptions::default()
    })?;

    let traces = mine_block_result.transaction_traces.clone();

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_mined_block(spec_id, &[mine_block_result])
        .map_err(ProviderError::Logger)?;

    let result = String::from("0");
    Ok((result, traces))
}

pub fn handle_revert_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    snapshot_id: U64,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(data.revert_to_snapshot(snapshot_id.as_limbs()[0]))
}

pub fn handle_set_automine_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    automine: bool,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_auto_mining(automine);

    Ok(true)
}

pub fn handle_set_block_gas_limit_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    gas_limit: U64,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    let gas_limit = NonZeroU64::new(gas_limit.as_limbs()[0])
        .ok_or(ProviderError::SetBlockGasLimitMustBeGreaterThanZero)?;

    data.set_block_gas_limit(gas_limit)?;

    Ok(true)
}

pub fn handle_set_next_block_timestamp_request<
    LoggerErrorT: Debug,
    TimerT: Clone + TimeSinceEpoch,
>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    timestamp: U64OrUsize,
) -> Result<String, ProviderError<LoggerErrorT>> {
    let new_timestamp = data.set_next_block_timestamp(timestamp.into())?;

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_timestamp.to_string())
}

pub fn handle_snapshot_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
) -> Result<U64, ProviderError<LoggerErrorT>> {
    let snapshot_id = data.make_snapshot();

    Ok(U64::from(snapshot_id))
}
