use core::fmt::Debug;

use crate::{data::ProviderData, ProviderError};

pub fn handle_interval_mine_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.interval_mine()
}

pub fn handle_mine<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    number_of_blocks: Option<u64>,
    interval: Option<u64>,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    let number_of_blocks = number_of_blocks.unwrap_or(1);
    let interval = interval.unwrap_or(1);

    let mined_block_results = data.mine_and_commit_blocks(number_of_blocks, interval)?;

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_mined_block(spec_id, mined_block_results)
        .map_err(ProviderError::Logger)?;

    Ok(true)
}
