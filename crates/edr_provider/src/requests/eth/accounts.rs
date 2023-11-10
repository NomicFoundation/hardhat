use edr_eth::Address;

use crate::{data::ProviderData, ProviderError};

/// `require_canonical`: whether the server should additionally raise a JSON-RPC
/// error if the block is not in the canonical chain
pub fn handle_accounts_request(data: &ProviderData) -> Result<Vec<Address>, ProviderError> {
    Ok(data.accounts().copied().collect())
}
