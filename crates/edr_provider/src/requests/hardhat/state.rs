use core::fmt::Debug;

use edr_eth::{Address, Bytes, U256};

use crate::{data::ProviderData, requests::hardhat::rpc_types::ResetProviderConfig, ProviderError};

pub fn handle_reset<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    config: Option<ResetProviderConfig>,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.reset(config.and_then(|c| c.forking))?;
    Ok(true)
}

pub fn handle_set_balance<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    balance: U256,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_balance(address, balance)?;

    Ok(true)
}

pub fn handle_set_code<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    code: Bytes,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_code(address, code)?;

    Ok(true)
}

pub fn handle_set_nonce<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    nonce: u64,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_nonce(address, nonce)?;

    Ok(true)
}

pub fn handle_set_storage_at<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    index: U256,
    value: U256,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_account_storage_slot(address, index, value)?;

    Ok(true)
}
