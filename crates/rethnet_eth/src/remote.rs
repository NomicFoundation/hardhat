/// an Ethereum JSON-RPC client
pub mod client;

mod eth;

/// data types specific to JSON-RPC but not specific to Ethereum.
pub mod jsonrpc;

/// RPC methods
pub mod methods;

mod withdrawal;

use std::fmt::Write;

use bytes::Bytes;

use crate::U256;

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

/// for use with serde's serialize_with on a single value that should be serialized as a
/// sequence
pub fn single_to_sequence<S, T>(val: &T, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: serde::Serialize,
{
    use serde::ser::SerializeSeq;
    let mut seq = s.serialize_seq(Some(1))?;
    seq.serialize_element(val)?;
    seq.end()
}

/// for use with serde's deserialize_with on a sequence that should be deserialized as a
/// single value
pub fn sequence_to_single<'de, D, T>(deserializer: D) -> Result<T, D::Error>
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
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum BlockSpec {
    /// as a block number
    #[serde(serialize_with = "serialize_u256")]
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

/// for specifying a bytes string that will have a 0x prefix when serialized and
/// deserialized
#[derive(Clone, Debug, PartialEq)]
pub struct ZeroXPrefixedBytes {
    inner: Bytes,
}

impl From<Bytes> for ZeroXPrefixedBytes {
    fn from(b: Bytes) -> Self {
        ZeroXPrefixedBytes { inner: b }
    }
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
                if &value[0..=1] != "0x" {
                    Err(serde::de::Error::custom(format!(
                        "string \"{value}\" does not have a '0x' prefix"
                    )))
                } else {
                    Ok(Bytes::from(
                        hex::decode(&value[2..])
                            .unwrap_or_else(|_| panic!("failed to decode hex string \"{value}\"")),
                    )
                    .into())
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
        serializer.serialize_str(&format!("0x{}", hex::encode(&self.inner)))
    }
}
