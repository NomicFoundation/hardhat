use bytes::Bytes;

use rethnet_eth::remote::methods::NonCacheableMethodInvocation;
use rethnet_eth::{
    remote::{
        eth::eip712,
        filter::{
            FilterBlockTarget, FilterOptions, LogOutput, OneOrMoreAddresses, SubscriptionType,
        },
        methods::{
            CacheableMethodInvocation::*, GetLogsInput, NonCacheableMethodInvocation::*,
            TransactionInput, U256OrUsize,
        },
        BlockSpec, BlockTag,
    },
    Address, B256, U256,
};
use rethnet_test_utils::{
    help_test_method_invocation_serde, help_test_method_invocation_serde_with_expected,
};

#[test]
fn test_serde_eth_accounts() {
    help_test_method_invocation_serde(Accounts());
}

#[test]
fn test_serde_eth_block_number() {
    help_test_method_invocation_serde(BlockNumber());
}

#[test]
fn test_serde_eth_call() {
    let tx = TransactionInput {
        from: Some(Address::from_low_u64_ne(1)),
        to: Some(Address::from_low_u64_ne(2)),
        gas: Some(U256::from(3)),
        gas_price: Some(U256::from(4)),
        value: Some(U256::from(123568919)),
        data: Some(Bytes::from(&b"whatever"[..]).into()),
    };
    help_test_method_invocation_serde(Call(tx.clone(), Some(BlockSpec::latest())));
    help_test_method_invocation_serde_with_expected(
        Call(tx.clone(), None),
        Call(tx, Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_chain_id() {
    help_test_method_invocation_serde(ChainId());
}

#[test]
fn test_serde_eth_coinbase() {
    help_test_method_invocation_serde(Coinbase());
}

#[test]
fn test_serde_eth_estimate_gas() {
    let tx = TransactionInput {
        from: Some(Address::from_low_u64_ne(1)),
        to: Some(Address::from_low_u64_ne(2)),
        gas: Some(U256::from(3)),
        gas_price: Some(U256::from(4)),
        value: Some(U256::from(123568919)),
        data: Some(Bytes::from(&b"whatever"[..]).into()),
    };
    help_test_method_invocation_serde(EstimateGas(tx.clone(), Some(BlockSpec::latest())));
    help_test_method_invocation_serde_with_expected(
        EstimateGas(tx.clone(), None),
        EstimateGas(tx, Some(BlockSpec::pending())),
    );
}

#[test]
fn test_serde_eth_fee_history() {
    help_test_method_invocation_serde(FeeHistory(
        U256::from(3),
        BlockSpec::Number(U256::from(100)),
        vec![0.5_f64, 10_f64, 80_f64, 90_f64, 99.5_f64]
            .try_into()
            .unwrap(),
    ));
}

#[test]
fn test_serde_eth_gas_price() {
    help_test_method_invocation_serde(GasPrice());
}

#[test]
fn test_serde_eth_get_balance() {
    help_test_method_invocation_serde(GetBalance(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        GetBalance(Address::from_low_u64_ne(1), None),
        GetBalance(Address::from_low_u64_ne(1), Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_get_block_by_number() {
    help_test_method_invocation_serde(GetBlockByNumber(BlockSpec::Number(U256::from(100)), true));
}

#[test]
fn test_serde_eth_get_block_by_tag() {
    help_test_method_invocation_serde(GetBlockByNumber(BlockSpec::latest(), true));
}

#[test]
fn test_serde_eth_get_block_by_hash() {
    help_test_method_invocation_serde(GetBlockByHash(B256::from_low_u64_ne(1), true));
}

#[test]
fn test_serde_eth_get_transaction_count() {
    help_test_method_invocation_serde(GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        GetTransactionCount(Address::from_low_u64_ne(1), None),
        GetTransactionCount(Address::from_low_u64_ne(1), Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_get_transaction() {
    help_test_method_invocation_serde(GetBlockTransactionCountByHash(B256::from_low_u64_ne(1)));
}

#[test]
fn test_serde_eth_get_transaction_count_by_number() {
    help_test_method_invocation_serde(GetBlockTransactionCountByNumber(BlockSpec::Number(
        U256::from(100),
    )));
}

#[test]
fn test_serde_eth_get_code() {
    help_test_method_invocation_serde(GetCode(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        GetCode(Address::from_low_u64_ne(1), None),
        GetCode(Address::from_low_u64_ne(1), Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_get_filter_changes() {
    help_test_method_invocation_serde(GetFilterChanges(U256::from(100)));
}

#[test]
fn test_serde_eth_get_filter_logs() {
    help_test_method_invocation_serde(GetFilterLogs(U256::from(100)));
}

#[test]
fn test_serde_eth_get_logs_by_block_numbers() {
    help_test_method_invocation_serde(GetLogs(GetLogsInput {
        address: Address::from_low_u64_ne(1),
        from_block: BlockSpec::Number(U256::from(100)),
        to_block: BlockSpec::Number(U256::from(102)),
    }));
}

#[test]
fn test_serde_eth_get_logs_by_block_tags() {
    help_test_method_invocation_serde(GetLogs(GetLogsInput {
        address: Address::from_low_u64_ne(1),
        from_block: BlockSpec::Tag(BlockTag::Safe),
        to_block: BlockSpec::latest(),
    }));
}

#[test]
fn test_serde_eth_get_storage_at() {
    help_test_method_invocation_serde(GetStorageAt(
        Address::from_low_u64_ne(1),
        U256::ZERO,
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        GetStorageAt(Address::from_low_u64_ne(1), U256::ZERO, None),
        GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            Some(BlockSpec::latest()),
        ),
    );
}

#[test]
fn test_serde_eth_get_tx_by_block_hash_and_index() {
    help_test_method_invocation_serde(GetTransactionByBlockHashAndIndex(
        B256::from_low_u64_ne(1),
        U256::from(1),
    ));
}

#[test]
fn test_serde_eth_get_tx_by_block_number_and_index() {
    help_test_method_invocation_serde(GetTransactionByBlockNumberAndIndex(
        U256::from(100),
        U256::from(1),
    ));
}

#[test]
fn test_serde_eth_get_tx_by_hash() {
    help_test_method_invocation_serde(GetTransactionByHash(B256::from_low_u64_ne(1)));
}

#[test]
fn test_serde_eth_get_tx_count_by_block_number() {
    help_test_method_invocation_serde(GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::Number(U256::from(100))),
    ));
}

#[test]
fn test_serde_eth_get_tx_count_by_block_tag() {
    help_test_method_invocation_serde(GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
}

#[test]
fn test_serde_eth_get_tx_receipt() {
    help_test_method_invocation_serde(GetTransactionReceipt(B256::from_low_u64_ne(1)));
}

#[test]
fn test_serde_eth_mining() {
    help_test_method_invocation_serde(Mining());
}

#[test]
fn test_serde_eth_new_block_filter() {
    help_test_method_invocation_serde(NewBlockFilter());
}

#[test]
fn test_serde_eth_new_filter() {
    help_test_method_invocation_serde(NewFilter(FilterOptions {
        block_target: Some(FilterBlockTarget::Range {
            from: Some(BlockSpec::Number(U256::from(1000))),
            to: Some(BlockSpec::latest()),
        }),
        addresses: Some(OneOrMoreAddresses::One(Address::from_low_u64_ne(1))),
        topics: Some(vec![B256::from_low_u64_ne(1)]),
    }));
}

#[test]
fn test_serde_eth_new_pending_transaction_filter() {
    help_test_method_invocation_serde(NewPendingTransactionFilter());
}

#[test]
fn test_serde_eth_pending_transactions() {
    help_test_method_invocation_serde(PendingTransactions());
}

#[test]
fn test_serde_eth_send_raw_transaction() {
    help_test_method_invocation_serde(SendRawTransaction(Bytes::from(&b"whatever"[..]).into()));
}

#[test]
fn test_serde_eth_send_transaction() {
    help_test_method_invocation_serde(SendTransaction(TransactionInput {
        from: Some(Address::from_low_u64_ne(1)),
        to: Some(Address::from_low_u64_ne(2)),
        gas: Some(U256::from(3)),
        gas_price: Some(U256::from(4)),
        value: Some(U256::from(123568919)),
        data: Some(Bytes::from(&b"whatever"[..]).into()),
    }));
}

#[test]
fn test_serde_eth_sign() {
    help_test_method_invocation_serde(Sign(
        Address::from_low_u64_ne(1),
        Bytes::from(&b"whatever"[..]).into(),
    ));
}

#[test]
fn test_serde_eth_sign_typed_data_v4() {
    help_test_method_invocation_serde(SignTypedDataV4(
        Address::from_low_u64_ne(1),
        eip712::Message {
            types: hashbrown::HashMap::from([(
                String::from("typeA"),
                vec![eip712::FieldType {
                    name: String::from("A"),
                    type_: String::from("whatever"),
                }],
            )]),
            primary_type: String::from("whatever"),
            message: serde_json::Value::from(String::from("a message body")),
            domain: eip712::Domain {
                name: Some(String::from("my domain")),
                version: Some(String::from("1.0.0")),
                chain_id: Some(U256::from(1)),
                verifying_contract: Some(Address::from_low_u64_ne(1)),
                salt: Some(B256::from_low_u64_ne(1)),
            },
        },
    ));
}

#[test]
fn test_serde_eth_subscribe() {
    help_test_method_invocation_serde(Subscribe(vec![
        SubscriptionType::Logs,
        SubscriptionType::NewPendingTransactions,
        SubscriptionType::NewHeads,
    ]));
}

#[test]
fn test_serde_eth_syncing() {
    help_test_method_invocation_serde(Syncing());
}

#[test]
fn test_serde_eth_uninstall_filter() {
    help_test_method_invocation_serde(UninstallFilter(U256::from(100)));
}

#[test]
fn test_serde_eth_unsubscribe() {
    help_test_method_invocation_serde(Unsubscribe(U256::from(100)));
}

fn help_test_serde_value<T>(value: T)
where
    T: PartialEq + std::fmt::Debug + serde::de::DeserializeOwned + serde::Serialize,
{
    let serialized = serde_json::json!(value).to_string();

    let deserialized: T = serde_json::from_str(&serialized)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {serialized}"));

    assert_eq!(value, deserialized);
}

#[test]
fn test_serde_log_output() {
    help_test_serde_value(LogOutput {
        removed: false,
        log_index: Some(U256::ZERO),
        transaction_index: Some(99),
        transaction_hash: Some(B256::from_low_u64_ne(1)),
        block_hash: Some(B256::from_low_u64_ne(2)),
        block_number: Some(U256::ZERO),
        address: Address::from_low_u64_ne(1),
        data: Bytes::from_static(b"whatever"),
        topics: vec![B256::from_low_u64_ne(3), B256::from_low_u64_ne(3)],
    });
}

#[test]
fn test_serde_filter_block_target() {
    help_test_serde_value(FilterBlockTarget::Hash(B256::from_low_u64_ne(1)));
    help_test_serde_value(FilterBlockTarget::Range {
        from: Some(BlockSpec::latest()),
        to: Some(BlockSpec::latest()),
    });
}

#[test]
fn test_serde_one_or_more_addresses() {
    help_test_serde_value(OneOrMoreAddresses::One(Address::from_low_u64_ne(1)));
    help_test_serde_value(OneOrMoreAddresses::Many(vec![
        Address::from_low_u64_ne(1),
        Address::from_low_u64_ne(1),
    ]));
}

#[test]
fn test_evm_increase_time() {
    help_test_method_invocation_serde(EvmIncreaseTime(U256OrUsize::U256(U256::from(12345))));
}

#[test]
fn test_evm_mine() {
    help_test_method_invocation_serde(EvmMine(Some(U256OrUsize::U256(U256::from(12345)))));
    help_test_method_invocation_serde(EvmMine(Some(U256OrUsize::Usize(12345))));
    help_test_method_invocation_serde(EvmMine(None));
}

#[test]
fn test_evm_set_next_block_timestamp() {
    help_test_method_invocation_serde(EvmSetNextBlockTimestamp(U256OrUsize::U256(U256::from(
        12345,
    ))));
}

#[test]
fn test_serde_web3_client_version() {
    help_test_method_invocation_serde(Web3ClientVersion());
}

#[test]
fn test_serde_web3_sha3() {
    help_test_method_invocation_serde(Web3Sha3(Bytes::from(&b"whatever"[..]).into()));
}

#[test]
fn test_evm_set_automine() {
    help_test_method_invocation_serde(EvmSetAutomine(false));
}

#[test]
fn test_evm_snapshot() {
    help_test_method_invocation_serde(EvmSnapshot());
}

#[test]
fn test_net_listening() {
    help_test_method_invocation_serde(NetListening());
}

#[test]
fn test_net_peer_count() {
    help_test_method_invocation_serde(NetPeerCount());
}

#[test]
fn test_personal_sign() {
    let call = Sign(
        Address::from_low_u64_ne(1),
        Bytes::from(&b"whatever"[..]).into(),
    );

    let serialized = serde_json::json!(call)
        .to_string()
        .replace("eth_sign", "personal_sign");

    let call_deserialized: NonCacheableMethodInvocation = serde_json::from_str(&serialized)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {serialized}"));

    assert_eq!(call, call_deserialized);
}
