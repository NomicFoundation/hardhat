use edr_eth::remote::methods::U64OrUsize;
use edr_evm::{blockchain::BlockchainError, MineBlockResult};

use crate::{data::ProviderData, ProviderError};

pub fn handle_evm_increase_time_request(
    data: &mut ProviderData,
    increment: U64OrUsize,
) -> Result<String, ProviderError> {
    let new_block_time = data.increase_block_time(increment.into());

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_block_time.to_string())
}

pub fn handle_evm_mine_request(
    data: &mut ProviderData,
    timestamp: Option<U64OrUsize>,
) -> Result<String, ProviderError> {
    let timestamp: Option<u64> = timestamp.map(U64OrUsize::into);
    let mine_block_result = data.mine_and_commit_block(timestamp)?;

    log_block(&mine_block_result)?;

    Ok(String::from("0"))
}

pub fn handle_evm_set_next_block_timestamp(
    data: &mut ProviderData,
    timestamp: U64OrUsize,
) -> Result<String, ProviderError> {
    let new_timestamp = data.set_next_block_timestamp(timestamp.into())?;

    // This RPC call is an exception: it returns a number as a string decimal
    Ok(new_timestamp.to_string())
}

fn log_block(_mine_block_result: &MineBlockResult<BlockchainError>) -> Result<(), ProviderError> {
    Err(ProviderError::Unimplemented("log_block".to_string()))
}
