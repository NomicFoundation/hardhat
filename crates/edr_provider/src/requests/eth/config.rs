use edr_eth::{Address, U64};

use crate::{data::ProviderData, ProviderError};

pub fn handle_coinbase_request(data: &ProviderData) -> Result<Address, ProviderError> {
    Ok(data.coinbase())
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
