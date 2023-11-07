use crate::{data::ProviderData, ProviderError};

pub async fn handle_interval_mine_request(data: &mut ProviderData) -> Result<bool, ProviderError> {
    let mine_block_result = data.mine_and_commit_block(None).await?;
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
