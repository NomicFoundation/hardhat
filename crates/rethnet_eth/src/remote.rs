use std::fmt;
use std::fmt::{Display, Formatter};

/// an Ethereum JSON-RPC client
pub mod client;

/// ethereum objects as specifically used in the JSON-RPC interface
pub mod eth;

/// data types for use with filter-based RPC methods
pub mod filter;

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

impl Display for Eip1898BlockSpec {
    fn fmt(&self, formatter: &mut Formatter) -> Result<(), fmt::Error> {
        formatter.write_str(&serde_json::to_string(self).map_err(|_| fmt::Error)?)
    }
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

impl Display for BlockTag {
    fn fmt(&self, formatter: &mut Formatter) -> Result<(), fmt::Error> {
        formatter.write_str(match self {
            BlockTag::Earliest => "earliest",
            BlockTag::Latest => "latest",
            BlockTag::Pending => "pending",
            BlockTag::Safe => "safe",
            BlockTag::Finalized => "finalized",
        })
    }
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
    /// Constructs an instance for the earliest block.
    pub fn earliest() -> Self {
        Self::Tag(BlockTag::Earliest)
    }

    /// Constructs an instance for the latest block.
    pub fn latest() -> Self {
        Self::Tag(BlockTag::Latest)
    }

    /// Constructs an instance for the pending block.
    pub fn pending() -> Self {
        Self::Tag(BlockTag::Pending)
    }

    /// Constructs an instance for the safe block.
    pub fn safe() -> Self {
        Self::Tag(BlockTag::Safe)
    }

    /// Constructs an instance for the finalized block.
    pub fn finalized() -> Self {
        Self::Tag(BlockTag::Finalized)
    }
}

impl Display for BlockSpec {
    fn fmt(&self, formatter: &mut Formatter) -> Result<(), fmt::Error> {
        match self {
            BlockSpec::Number(n) => n.fmt(formatter),
            BlockSpec::Tag(t) => t.fmt(formatter),
            BlockSpec::Eip1898(e) => e.fmt(formatter),
        }
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
        let encoded = hex::encode(&self.inner);
        serializer.serialize_str(&format!(
            "0x{}",
            match encoded.as_str() {
                "00" => "",
                other => other,
            }
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn help_test_block_spec_serde(block_spec: BlockSpec) {
        let json = serde_json::json!(block_spec).to_string();
        let block_spec_decoded: BlockSpec = serde_json::from_str(&json)
            .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
        assert_eq!(block_spec, block_spec_decoded);
    }

    #[test]
    fn test_serde_block_spec() {
        help_test_block_spec_serde(BlockSpec::Number(U256::from(123)));
        help_test_block_spec_serde(BlockSpec::Tag(BlockTag::Earliest));
        help_test_block_spec_serde(BlockSpec::Tag(BlockTag::Finalized));
        help_test_block_spec_serde(BlockSpec::Tag(BlockTag::Latest));
        help_test_block_spec_serde(BlockSpec::Tag(BlockTag::Pending));
        help_test_block_spec_serde(BlockSpec::Tag(BlockTag::Safe));
        help_test_block_spec_serde(BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
            block_hash: B256::from_low_u64_ne(1),
            require_canonical: Some(true),
        }));
        help_test_block_spec_serde(BlockSpec::Eip1898(Eip1898BlockSpec::Number {
            block_number: U256::from(1),
        }));
    }
}
