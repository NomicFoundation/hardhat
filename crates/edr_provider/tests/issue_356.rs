#![cfg(feature = "test-utils")]

use std::str::FromStr;

use anyhow::Context;
use edr_eth::{remote::eth::CallRequest, Address, Bytes, SpecId};
use edr_provider::{
    hardhat_rpc_types::ForkConfig, test_utils::create_test_config_with_fork, time::CurrentTime,
    MethodInvocation, NoopLogger, Provider, ProviderRequest,
};
use edr_test_utils::env::get_alchemy_url;
use sha3::{Digest, Keccak256};
use tokio::runtime;

// Check that there is no panic when calling a forked blockchain where the
// hardfork is specified as Cancun, but the block number is before the Cancun
// hardfork. https://github.com/NomicFoundation/edr/issues/356
#[tokio::test(flavor = "multi_thread")]
async fn issue_324() -> anyhow::Result<()> {
    // ERC-20 contract
    const TEST_CONTRACT_ADDRESS: &str = "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0";

    let contract_address = Address::from_str(TEST_CONTRACT_ADDRESS).context("Invalid address")?;

    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});

    let mut config = create_test_config_with_fork(Some(ForkConfig {
        json_rpc_url: get_alchemy_url().replace("mainnet", "sepolia"),
        // Pre-cancun Sepolia block
        block_number: Some(4243456),
        http_headers: None,
    }));
    config.hardfork = SpecId::CANCUN;

    let provider = Provider::new(
        runtime::Handle::current(),
        logger,
        subscriber,
        config,
        CurrentTime,
    )?;

    let selector = Bytes::copy_from_slice(
        &Keccak256::new_with_prefix("decimals()")
            .finalize()
            .as_slice()[..4],
    );

    let response = provider.handle_request(ProviderRequest::Single(MethodInvocation::Call(
        CallRequest {
            to: Some(contract_address),
            data: Some(selector),
            ..CallRequest::default()
        },
        None,
        None,
    )))?;

    assert_eq!(
        response.result,
        "0x0000000000000000000000000000000000000000000000000000000000000006"
    );

    Ok(())
}
