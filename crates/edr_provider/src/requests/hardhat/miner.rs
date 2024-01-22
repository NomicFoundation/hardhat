use crate::{data::ProviderData, ProviderError};

pub fn handle_interval_mine_request(data: &mut ProviderData) -> Result<bool, ProviderError> {
    data.interval_mine()
}

pub fn handle_mine(
    data: &mut ProviderData,
    number_of_blocks: Option<u64>,
    interval: Option<u64>,
) -> Result<bool, ProviderError> {
    let number_of_blocks = number_of_blocks.unwrap_or(1);
    let interval = interval.unwrap_or(1);

    let mined_block_results = data.mine_and_commit_blocks(number_of_blocks, interval)?;

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_hardhat_mined(spec_id, mined_block_results);

    Ok(true)
}
