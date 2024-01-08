use crate::{data::ProviderData, ProviderError};

pub fn handle_interval_mine_request(data: &mut ProviderData) -> Result<bool, ProviderError> {
    let mine_block_result = data.mine_and_commit_block(None)?;
    if mine_block_result.block.transactions().is_empty() {
        data.logger()
            .log_interval_mined_block(&mine_block_result, Vec::new());
    } else {
        let header = mine_block_result.block.header();

        data.logger().print_interval_mined_block_number(
            header.number,
            false,
            header.base_fee_per_gas,
        );
    }

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

    for (_idx, _result) in mined_block_results.into_iter().enumerate() {
        // TODO: https://github.com/NomicFoundation/edr/issues/259
    }

    Ok(true)
}
