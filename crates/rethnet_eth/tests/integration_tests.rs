use bytes::Bytes;

use rethnet_eth::{
    remote::{
        eth::eip712,
        methods::{FilterOptions, GetLogsInput, MethodInvocation, TransactionInput},
        BlockSpec, BlockTag,
    },
    Address, B256, U256,
};
use rethnet_test_utils::help_test_method_invocation_serde;

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
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
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
        block_spec,
    ));
    }
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
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
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
        block_spec
    ));
    }
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
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
    help_test_method_invocation_serde(MethodInvocation::GetBalance(
        Address::from_low_u64_ne(1),
        block_spec,
    ));
    }
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
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
        help_test_method_invocation_serde(MethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(1),
            block_spec
        ));
    }
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
fn test_serde_eth_get_code_by_block_number() {
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
    help_test_method_invocation_serde(MethodInvocation::GetCode(
        Address::from_low_u64_ne(1),
        block_spec,
    ));
    }
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
fn test_serde_eth_get_storage_at_by_block_number() {
    for block_spec in [Some(BlockSpec::Number(U256::from(100))), Some(BlockSpec::latest()), None] {
    help_test_method_invocation_serde(MethodInvocation::GetStorageAt(
        Address::from_low_u64_ne(1),
        U256::ZERO,
        block_spec,
    ));
    }
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
        String::from("newHeads"),
        String::from("newPendingTransactions"),
        String::from("logs"),
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
