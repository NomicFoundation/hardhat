use edr_eth::{
    remote::{eth::CallRequest, BlockSpec},
    U256,
};

use crate::{
    data::ProviderData, requests::validation::validate_transaction_and_call_request, ProviderError,
};

pub fn handle_estimate_gas(
    data: &ProviderData,
    call_request: CallRequest,
    _block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    validate_transaction_and_call_request(data.spec_id(), &call_request)?;

    // TODO implement logic
    // https://github.com/NomicFoundation/edr/issues/227
    Ok(U256::ZERO)
}
