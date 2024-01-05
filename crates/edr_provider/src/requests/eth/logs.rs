use edr_eth::{remote::eth::GetLogsInput, SpecId};

use crate::{
    data::ProviderData, requests::validation::validate_post_merge_block_tags, ProviderError,
};

pub fn handle_get_logs(data: &ProviderData, input: GetLogsInput) -> Result<(), ProviderError> {
    // Hardhat integration tests expect validation in this order.
    validate_post_merge_block_tags(data.spec_id(), &input.from_block)?;
    validate_post_merge_block_tags(data.spec_id(), &input.to_block)?;

    if data.spec_id() < SpecId::MERGE {
        return Err(ProviderError::InvalidInput(
            "eth_getLogs is disabled. It only works with the Berlin hardfork or a later one."
                .into(),
        ));
    }

    // TODO implement logic
    // https://github.com/NomicFoundation/edr/issues/114
    Ok(())
}
