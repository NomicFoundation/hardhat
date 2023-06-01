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

#[derive(Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
enum MethodInvocation {
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        Address,
        /// position
        U256,
        SerializableBlockSpec,
    ),
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTxByHash(B256),
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTxReceipt(B256),
    #[serde(
        rename = "eth_getLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetLogs(GetLogsInput),
    #[serde(rename = "eth_getBalance")]
    GetBalance(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getBlockByHash")]
    GetBlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getBlockByNumber")]
    GetBlock(
        SerializableBlockSpec,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getCode")]
    GetCode(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getTransactionCount")]
    GetTxCount(Address, SerializableBlockSpec),
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
    fn test_serde_eth_get_tx_by_hash() {
        help_test_method_invocation_serde(MethodInvocation::GetTxByHash(B256::from_low_u64_ne(1)));
    }

    #[test]
    fn test_serde_eth_get_tx_count_by_block_number() {
        help_test_method_invocation_serde(MethodInvocation::GetTxCount(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Number(U256::from(100)),
        ));
    }

    #[test]
    fn test_serde_eth_get_tx_count_by_block_tag() {
        help_test_method_invocation_serde(MethodInvocation::GetTxCount(
            Address::from_low_u64_ne(1),
            SerializableBlockSpec::Tag(String::from("latest")),
        ));
    }

    #[test]
    fn test_serde_eth_get_tx_receipt() {
        help_test_method_invocation_serde(MethodInvocation::GetTxReceipt(B256::from_low_u64_ne(1)));
    }
}
