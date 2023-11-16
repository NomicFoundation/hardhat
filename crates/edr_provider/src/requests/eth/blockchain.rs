use edr_eth::{remote::BlockSpec, Address, U256, U64};

use crate::{data::ProviderData, ProviderError};

pub fn handle_block_number_request(data: &ProviderData) -> Result<U64, ProviderError> {
    Ok(U64::from(data.block_number()))
}

pub fn handle_chain_id_request(data: &ProviderData) -> Result<U64, ProviderError> {
    Ok(U64::from(data.chain_id()))
}

pub fn handle_get_transaction_count_request(
    data: &ProviderData,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    data.get_transaction_count(address, block_spec.as_ref())
        .map(U256::from)
}
