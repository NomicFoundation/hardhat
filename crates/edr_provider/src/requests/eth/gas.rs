use edr_eth::{
    remote::{eth::CallRequest, BlockSpec},
    SpecId, U256, U64,
};
use edr_evm::state::StateOverrides;

use crate::{
    data::ProviderData,
    requests::{
        eth::resolve_call_request,
        validation::{validate_call_request, validate_post_merge_block_tags},
    },
    ProviderError,
};

pub fn handle_estimate_gas(
    data: &ProviderData,
    call_request: CallRequest,
    block_spec: Option<BlockSpec>,
) -> Result<U64, ProviderError> {
    validate_call_request(data.spec_id(), &call_request, &block_spec)?;

    // Matching Hardhat behavior in defaulting to "pending" instead of "latest" for
    // estimate gas.
    let block_spec = block_spec.unwrap_or_else(BlockSpec::pending);

    let transaction = resolve_call_request(
        data,
        call_request,
        Some(&block_spec),
        &StateOverrides::default(),
    )?;

    let gas_limit = data.estimate_gas(transaction, &block_spec)?;

    Ok(U64::from(gas_limit))
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
