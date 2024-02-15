use core::fmt::Debug;

use edr_eth::{remote::BlockSpec, utils::u256_to_padded_hex, Address, Bytes, U256};

use crate::{
    data::ProviderData, requests::validation::validate_post_merge_block_tags, ProviderError,
};

pub fn handle_get_balance_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError<LoggerErrorT>> {
    if let Some(block_spec) = block_spec.as_ref() {
        validate_post_merge_block_tags(data.spec_id(), block_spec)?;
    }

    data.balance(address, block_spec.as_ref())
}

pub fn handle_get_code_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<Bytes, ProviderError<LoggerErrorT>> {
    if let Some(block_spec) = block_spec.as_ref() {
        validate_post_merge_block_tags(data.spec_id(), block_spec)?;
    }

    data.get_code(address, block_spec.as_ref())
}

pub fn handle_get_storage_at_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    address: Address,
    index: U256,
    block_spec: Option<BlockSpec>,
) -> Result<String, ProviderError<LoggerErrorT>> {
    if let Some(block_spec) = block_spec.as_ref() {
        validate_post_merge_block_tags(data.spec_id(), block_spec)?;
    }

    let storage = data.get_storage_at(address, index, block_spec.as_ref())?;
    Ok(u256_to_padded_hex(&storage))
}
