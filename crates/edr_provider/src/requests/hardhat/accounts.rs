use core::fmt::Debug;

use edr_eth::Address;

use crate::{data::ProviderData, ProviderError};

pub fn handle_impersonate_account_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.impersonate_account(address);

    Ok(true)
}

pub fn handle_stop_impersonating_account_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(data.stop_impersonating_account(address))
}
