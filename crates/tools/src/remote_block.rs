use edr_eth::remote::RpcClient;
use edr_provider::test_utils::run_full_block;

pub async fn replay(url: String, block_number: Option<u64>, chain_id: u64) -> anyhow::Result<()> {
    let rpc_client = RpcClient::new(&url, edr_defaults::CACHE_DIR.into(), None)?;

    let block_number = if let Some(block_number) = block_number {
        block_number
    } else {
        rpc_client
            .block_number()
            .await
            .map(|block_number| block_number - 20)?
    };

    run_full_block(url, block_number, chain_id).await
}
