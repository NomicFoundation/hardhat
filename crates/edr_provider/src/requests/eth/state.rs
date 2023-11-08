use edr_eth::{remote::BlockSpec, serde::ZeroXPrefixedBytes, Address, U256};

use crate::{data::ProviderData, ProviderError};

pub async fn handle_get_balance_request(
    data: &ProviderData,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    data.balance(address, block_spec.as_ref()).await
}

pub async fn handle_get_code_request(
    data: &ProviderData,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<ZeroXPrefixedBytes, ProviderError> {
    data.get_code(address, block_spec.as_ref())
        .await
        .map(ZeroXPrefixedBytes::from)
}

pub async fn handle_get_storage_at_request(
    data: &ProviderData,
    address: Address,
    index: U256,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    data.get_storage_at(address, index, block_spec.as_ref())
        .await
}
