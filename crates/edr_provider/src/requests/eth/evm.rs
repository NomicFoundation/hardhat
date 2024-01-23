use edr_eth::U64;
use edr_evm::{blockchain::BlockchainError, MineBlockResult};

use crate::{data::ProviderData, requests::methods::U64OrUsize, ProviderError};

pub fn handle_increase_time_request(
    data: &mut ProviderData,
    increment: U64OrUsize,
) -> Result<String, ProviderError> {
    let new_block_time = data.increase_block_time(increment.into());

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_block_time.to_string())
}

pub fn handle_mine_request(
    data: &mut ProviderData,
    timestamp: Option<U64OrUsize>,
) -> Result<String, ProviderError> {
    let timestamp: Option<u64> = timestamp.map(U64OrUsize::into);
    let mine_block_result = data.mine_and_commit_block(timestamp)?;

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_mined_block(spec_id, vec![mine_block_result]);

    Ok(String::from("0"))
}

pub fn handle_revert_request(
    data: &mut ProviderData,
    snapshot_id: U64,
) -> Result<bool, ProviderError> {
    Ok(data.revert_to_snapshot(snapshot_id.as_limbs()[0]))
}

pub fn handle_set_automine_request(
    data: &mut ProviderData,
    automine: bool,
) -> Result<bool, ProviderError> {
    data.set_auto_mining(automine);

    Ok(true)
}

pub fn handle_set_block_gas_limit_request(
    data: &mut ProviderData,
    gas_limit: U64,
) -> Result<bool, ProviderError> {
    data.set_block_gas_limit(gas_limit.as_limbs()[0])?;

    Ok(true)
}

pub fn handle_set_next_block_timestamp_request(
    data: &mut ProviderData,
    timestamp: U64OrUsize,
) -> Result<String, ProviderError> {
    let new_timestamp = data.set_next_block_timestamp(timestamp.into())?;

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_timestamp.to_string())
}

pub fn handle_snapshot_request(data: &mut ProviderData) -> Result<U64, ProviderError> {
    let snapshot_id = data.make_snapshot();

    Ok(U64::from(snapshot_id))
}

fn _log_block(_mine_block_result: &MineBlockResult<BlockchainError>) -> Result<(), ProviderError> {
    Err(ProviderError::Unimplemented("log_block".to_string()))
}
