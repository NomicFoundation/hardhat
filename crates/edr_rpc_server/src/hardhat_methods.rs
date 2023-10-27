use edr_eth::{
    serde::{sequence_to_single, single_to_sequence, ZeroXPrefixedBytes},
    Address, B256, U256,
};

/// Compiler input and output structures used as parameters to Hardhat RPC methods
pub mod add_compilation_result;

/// input types for use with `hardhat_reset`
pub mod reset;

/// an invocation of a hardhat_* RPC method, with its parameters
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
#[allow(clippy::large_enum_variant)]
pub enum HardhatMethodInvocation {
    /// hardhat_addCompilationResult
    #[serde(rename = "hardhat_addCompilationResult")]
    AddCompilationResult(
        /// solc version:
        String,
        add_compilation_result::CompilerInput,
        add_compilation_result::CompilerOutput,
    ),
    /// hardhat_dropTransaction
    #[serde(
        rename = "hardhat_dropTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    DropTransaction(B256),
    /// hardhat_getAutomine
    #[serde(rename = "hardhat_getAutomine")]
    GetAutomine(),
    /// hardhat_getStackTraceFailuresCount
    #[serde(rename = "hardhat_getStackTraceFailuresCount")]
    GetStackTraceFailuresCount(),
    /// hardhat_impersonateAccount
    #[serde(
        rename = "hardhat_impersonateAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    ImpersonateAccount(Address),
    /// hardhat_intervalMine
    #[serde(rename = "hardhat_intervalMine")]
    IntervalMine(),
    /// hardhat_metadata
    #[serde(rename = "hardhat_metadata")]
    Metadata(),
    /// hardhat_mine
    #[serde(rename = "hardhat_mine")]
    Mine(
        /// block count:
        #[serde(default, with = "edr_eth::serde::optional_u64")]
        Option<u64>,
        /// interval:
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            with = "edr_eth::serde::optional_u64"
        )]
        Option<u64>,
    ),
    /// hardhat_reset
    #[serde(
        rename = "hardhat_reset",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Reset(Option<reset::RpcHardhatNetworkConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    SetBalance(Address, U256),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    SetCode(Address, ZeroXPrefixedBytes),
    /// hardhat_setCoinbase
    #[serde(
        rename = "hardhat_setCoinbase",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetCoinbase(Address),
    /// hardhat_setLoggingEnabled
    #[serde(
        rename = "hardhat_setLoggingEnabled",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetLoggingEnabled(bool),
    /// hardhat_setMinGasPrice
    #[serde(
        rename = "hardhat_setMinGasPrice",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetMinGasPrice(U256),
    /// hardhat_setNextBlockBaseFeePerGas
    #[serde(
        rename = "hardhat_setNextBlockBaseFeePerGas",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetNextBlockBaseFeePerGas(U256),
    /// hardhat_setNonce
    #[serde(rename = "hardhat_setNonce")]
    SetNonce(Address, U256),
    /// hardhat_setPrevRandao
    #[serde(
        rename = "hardhat_setPrevRandao",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetPrevRandao(ZeroXPrefixedBytes),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    SetStorageAt(Address, U256, U256),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    StopImpersonatingAccount(Address),
}

#[cfg(test)]
mod tests {
    use edr_eth::Bytes;
    use edr_test_utils::help_test_method_invocation_serde;

    use super::*;

    #[test]
    fn test_serde_hardhat_add_compilation_result() {
        // these were taken from a run of TypeScript function compileLiteral
        let compiler_input_json = include_str!("hardhat_methods/test_fixtures/compiler_input.json");
        let compiler_output_json =
            include_str!("hardhat_methods/test_fixtures/compiler_output.json");

        let call = HardhatMethodInvocation::AddCompilationResult(
            String::from("0.8.0"),
            serde_json::from_str::<add_compilation_result::CompilerInput>(compiler_input_json)
                .unwrap(),
            serde_json::from_str::<add_compilation_result::CompilerOutput>(compiler_output_json)
                .unwrap(),
        );

        help_test_method_invocation_serde(call.clone());

        match call {
            HardhatMethodInvocation::AddCompilationResult(_, ref input, ref output) => {
                assert_eq!(
                    serde_json::to_value(input).unwrap(),
                    serde_json::to_value(
                        serde_json::from_str::<add_compilation_result::CompilerInput>(
                            compiler_input_json
                        )
                        .unwrap()
                    )
                    .unwrap(),
                );
                assert_eq!(
                    serde_json::to_value(output).unwrap(),
                    serde_json::to_value(
                        serde_json::from_str::<add_compilation_result::CompilerOutput>(
                            compiler_output_json
                        )
                        .unwrap()
                    )
                    .unwrap(),
                );
            }
            _ => panic!("method invocation should have been AddCompilationResult"),
        }
    }

