use std::str::FromStr;

use edr_eth::{
    remote::eth::CallRequest, transaction::EthTransactionRequest, AccountInfo, Address, SpecId,
    U256,
};
use edr_evm::KECCAK_EMPTY;
use edr_provider::{
    test_utils::{create_test_config_with_fork, one_ether},
    MethodInvocation, MiningConfig, NoopLogger, Provider, ProviderRequest,
};
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn issue_326() -> anyhow::Result<()> {
    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});

    let mut config = create_test_config_with_fork(None);
    config.hardfork = SpecId::CANCUN;
    config.mining = MiningConfig {
        auto_mine: false,
        ..MiningConfig::default()
    };
    config.initial_base_fee_per_gas = Some(U256::from_str("0x100").unwrap());

    let impersonated_account = Address::random();
    config.genesis_accounts.insert(
        impersonated_account,
        AccountInfo {
            balance: one_ether(),
            nonce: 0,
            code: None,
            code_hash: KECCAK_EMPTY,
        },
    );

    let provider = Provider::new(runtime::Handle::current(), logger, subscriber, config)?;

    provider.handle_request(ProviderRequest::Single(
        MethodInvocation::ImpersonateAccount(impersonated_account.into()),
    ))?;

    provider.handle_request(ProviderRequest::Single(MethodInvocation::Mine(None, None)))?;

    provider.handle_request(ProviderRequest::Single(MethodInvocation::SendTransaction(
        EthTransactionRequest {
            from: impersonated_account,
            to: Some(impersonated_account),
            nonce: Some(0),
            max_fee_per_gas: Some(U256::from_str("0xA").unwrap()),
            ..EthTransactionRequest::default()
        },
    )))?;

    provider.handle_request(ProviderRequest::Single(MethodInvocation::EstimateGas(
        CallRequest {
            from: Some(impersonated_account),
            to: Some(impersonated_account),
            max_fee_per_gas: Some(U256::from_str("0x200").unwrap()),
            ..CallRequest::default()
        },
        None,
    )))?;

    Ok(())
}
