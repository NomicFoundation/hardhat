use edr_eth::{serde::ZeroXPrefixedBytes, Address, U256};

use crate::{data::ProviderData, ProviderError};

pub async fn handle_set_balance(
    data: &mut ProviderData,
    address: Address,
    balance: U256,
) -> Result<bool, ProviderError> {
    data.set_balance(address, balance).await?;

    Ok(true)
}

pub async fn handle_set_code(
    data: &mut ProviderData,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> Result<bool, ProviderError> {
    data.set_code(address, code.into()).await?;

    Ok(true)
}

pub async fn handle_set_nonce(
    data: &mut ProviderData,
    address: Address,
    nonce: u64,
) -> Result<bool, ProviderError> {
    data.set_nonce(address, nonce).await?;

    Ok(true)
}

pub async fn handle_set_storage_at(
    data: &mut ProviderData,
    address: Address,
    index: U256,
    value: U256,
) -> Result<bool, ProviderError> {
    data.set_account_storage_slot(address, index, value).await?;

    Ok(true)
}
