use edr_eth::{signature::Signature, Address, Bytes};

use crate::{data::ProviderData, ProviderError};

pub fn handle_sign_request(
    data: &ProviderData,
    address: Address,
    message: Bytes,
) -> Result<Signature, ProviderError> {
    data.sign(&address, message)
}
