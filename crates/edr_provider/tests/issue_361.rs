use edr_eth::{
    remote::{filter::LogFilterOptions, BlockSpec},
    transaction::EthTransactionRequest,
    AccountInfo, Address, SpecId,
};
use edr_evm::KECCAK_EMPTY;
use edr_provider::{
    test_utils::{create_test_config_with_fork, one_ether},
    MethodInvocation, NoopLogger, Provider, ProviderRequest,
};
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn issue_361() -> anyhow::Result<()> {
    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});

    let mut config = create_test_config_with_fork(None);
    config.hardfork = SpecId::MUIR_GLACIER;

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

    provider.handle_request(ProviderRequest::Single(MethodInvocation::SendTransaction(
        EthTransactionRequest {
            from: impersonated_account,
            to: Some(Address::random()),
            ..EthTransactionRequest::default()
        },
    )))?;

    provider.handle_request(ProviderRequest::Single(MethodInvocation::GetLogs(
        LogFilterOptions {
            from_block: Some(BlockSpec::Number(0)),
            to_block: Some(BlockSpec::latest()),
            ..LogFilterOptions::default()
        },
    )))?;

    Ok(())
}
