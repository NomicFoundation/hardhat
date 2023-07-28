use bytes::Bytes;

use rethnet_eth::{
    remote::{
        eth::eip712,
        methods::{
            FilterOptions, GetLogsInput, MethodInvocation, SubscriptionType, TransactionInput,
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
    help_test_method_invocation_serde(MethodInvocation::Accounts());
}

#[test]
fn test_serde_eth_block_number() {
    help_test_method_invocation_serde(MethodInvocation::BlockNumber());
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
    help_test_method_invocation_serde(MethodInvocation::Call(
        tx.clone(),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::Call(tx.clone(), None),
        MethodInvocation::Call(tx, Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_chain_id() {
    help_test_method_invocation_serde(MethodInvocation::ChainId());
}

#[test]
fn test_serde_eth_coinbase() {
    help_test_method_invocation_serde(MethodInvocation::Coinbase());
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
    help_test_method_invocation_serde(MethodInvocation::EstimateGas(
        tx.clone(),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::EstimateGas(tx.clone(), None),
        MethodInvocation::EstimateGas(tx, Some(BlockSpec::pending())),
    );
}

#[test]
fn test_serde_eth_fee_history() {
    help_test_method_invocation_serde(MethodInvocation::FeeHistory(
        U256::from(3),
        BlockSpec::Number(U256::from(100)),
        vec![0.5_f64, 10_f64, 80_f64, 90_f64, 99.5_f64],
    ));
}

#[test]
fn test_serde_eth_gas_price() {
    help_test_method_invocation_serde(MethodInvocation::GasPrice());
}

#[test]
fn test_serde_eth_get_balance() {
    help_test_method_invocation_serde(MethodInvocation::GetBalance(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::GetBalance(Address::from_low_u64_ne(1), None),
        MethodInvocation::GetBalance(Address::from_low_u64_ne(1), Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_get_block_by_number() {
    help_test_method_invocation_serde(MethodInvocation::GetBlockByNumber(
        BlockSpec::Number(U256::from(100)),
        true,
    ));
}

#[test]
fn test_serde_eth_get_block_by_tag() {
    help_test_method_invocation_serde(MethodInvocation::GetBlockByNumber(
        BlockSpec::latest(),
        true,
    ));
}

#[test]
fn test_serde_eth_get_block_by_hash() {
    help_test_method_invocation_serde(MethodInvocation::GetBlockByHash(
        B256::from_low_u64_ne(1),
        true,
    ));
}

#[test]
fn test_serde_eth_get_transaction_count() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::GetTransactionCount(Address::from_low_u64_ne(1), None),
        MethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(1),
            Some(BlockSpec::latest()),
        ),
    );
}

#[test]
fn test_serde_eth_get_transaction() {
    help_test_method_invocation_serde(MethodInvocation::GetBlockTransactionCountByHash(
        B256::from_low_u64_ne(1),
    ));
}

#[test]
fn test_serde_eth_get_transaction_count_by_number() {
    help_test_method_invocation_serde(MethodInvocation::GetBlockTransactionCountByNumber(
        BlockSpec::Number(U256::from(100)),
    ));
}

#[test]
fn test_serde_eth_get_code() {
    help_test_method_invocation_serde(MethodInvocation::GetCode(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::GetCode(Address::from_low_u64_ne(1), None),
        MethodInvocation::GetCode(Address::from_low_u64_ne(1), Some(BlockSpec::latest())),
    );
}

#[test]
fn test_serde_eth_get_filter_changes() {
    help_test_method_invocation_serde(MethodInvocation::GetFilterChanges(U256::from(100)));
}

#[test]
fn test_serde_eth_get_filter_logs() {
    help_test_method_invocation_serde(MethodInvocation::GetFilterLogs(U256::from(100)));
}

#[test]
fn test_serde_eth_get_logs_by_block_numbers() {
    help_test_method_invocation_serde(MethodInvocation::GetLogs(GetLogsInput {
        address: Address::from_low_u64_ne(1),
        from_block: BlockSpec::Number(U256::from(100)),
        to_block: BlockSpec::Number(U256::from(102)),
    }));
}

#[test]
fn test_serde_eth_get_logs_by_block_tags() {
    help_test_method_invocation_serde(MethodInvocation::GetLogs(GetLogsInput {
        address: Address::from_low_u64_ne(1),
        from_block: BlockSpec::Tag(BlockTag::Safe),
        to_block: BlockSpec::latest(),
    }));
}

#[test]
fn test_serde_eth_get_storage_at() {
    help_test_method_invocation_serde(MethodInvocation::GetStorageAt(
        Address::from_low_u64_ne(1),
        U256::ZERO,
        Some(BlockSpec::latest()),
    ));
    help_test_method_invocation_serde_with_expected(
        MethodInvocation::GetStorageAt(Address::from_low_u64_ne(1), U256::ZERO, None),
        MethodInvocation::GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            Some(BlockSpec::latest()),
        ),
    );
}

#[test]
fn test_serde_eth_get_tx_by_block_hash_and_index() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionByBlockHashAndIndex(
        B256::from_low_u64_ne(1),
        U256::from(1),
    ));
}

#[test]
fn test_serde_eth_get_tx_by_block_number_and_index() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionByBlockNumberAndIndex(
        U256::from(100),
        U256::from(1),
    ));
}

#[test]
fn test_serde_eth_get_tx_by_hash() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionByHash(
        B256::from_low_u64_ne(1),
    ));
}

#[test]
fn test_serde_eth_get_tx_count_by_block_number() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::Number(U256::from(100))),
    ));
}

