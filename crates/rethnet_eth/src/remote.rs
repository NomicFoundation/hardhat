mod client;
mod eth;
mod jsonrpc;
mod withdrawal;

use std::fmt::Write;

use crate::{Address, B256, U256};

pub use client::{RpcClient, RpcClientError};

struct U64(u64);

impl serde::Serialize for U64 {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&format!("{:#x}", self.0))
    }
}

impl From<u64> for U64 {
    fn from(u: u64) -> U64 {
        U64(u)
    }
}

fn single_to_sequence<S, T>(val: &T, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: serde::Serialize,
{
    use serde::ser::SerializeSeq;
    let mut seq = s.serialize_seq(Some(1))?;
    seq.serialize_element(val)?;
    seq.end()
}

fn sequence_to_single<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de> + Clone,
{
    let s: Vec<T> = serde::de::Deserialize::deserialize(deserializer)?;
    Ok(s[0].clone())
}

/// a custom implementation because the one from ruint includes leading zeroes and the JSON-RPC
/// server implementations reject that.
fn serialize_u256<S>(x: &U256, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let bytes = x.to_be_bytes_vec();

    // OPT: Allocation free method.
    let mut result = String::with_capacity(2 * U256::BYTES + 2);
    result.push_str("0x");

    let mut leading_zeroes = true;
    for byte in bytes {
        if leading_zeroes {
            if byte != 0 {
                write!(result, "{byte:x}").unwrap();
                leading_zeroes = false;
            }
            continue;
        }
        write!(result, "{byte:02x}").unwrap();
    }

    // 0x0
    if leading_zeroes {
        result.push('0');
    }

    s.serialize_str(&result)
}

/// for use with serde's deserialize_with on fields of hexadecimal strings that should be
/// parsed as Option<u64>
pub fn optional_u64_from_hex<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: &str = serde::Deserialize::deserialize(deserializer)?;
    Ok(Some(
        u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"),
    ))
}

/// For specifying a block
#[derive(Clone)]
pub enum BlockSpec {
    /// as a block number
    Number(U256),
    /// as a block tag (eg "latest")
    Tag(String),
}

