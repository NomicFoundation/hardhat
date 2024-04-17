#![cfg(feature = "test-utils")]

use edr_provider::{
    hardhat_rpc_types::ForkConfig, test_utils::create_test_config_with_fork, MethodInvocation,
    NoopLogger, Provider, ProviderRequest,
};
use edr_test_utils::env::get_infura_url;
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn avalanche_chain_mine_local_block() -> anyhow::Result<()> {
    const BLOCK_NUMBER: u64 = 22_587_773;

    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});

    let config = create_test_config_with_fork(Some(ForkConfig {
        json_rpc_url: get_infura_url().replace("mainnet", "avalanche-mainnet"),
        block_number: Some(BLOCK_NUMBER),
        http_headers: None,
    }));

    let provider = Provider::new(runtime::Handle::current(), logger, subscriber, config)?;

    provider.handle_request(ProviderRequest::Single(MethodInvocation::EvmMine(None)))?;

    Ok(())
}