    #[test]
    fn test_serde_hardhat_drop_transaction() {
        help_test_method_invocation_serde(HardhatMethodInvocation::DropTransaction(
            B256::from_low_u64_ne(1),
        ));
    }

    #[test]
    fn test_serde_hardhat_get_automine() {
        help_test_method_invocation_serde(HardhatMethodInvocation::GetAutomine());
    }

    #[test]
    fn test_serde_hardhat_get_stack_trace_failures_count() {
        help_test_method_invocation_serde(HardhatMethodInvocation::GetStackTraceFailuresCount());
    }

    #[test]
    fn test_serde_hardhat_impersonate_account() {
        help_test_method_invocation_serde(HardhatMethodInvocation::ImpersonateAccount(
            Address::from_low_u64_ne(1),
        ));
    }

    #[test]
    fn test_serde_hardhat_interval_mine() {
        help_test_method_invocation_serde(HardhatMethodInvocation::IntervalMine());
    }

    #[test]
    fn test_serde_hardhat_metadata() {
        help_test_method_invocation_serde(HardhatMethodInvocation::Metadata());
    }

    #[test]
    fn test_serde_hardhat_mine() {
        help_test_method_invocation_serde(HardhatMethodInvocation::Mine(Some(1), Some(1)));
        help_test_method_invocation_serde(HardhatMethodInvocation::Mine(Some(1), None));
        help_test_method_invocation_serde(HardhatMethodInvocation::Mine(None, Some(1)));
        help_test_method_invocation_serde(HardhatMethodInvocation::Mine(None, None));

        let json = r#"{"jsonrpc":"2.0","method":"hardhat_mine","params":[],"id":2}"#;
        let deserialized: HardhatMethodInvocation = serde_json::from_str(json)
            .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
        assert_eq!(HardhatMethodInvocation::Mine(None, None), deserialized);
    }

    #[test]
    fn test_serde_hardhat_reset() {
        help_test_method_invocation_serde(HardhatMethodInvocation::Reset(Some(
            reset::RpcHardhatNetworkConfig {
                forking: Some(reset::RpcForkConfig {
                    json_rpc_url: String::from("http://whatever.com/whatever"),
                    block_number: Some(123456),
                    http_headers: None,
                }),
            },
        )));
    }

    #[test]
    fn test_serde_hardhat_set_balance() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetBalance(
            Address::from_low_u64_ne(1),
            U256::ZERO,
        ));
    }

    #[test]
    fn test_serde_hardhat_set_code() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetCode(
            Address::from_low_u64_ne(1),
            Bytes::from(&b"whatever"[..]).into(),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_coinbase() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetCoinbase(
            Address::from_low_u64_ne(1),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_logging_enabled() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetLoggingEnabled(true));
    }

    #[test]
    fn test_serde_hardhat_set_min_gas_price() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetMinGasPrice(U256::from(1)));
    }

    #[test]
    fn test_serde_hardhat_set_next_block_base_fee_per_gas() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetNextBlockBaseFeePerGas(
            U256::from(1),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_nonce() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetNonce(
            Address::from_low_u64_ne(1),
            U256::from(1),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_prev_randao() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetPrevRandao(
            Bytes::from(&b"whatever"[..]).into(),
        ));
    }

    #[test]
    fn test_serde_hardhat_set_storage_at() {
        help_test_method_invocation_serde(HardhatMethodInvocation::SetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            U256::ZERO,
        ));
    }

    #[test]
    fn test_serde_hardhat_stop_impersonating_account() {
        help_test_method_invocation_serde(HardhatMethodInvocation::StopImpersonatingAccount(
            Address::from_low_u64_ne(1),
        ));
    }
}