impl BlockSpec {
    /// Constructs a `BlockSpec` for the latest block.
    pub fn latest() -> Self {
        Self::Tag(String::from("latest"))
    }
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
enum SerializableBlockSpec {
    /// as a block number
    #[serde(serialize_with = "serialize_u256")]
    Number(U256),
    /// as a block tag (eg "latest")
    Tag(String),
}

impl From<BlockSpec> for SerializableBlockSpec {
    fn from(block_spec: BlockSpec) -> SerializableBlockSpec {
        match block_spec {
            BlockSpec::Number(n) => SerializableBlockSpec::Number(U256::from(n)),
            BlockSpec::Tag(s) => SerializableBlockSpec::Tag(s),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
struct ZeroXPrefixedBytes {
    inner: bytes::Bytes,
}

impl<'a> serde::Deserialize<'a> for ZeroXPrefixedBytes {
    fn deserialize<D>(deserializer: D) -> Result<ZeroXPrefixedBytes, D::Error>
    where
        D: serde::Deserializer<'a>,
    {
        struct ZeroXPrefixedBytesVisitor;
        impl<'a> serde::de::Visitor<'a> for ZeroXPrefixedBytesVisitor {
            type Value = ZeroXPrefixedBytes;

            fn expecting(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
                formatter.write_str("a 0x-prefixed string of hex digits")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                if &value[0..1] == "0x" {
                    Err(serde::de::Error::custom(
                        "string does not have a '0x' prefix",
                    ))
                } else {
                    Ok(ZeroXPrefixedBytes {
                        inner: bytes::Bytes::from(
                            hex::decode(&value[2..]).unwrap_or_else(|_| {
                                panic!("failed to decode hex string \"{value}\"")
                            }),
                        ),
                    })
                }
            }
        }

        deserializer.deserialize_identifier(ZeroXPrefixedBytesVisitor)
    }
}

impl serde::Serialize for ZeroXPrefixedBytes {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&format!("0x{}", hex::encode(self.inner.clone()),))
    }
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
struct TransactionInput {
    from: Option<Address>,
    to: Option<Address>,
    gas: Option<U256>,
    #[serde(rename = "gasPrice")]
    gas_price: Option<U256>,
    value: Option<U256>,
    data: Option<ZeroXPrefixedBytes>,
}

#[derive(Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
enum MethodInvocation {
    #[serde(rename = "eth_accounts")]
    Accounts(),
    #[serde(rename = "eth_blockNumber")]
    BlockNumber(),
    #[serde(rename = "eth_call")]
    Call(TransactionInput, SerializableBlockSpec),
    #[serde(rename = "eth_chainId")]
    ChainId(),
    #[serde(rename = "eth_coinbase")]
    Coinbase(),
    #[serde(rename = "eth_estimateGas")]
    EstimateGas(TransactionInput, SerializableBlockSpec),
    #[serde(rename = "eth_feeHistory")]
    FeeHistory(
        /// block count
        U256,
        /// newest block
        SerializableBlockSpec,
        /// reward percentiles
        Vec<f64>,
    ),
    #[serde(rename = "eth_gasPrice")]
    GasPrice(),
    #[serde(rename = "eth_getBalance")]
    GetBalance(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getBlockByNumber")]
    GetBlock(
        SerializableBlockSpec,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getBlockByHash")]
    GetBlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getBlockTransactionCountByHash")]
    GetBlockTransactionCountByHash(B256),
    #[serde(rename = "eth_getBlockTransactionCountByNumber")]
    GetBlockTransactionCountByNumber(SerializableBlockSpec),
    #[serde(rename = "eth_getCode")]
    GetCode(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getFilterChanges")]
    GetFilterChanges(U256),
    #[serde(rename = "eth_getFilterLogs")]
    GetFilterLogs(U256),
    #[serde(
        rename = "eth_getLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetLogs(GetLogsInput),
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        Address,
        /// position
        U256,
        SerializableBlockSpec,
    ),
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(U256, U256),
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionByHash(B256),
    #[serde(rename = "eth_getTransactionCount")]
    GetTransactionCount(Address, SerializableBlockSpec),
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionReceipt(B256),
    #[serde(rename = "eth_mining")]
    Mining(),
    #[serde(rename = "eth_newBlockFilter")]
    NewBlockFilter(),
    #[serde(rename = "eth_newPendingTransactionFilter")]
    NewPendingTransactionFilter(),
    #[serde(rename = "eth_pendingTransactions")]
    PendingTransactions(),
    #[serde(rename = "eth_sendRawTransaction")]
    SendRawTransaction(ZeroXPrefixedBytes),
    #[serde(rename = "eth_sendTransaction")]
    SendTransaction(TransactionInput),
    #[serde(rename = "eth_sign")]
    Sign(Address, ZeroXPrefixedBytes),
    #[serde(rename = "eth_signTypedData_v4")]
    SignTypedDataV4(Address, eth::eip712::Message),
    #[serde(rename = "eth_syncing")]
    Syncing(),
    #[serde(rename = "eth_uninstallFilter")]
    UninstallFilter(U256),
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GetLogsInput {
    from_block: SerializableBlockSpec,
    to_block: SerializableBlockSpec,
    address: Address,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn help_test_method_invocation_serde(call: MethodInvocation) {
        let json = serde_json::json!(call).to_string();
        let call_decoded: MethodInvocation = serde_json::from_str(&json).expect(&format!(
            "should have successfully deserialized json {json}"
        ));
        assert_eq!(call, call_decoded);
    }

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
            data: Some(ZeroXPrefixedBytes {
                inner: bytes::Bytes::from(&b"whatever"[..]),
            }),
        };
        help_test_method_invocation_serde(MethodInvocation::Call(
            tx.clone(),
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
        help_test_method_invocation_serde(MethodInvocation::Call(
            tx,
            SerializableBlockSpec::Number(U256::from(100)),
        ));
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
            data: Some(ZeroXPrefixedBytes {
                inner: bytes::Bytes::from(&b"whatever"[..]),
            }),
        };
        help_test_method_invocation_serde(MethodInvocation::EstimateGas(
            tx.clone(),
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
        help_test_method_invocation_serde(MethodInvocation::EstimateGas(
            tx,
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_fee_history() {
        help_test_method_invocation_serde(MethodInvocation::FeeHistory(
            U256::from(3),
            SerializableBlockSpec::Number(U256::from(100)),
            vec![0.5_f64, 10_f64, 80_f64, 90_f64, 99.5_f64],
        ));
    }

    #[test]
    fn test_serde_eth_gas_price() {
        help_test_method_invocation_serde(MethodInvocation::GasPrice());
    }

    #[test]
    fn test_serde_eth_get_balance_by_block_number() {
        help_test_method_invocation_serde(MethodInvocation::GetBalance(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_balance_by_block_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetBalance(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
    }

    #[test]
    fn test_serde_eth_get_block_by_number() {
        help_test_method_invocation_serde(MethodInvocation::GetBlock(
            SerializableBlockSpec::Number(U256::from(100)),
            true,
        ));
    }

    #[test]
    fn test_serde_eth_get_block_by_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetBlock(
            SerializableBlockSpec::Tag(String::from("latest")),
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
    fn test_serde_eth_get_transaction_count_by_hash() {
        help_test_method_invocation_serde(MethodInvocation::GetBlockTransactionCountByHash(
            B256::from_low_u64_ne(1),
        ));
    }

    #[test]
    fn test_serde_eth_get_transaction_count_by_number() {
        help_test_method_invocation_serde(MethodInvocation::GetBlockTransactionCountByNumber(
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_code_by_block_number() {
        help_test_method_invocation_serde(MethodInvocation::GetCode(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_code_by_block_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetCode(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
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
            from_block: SerializableBlockSpec::Number(U256::from(100)),
            to_block: SerializableBlockSpec::Number(U256::from(102)),
        }));
    }

    #[test]
    fn test_serde_eth_get_logs_by_block_tags() {
        help_test_method_invocation_serde(MethodInvocation::GetLogs(GetLogsInput {
            address: Address::from_low_u64_ne(1),
            from_block: SerializableBlockSpec::Tag(String::from("safe")),
            to_block: SerializableBlockSpec::Tag(String::from("latest")),
        }));
    }

    #[test]
    fn test_serde_eth_get_storage_at_by_block_number() {
        help_test_method_invocation_serde(MethodInvocation::GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_storage_at_by_block_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
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
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_tx_count_by_block_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Tag(String::from("latest")),
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
            ZeroXPrefixedBytes {
                inner: bytes::Bytes::from(&b"whatever"[..]),
            },
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
            data: Some(ZeroXPrefixedBytes {
                inner: bytes::Bytes::from(&b"whatever"[..]),
            }),
        }));
    }

    #[test]
    fn test_serde_eth_sign() {
        help_test_method_invocation_serde(MethodInvocation::Sign(
            Address::from_low_u64_ne(1),
            ZeroXPrefixedBytes {
                inner: bytes::Bytes::from(&b"whatever"[..]),
            },
        ));
    }

    #[test]
    fn test_serde_eth_sign_typed_data_v4() {
        help_test_method_invocation_serde(MethodInvocation::SignTypedDataV4(
            Address::from_low_u64_ne(1),
            eth::eip712::Message {
                types: hashbrown::HashMap::from([(
                    String::from("typeA"),
                    vec![eth::eip712::FieldType {
                        name: String::from("A"),
                        type_: String::from("whatever"),
                    }],
                )]),
                primary_type: String::from("whatever"),
                message: serde_json::Value::from(String::from("a message body")),
                domain: eth::eip712::Domain {
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
    fn test_serde_eth_syncing() {
        help_test_method_invocation_serde(MethodInvocation::Syncing());
    }

    #[test]
    fn test_serde_eth_uninstall_filter() {
        help_test_method_invocation_serde(MethodInvocation::UninstallFilter(U256::from(100)));
    }
}
