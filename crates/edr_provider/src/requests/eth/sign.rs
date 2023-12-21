use edr_eth::{serde::ZeroXPrefixedBytes, Address};

use crate::{data::ProviderData, ProviderError};

pub fn handle_sign_request(
    data: &ProviderData,
    message: ZeroXPrefixedBytes,
    address: Address,
) -> Result<ZeroXPrefixedBytes, ProviderError> {
    Ok((&data.sign(&address, message)?).into())
}
