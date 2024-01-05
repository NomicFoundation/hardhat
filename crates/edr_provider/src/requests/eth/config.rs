use edr_eth::{Address, U256, U64};

use crate::{data::ProviderData, ProviderError};

pub fn handle_gas_price(data: &ProviderData) -> Result<U256, ProviderError> {
    data.gas_price()
}

pub fn handle_coinbase_request(data: &ProviderData) -> Result<Address, ProviderError> {
    Ok(data.coinbase())
}

pub fn handle_mining() -> Result<bool, ProviderError> {
    Ok(false)
}

pub fn handle_net_listening_request() -> Result<bool, ProviderError> {
    Ok(true)
}

pub fn handle_net_peer_count_request() -> Result<U64, ProviderError> {
    Ok(U64::from(0))
}

pub fn handle_net_version_request(data: &ProviderData) -> Result<String, ProviderError> {
    Ok(data.network_id())
}

pub fn handle_syncing() -> Result<bool, ProviderError> {
    Ok(false)
}
