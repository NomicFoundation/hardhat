use core::fmt::Debug;

use edr_eth::{Address, U256, U64};

use crate::{data::ProviderData, ProviderError};

pub fn handle_gas_price<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<U256, ProviderError<LoggerErrorT>> {
    data.gas_price()
}

pub fn handle_coinbase_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<Address, ProviderError<LoggerErrorT>> {
    Ok(data.coinbase())
}

pub fn handle_mining<LoggerErrorT: Debug>() -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(false)
}

pub fn handle_net_listening_request<LoggerErrorT: Debug>(
) -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(true)
}

pub fn handle_net_peer_count_request<LoggerErrorT: Debug>(
) -> Result<U64, ProviderError<LoggerErrorT>> {
    Ok(U64::from(0))
}

pub fn handle_net_version_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<String, ProviderError<LoggerErrorT>> {
    Ok(data.network_id())
}

pub fn handle_syncing<LoggerErrorT: Debug>() -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(false)
}
