use std::str::FromStr;

use edr_eth::{remote::eth::CallRequest, Address, Bytes, SpecId, U256};
use edr_provider::{
    hardhat_rpc_types::ForkConfig, test_utils::create_test_config_with_fork, MethodInvocation,
    NoopLogger, Provider, ProviderRequest,
};
use edr_test_utils::env::get_alchemy_url;
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn issue_324() -> anyhow::Result<()> {
    const DAI_ADDRESS: &str = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const BLOCK_NUMBER: u64 = 19_393_592;

    let dai_address = Address::from_str(DAI_ADDRESS).unwrap();

    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});

    let mut config = create_test_config_with_fork(Some(ForkConfig {
        json_rpc_url: get_alchemy_url(),
        block_number: Some(BLOCK_NUMBER),
        http_headers: None,
    }));
    config.hardfork = SpecId::SHANGHAI;

    let provider = Provider::new(runtime::Handle::current(), logger, subscriber, config)?;

    let value = provider.handle_request(ProviderRequest::Single(MethodInvocation::Call(
        CallRequest {
            to: Some(dai_address),
            data: Some(Bytes::from_str("0x18160ddd").unwrap()),
            ..CallRequest::default()
        },
        None,
        None,
    )))?;

    assert_eq!(
        value.result,
        "0x00000000000000000000000000000000000000000a440205cfd85c12bc405f74"
    );

    let index = U256::from(1u64);
    provider.handle_request(ProviderRequest::Single(MethodInvocation::SetStorageAt(
        dai_address,
        index,
        U256::ZERO,
    )))?;

    let value = provider.handle_request(ProviderRequest::Single(
        MethodInvocation::GetStorageAt(dai_address, index, None),
    ))?;

    assert_eq!(
        value.result,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    );

    let expected = "0x0000000000000000000000000000000000000000000000000000000012345678";
    provider.handle_request(ProviderRequest::Single(MethodInvocation::SetStorageAt(
        dai_address,
        index,
        U256::from_str(expected).unwrap(),
    )))?;

    let value = provider.handle_request(ProviderRequest::Single(
        MethodInvocation::GetStorageAt(dai_address, index, None),
    ))?;

    assert_eq!(value.result, expected);

    Ok(())
}
