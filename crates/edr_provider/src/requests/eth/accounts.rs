use core::fmt::Debug;

use edr_eth::Address;

use crate::{data::ProviderData, ProviderError};

/// `require_canonical`: whether the server should additionally raise a JSON-RPC
/// error if the block is not in the canonical chain
pub fn handle_accounts_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<Vec<Address>, ProviderError<LoggerErrorT>> {
    Ok(data.accounts().copied().collect())
}
