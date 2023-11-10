use edr_eth::{serde::ZeroXPrefixedBytes, signature::Signature, Address};

use crate::{data::ProviderData, ProviderError};

pub fn handle_sign_request(
    data: &ProviderData,
    address: Address,
    message: ZeroXPrefixedBytes,
) -> Result<Signature, ProviderError> {
    data.sign(&address, message)
}
