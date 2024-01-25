use core::fmt::Debug;

use edr_eth::{remote::BlockSpec, Address, U256, U64};

use crate::{
    data::ProviderData, requests::validation::validate_post_merge_block_tags, ProviderError,
};

pub fn handle_block_number_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<U64, ProviderError<LoggerErrorT>> {
    Ok(U64::from(data.last_block_number()))
}

pub fn handle_chain_id_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<U64, ProviderError<LoggerErrorT>> {
    Ok(U64::from(data.chain_id()))
}

pub fn handle_get_transaction_count_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError<LoggerErrorT>> {
    if let Some(block_spec) = block_spec.as_ref() {
        validate_post_merge_block_tags(data.spec_id(), block_spec)?;
    }

    data.get_transaction_count(address, block_spec.as_ref())
        .map(U256::from)
}
