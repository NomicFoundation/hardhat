use crate::{data::ProviderData, ProviderError};

pub fn handle_interval_mine_request(data: &mut ProviderData) -> Result<bool, ProviderError> {
    let mine_block_result = data.mine_and_commit_block(None)?;

    data.logger_mut().on_interval_mined(&mine_block_result);

    Ok(true)
}

pub fn handle_mine(
    data: &mut ProviderData,
    number_of_blocks: Option<u64>,
    interval: Option<u64>,
) -> Result<bool, ProviderError> {
    let number_of_blocks = number_of_blocks.unwrap_or(1);
    let interval = interval.unwrap_or(1);

    let mined_block_results = data.mine_and_commit_blocks(number_of_blocks, interval)?;

    data.logger_mut().on_hardhat_mined(mined_block_results);

    Ok(true)
}
