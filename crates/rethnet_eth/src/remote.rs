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

#[derive(serde::Serialize)]
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

#[derive(serde::Serialize)]
#[serde(tag = "method", content = "params")]
enum MethodInvocation {
    #[serde(rename = "eth_getStorageAt")]
    StorageAt(
        Address,
        /// position
        U256,
        SerializableBlockSpec,
    ),
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence"
    )]
    TxByHash(B256),
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence"
    )]
    TxReceipt(B256),
    #[serde(rename = "eth_getLogs", serialize_with = "single_to_sequence")]
    Logs(GetLogsInput),
    #[serde(rename = "eth_getBalance")]
    Balance(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getBlockByHash")]
    BlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getBlockByNumber")]
    Block(
        SerializableBlockSpec,
        /// include transaction data
        bool,
    ),
    #[serde(rename = "eth_getCode")]
    Code(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getTransactionCount")]
    TxCount(Address, SerializableBlockSpec),
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GetLogsInput {
    from_block: SerializableBlockSpec,
    to_block: SerializableBlockSpec,
    address: Address,
}
