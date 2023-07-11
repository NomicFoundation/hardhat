/// an Ethereum JSON-RPC client
pub mod client;

mod eth;

/// data types specific to JSON-RPC but not specific to Ethereum.
pub mod jsonrpc;

/// RPC methods
pub mod methods;

/// helper utilities for use with serde's serialize_with and deserialize_with
pub mod serde_with_helpers;

mod withdrawal;

use bytes::Bytes;

use crate::{B256, U256};

pub use serde_with_helpers::serialize_u256;

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

/// for representing block specifications per EIP-1898
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum Eip1898BlockSpec {
    /// to represent the Object { blockHash, requireCanonical } in EIP-1898
    Hash {
        /// the block hash
        block_hash: B256,
        /// whether the server should additionally raise a JSON-RPC error if the block is not in
        /// the canonical chain
        require_canonical: Option<bool>,
    },
    /// to represent the Object { blockNumber } in EIP-1898
    Number {
        /// the block number
        block_number: U256,
    },
}

/// possible block tags as defined by the Ethereum JSON-RPC specification
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum BlockTag {
    /// earliest
    #[serde(rename = "earliest")]
    Earliest,
    /// latest
    #[serde(rename = "latest")]
    Latest,
    /// pending
    #[serde(rename = "pending")]
    Pending,
    /// safe
    #[serde(rename = "safe")]
    Safe,
    /// finalized
    #[serde(rename = "finalized")]
    Finalized,
}

/// For specifying a block
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum BlockSpec {
    /// as a block number
    #[serde(serialize_with = "serialize_u256")]
    Number(U256),
    /// as a block tag (eg "latest")
    Tag(BlockTag),
    /// as an EIP-1898-compliant block specifier
    Eip1898(Eip1898BlockSpec),
}

impl BlockSpec {
    /// Constructs a `BlockSpec` for the latest block.
    pub fn latest() -> Self {
        Self::Tag(BlockTag::Latest)
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

impl From<ZeroXPrefixedBytes> for Bytes {
    fn from(z: ZeroXPrefixedBytes) -> Self {
        z.inner
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
