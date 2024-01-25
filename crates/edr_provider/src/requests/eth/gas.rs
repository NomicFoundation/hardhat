use core::fmt::Debug;

use edr_eth::{
    remote::{
        eth::{CallRequest, FeeHistoryResult},
        BlockSpec,
    },
    reward_percentile::RewardPercentile,
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

pub fn handle_estimate_gas<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    call_request: CallRequest,
    block_spec: Option<BlockSpec>,
) -> Result<U64, ProviderError<LoggerErrorT>> {
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

    let result = data.estimate_gas(transaction.clone(), &block_spec);
    if let Err(ProviderError::EstimateGasTransactionFailure(failure)) = &result {
        let spec_id = data.spec_id();
        data.logger_mut()
            .log_estimate_gas_failure(spec_id, &transaction, failure)
            .map_err(ProviderError::Logger)?;
    }

    let gas_limit = result?;
    Ok(U64::from(gas_limit))
}

pub fn handle_fee_history<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    block_count: U256,
    newest_block: BlockSpec,
    reward_percentiles: Option<Vec<f64>>,
) -> Result<FeeHistoryResult, ProviderError<LoggerErrorT>> {
    if data.spec_id() < SpecId::LONDON {
        return Err(ProviderError::InvalidInput(
            "eth_feeHistory is disabled. It only works with the London hardfork or a later one."
                .into(),
        ));
    }

    let block_count: u64 = block_count
        .try_into()
        .map_err(|_err| ProviderError::InvalidInput("blockCount should be at most 1024".into()))?;
    if block_count == 0 {
        return Err(ProviderError::InvalidInput(
            "blockCount should be at least 1".into(),
        ));
    }
    if block_count > 1024 {
        return Err(ProviderError::InvalidInput(
            "blockCount should be at most 1024".into(),
        ));
    }

    validate_post_merge_block_tags(data.spec_id(), &newest_block)?;

    let reward_percentiles = reward_percentiles.map(|percentiles| {
        let mut validated_percentiles = Vec::with_capacity(percentiles.len());
        for (i, percentile) in percentiles.iter().copied().enumerate() {
            validated_percentiles.push(RewardPercentile::try_from(percentile).map_err(|_err| {
                ProviderError::InvalidInput(format!(
                    "The reward percentile number {} is invalid. It must be a float between 0 and 100, but is {} instead.",
                    i + 1,
                    percentile
                ))
            })?);
            if i > 0 {
                let prev = percentiles[i - 1];
                if prev > percentile {
                    return Err(ProviderError::InvalidInput(format!("\
The reward percentiles should be in non-decreasing order, but the percentile number {i} is greater than the next one")));
                }
            }
        }
        Ok(validated_percentiles)
    }).transpose()?;

    data.fee_history(block_count, &newest_block, reward_percentiles)
}
