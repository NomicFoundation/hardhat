use edr_eth::{serde::ZeroXPrefixedBytes, Address, U256};
use rpc_hardhat::config::ResetProviderConfig;

use crate::{data::ProviderData, ProviderError};

pub fn handle_reset(
    data: &mut ProviderData,
    config: Option<ResetProviderConfig>,
) -> Result<bool, ProviderError> {
    let runtime = data.runtime();
    tokio::task::block_in_place(|| runtime.block_on(data.reset(config.and_then(|c| c.forking))))?;
    Ok(true)
}

pub fn handle_set_balance(
    data: &mut ProviderData,
    address: Address,
    balance: U256,
) -> Result<bool, ProviderError> {
    data.set_balance(address, balance)?;

    Ok(true)
}

pub fn handle_set_code(
    data: &mut ProviderData,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> Result<bool, ProviderError> {
    data.set_code(address, code.into())?;

    Ok(true)
}

pub fn handle_set_nonce(
    data: &mut ProviderData,
    address: Address,
    nonce: u64,
) -> Result<bool, ProviderError> {
    data.set_nonce(address, nonce)?;

    Ok(true)
}

pub fn handle_set_storage_at(
    data: &mut ProviderData,
    address: Address,
    index: U256,
    value: U256,
) -> Result<bool, ProviderError> {
    data.set_account_storage_slot(address, index, value)?;

    Ok(true)
}