#[test]
fn test_serde_eth_get_tx_count_by_block_tag() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionCount(
        Address::from_low_u64_ne(1),
        Some(BlockSpec::latest()),
    ));
}

#[test]
fn test_serde_eth_get_tx_receipt() {
    help_test_method_invocation_serde(MethodInvocation::GetTransactionReceipt(
        B256::from_low_u64_ne(1),
    ));
}

#[test]
fn test_serde_eth_mining() {
    help_test_method_invocation_serde(MethodInvocation::Mining());
}

#[test]
fn test_serde_eth_new_block_filter() {
    help_test_method_invocation_serde(MethodInvocation::NewBlockFilter());
}

#[test]
fn test_serde_eth_new_filter() {
    help_test_method_invocation_serde(MethodInvocation::NewFilter(FilterOptions {
        from_block: Some(BlockSpec::Number(U256::from(1000))),
        to_block: Some(BlockSpec::latest()),
        address: Some(Address::from_low_u64_ne(1)),
        topics: Some(vec![Bytes::from(&b"some topic"[..]).into()]),
    }));
}

#[test]
fn test_serde_eth_new_pending_transaction_filter() {
    help_test_method_invocation_serde(MethodInvocation::NewPendingTransactionFilter());
}

#[test]
fn test_serde_eth_pending_transactions() {
    help_test_method_invocation_serde(MethodInvocation::PendingTransactions());
}

#[test]
fn test_serde_eth_send_raw_transaction() {
    help_test_method_invocation_serde(MethodInvocation::SendRawTransaction(
        Bytes::from(&b"whatever"[..]).into(),
    ));
}

#[test]
fn test_serde_eth_send_transaction() {
    help_test_method_invocation_serde(MethodInvocation::SendTransaction(TransactionInput {
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
    help_test_method_invocation_serde(MethodInvocation::Sign(
        Address::from_low_u64_ne(1),
        Bytes::from(&b"whatever"[..]).into(),
    ));
}

#[test]
fn test_serde_eth_sign_typed_data_v4() {
    help_test_method_invocation_serde(MethodInvocation::SignTypedDataV4(
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
    help_test_method_invocation_serde(MethodInvocation::Subscribe(vec![
        SubscriptionType::Logs,
        SubscriptionType::NewPendingTransactions,
        SubscriptionType::NewHeads,
    ]));
}

#[test]
fn test_serde_eth_syncing() {
    help_test_method_invocation_serde(MethodInvocation::Syncing());
}

#[test]
fn test_serde_eth_uninstall_filter() {
    help_test_method_invocation_serde(MethodInvocation::UninstallFilter(U256::from(100)));
}

#[test]
fn test_serde_eth_unsubscribe() {
    help_test_method_invocation_serde(MethodInvocation::Unsubscribe(vec![Bytes::from(
        &b"some subscription ID"[..],
    )
    .into()]));
}

#[test]
fn test_evm_set_automine() {
    help_test_method_invocation_serde(MethodInvocation::EvmSetAutomine(false));
}

#[test]
fn test_evm_snapshot() {
    help_test_method_invocation_serde(MethodInvocation::EvmSnapshot());
}

#[test]
fn test_personal_sign() {
    let call = MethodInvocation::Sign(
        Address::from_low_u64_ne(1),
        Bytes::from(&b"whatever"[..]).into(),
    );

    let serialized = serde_json::json!(call)
        .to_string()
        .replace("eth_sign", "personal_sign");

    let call_deserialized: MethodInvocation = serde_json::from_str(&serialized)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {serialized}"));

    assert_eq!(call, call_deserialized);
}
