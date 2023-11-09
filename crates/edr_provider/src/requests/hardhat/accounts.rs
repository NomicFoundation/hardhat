use edr_eth::Address;

use crate::{data::ProviderData, ProviderError};

pub fn handle_impersonate_account_request(
    data: &mut ProviderData,
    address: Address,
) -> Result<bool, ProviderError> {
    data.impersonate_account(address);

    Ok(true)
}

pub fn handle_stop_impersonating_account_request(
    data: &mut ProviderData,
    address: Address,
) -> Result<bool, ProviderError> {
    Ok(data.stop_impersonating_account(address))
}
