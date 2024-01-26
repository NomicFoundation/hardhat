use core::fmt::Debug;

use edr_eth::U64;

use crate::{data::ProviderData, requests::methods::U64OrUsize, ProviderError};

pub fn handle_increase_time_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    increment: U64OrUsize,
) -> Result<String, ProviderError<LoggerErrorT>> {
    let new_block_time = data.increase_block_time(increment.into());

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_block_time.to_string())
}

pub fn handle_mine_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    timestamp: Option<U64OrUsize>,
) -> Result<String, ProviderError<LoggerErrorT>> {
    let timestamp: Option<u64> = timestamp.map(U64OrUsize::into);
    let mine_block_result = data.mine_and_commit_block(timestamp)?;

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_mined_block(spec_id, vec![mine_block_result])
        .map_err(ProviderError::Logger)?;

    Ok(String::from("0"))
}

pub fn handle_revert_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    snapshot_id: U64,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(data.revert_to_snapshot(snapshot_id.as_limbs()[0]))
}

pub fn handle_set_automine_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    automine: bool,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_auto_mining(automine);

    Ok(true)
}

pub fn handle_set_block_gas_limit_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    gas_limit: U64,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_block_gas_limit(gas_limit.as_limbs()[0])?;

    Ok(true)
}

pub fn handle_set_next_block_timestamp_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    timestamp: U64OrUsize,
) -> Result<String, ProviderError<LoggerErrorT>> {
    let new_timestamp = data.set_next_block_timestamp(timestamp.into())?;

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_timestamp.to_string())
}

pub fn handle_snapshot_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
) -> Result<U64, ProviderError<LoggerErrorT>> {
    let snapshot_id = data.make_snapshot();

    Ok(U64::from(snapshot_id))
}
