use edr_eth::{Address, Bytes, B256, U256};
use edr_rpc_hardhat::{
    self,
    compiler::{CompilerInput, CompilerOutput},
    config::{ForkConfig, ResetProviderConfig},
};
use edr_test_utils::help_test_method_invocation_serde;

#[test]
fn serde_hardhat_compiler() {
    // these were taken from a run of TypeScript function compileLiteral
    let compiler_input_json = include_str!("fixtures/compiler_input.json");
    let compiler_output_json = include_str!("fixtures/compiler_output.json");

    let call = edr_rpc_hardhat::Request::AddCompilationResult(
        String::from("0.8.0"),
        serde_json::from_str::<CompilerInput>(compiler_input_json).unwrap(),
        serde_json::from_str::<CompilerOutput>(compiler_output_json).unwrap(),
    );

    help_test_method_invocation_serde(call.clone());

    match call {
        edr_rpc_hardhat::Request::AddCompilationResult(_, ref input, ref output) => {
            assert_eq!(
                serde_json::to_value(input).unwrap(),
                serde_json::to_value(
                    serde_json::from_str::<CompilerInput>(compiler_input_json).unwrap()
                )
                .unwrap(),
            );
            assert_eq!(
                serde_json::to_value(output).unwrap(),
                serde_json::to_value(
                    serde_json::from_str::<CompilerOutput>(compiler_output_json).unwrap()
                )
                .unwrap(),
            );
        }
        _ => panic!("method invocation should have been AddCompilationResult"),
    }
}

#[test]
fn serde_hardhat_drop_transaction() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::DropTransaction(B256::from(
        U256::from(1),
    )));
}

#[test]
fn serde_hardhat_get_automine() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::GetAutomine(()));
}

#[test]
fn serde_hardhat_get_stack_trace_failures_count() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::GetStackTraceFailuresCount(()));
}

#[test]
fn serde_hardhat_impersonate_account() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::ImpersonateAccount(
        Address::random(),
    ));
}

#[test]
fn serde_hardhat_interval_mine() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::IntervalMine(()));
}

#[test]
fn serde_hardhat_metadata() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Metadata(()));
}

#[test]
fn serde_hardhat_mine() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Mine(Some(1), Some(1)));
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Mine(Some(1), None));
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Mine(None, Some(1)));
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Mine(None, None));

    let json = r#"{"jsonrpc":"2.0","method":"hardhat_mine","params":[],"id":2}"#;
    let deserialized: edr_rpc_hardhat::Request = serde_json::from_str(json)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
    assert_eq!(edr_rpc_hardhat::Request::Mine(None, None), deserialized);
}

#[test]
fn serde_hardhat_reset() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::Reset(Some(ResetProviderConfig {
        forking: Some(ForkConfig {
            json_rpc_url: String::from("http://whatever.com/whatever"),
            block_number: Some(123456),
            http_headers: None,
        }),
    })));
}

#[test]
fn serde_hardhat_set_balance() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetBalance(
        Address::random(),
        U256::ZERO,
    ));
}

#[test]
fn serde_hardhat_set_code() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetCode(
        Address::random(),
        Bytes::from(&b"whatever"[..]),
    ));
}

#[test]
fn serde_hardhat_set_coinbase() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetCoinbase(Address::random()));
}

#[test]
fn serde_hardhat_set_logging_enabled() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetLoggingEnabled(true));
}

#[test]
fn serde_hardhat_set_min_gas_price() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetMinGasPrice(U256::from(1)));
}

#[test]
fn serde_hardhat_set_next_block_base_fee_per_gas() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetNextBlockBaseFeePerGas(
        U256::from(1),
    ));
}

#[test]
fn serde_hardhat_set_nonce() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetNonce(Address::random(), 1u64));
}

#[test]
fn serde_hardhat_set_prev_randao() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetPrevRandao(B256::random()));
}

#[test]
fn serde_hardhat_set_storage_at() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::SetStorageAt(
        Address::random(),
        U256::ZERO,
        U256::ZERO,
    ));
}

#[test]
fn serde_hardhat_stop_impersonating_account() {
    help_test_method_invocation_serde(edr_rpc_hardhat::Request::StopImpersonatingAccount(
        Address::random(),
    ));
}
