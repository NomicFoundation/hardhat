use edr_eth::{Address, Bytes};

use crate::{data::ProviderData, ProviderError};

pub fn handle_sign_request(
    data: &ProviderData,
    message: Bytes,
    address: Address,
) -> Result<Bytes, ProviderError> {
    Ok((&data.sign(&address, message)?).into())
}
