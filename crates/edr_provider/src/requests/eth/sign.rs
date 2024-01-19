use edr_eth::{Address, Bytes};
use ethers_core::types::transaction::eip712::TypedData;

use crate::{data::ProviderData, ProviderError};

pub fn handle_sign_request(
    data: &ProviderData,
    message: Bytes,
    address: Address,
) -> Result<Bytes, ProviderError> {
    Ok((&data.sign(&address, message)?).into())
}

pub fn handle_sign_typed_data_v4(
    data: &ProviderData,
    address: Address,
    message: TypedData,
) -> Result<Bytes, ProviderError> {
    Ok((&data.sign_typed_data_v4(&address, &message)?).into())
}
