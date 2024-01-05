use edr_eth::{
    remote::{eth::CallRequest, BlockSpec},
    SpecId, U256,
};

use crate::{
    data::ProviderData,
    requests::validation::{validate_call_request, validate_post_merge_block_tags},
    ProviderError,
};

pub fn handle_estimate_gas(
    data: &ProviderData,
    call_request: CallRequest,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    validate_call_request(data.spec_id(), &call_request, &block_spec)?;

    // TODO implement logic
    // https://github.com/NomicFoundation/edr/issues/227
    Ok(U256::ZERO)
}

pub fn handle_fee_history(
    data: &ProviderData,
    _block_count: U256,
    block_spec: BlockSpec,
    _reward_percentiles: Option<Vec<f64>>,
) -> Result<(), ProviderError> {
    if data.spec_id() < SpecId::LONDON {
        return Err(ProviderError::InvalidInput(
            "eth_feeHistory is disabled. It only works with the London hardfork or a later one."
                .into(),
        ));
    }

    validate_post_merge_block_tags(data.spec_id(), &block_spec)?;

    // TODO implement logic
    // https://github.com/NomicFoundation/edr/issues/228
    Ok(())
}
