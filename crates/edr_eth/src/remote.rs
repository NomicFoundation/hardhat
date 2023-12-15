mod cacheable_method_invocation;
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
mod r#override;
mod request_methods;

use std::{
    fmt,
    fmt::{Display, Formatter},
};

pub use self::{
    client::{RpcClient, RpcClientError},
    r#override::*,
};
use crate::B256;

/// for representing block specifications per EIP-1898
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum Eip1898BlockSpec {
    /// to represent the Object { blockHash, requireCanonical } in EIP-1898
    Hash {
        /// the block hash
        block_hash: B256,
        /// whether the server should additionally raise a JSON-RPC error if the
        /// block is not in the canonical chain
        require_canonical: Option<bool>,
    },
    /// to represent the Object { blockNumber } in EIP-1898
    Number {
        /// the block number
        #[serde(with = "crate::serde::u64")]
        block_number: u64,
    },
}

impl Display for Eip1898BlockSpec {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> Result<(), fmt::Error> {
        match self {
            Eip1898BlockSpec::Hash { block_hash, .. } => block_hash.fmt(formatter),
            Eip1898BlockSpec::Number { block_number } => block_number.fmt(formatter),
        }
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
    fn fmt(&self, formatter: &mut Formatter<'_>) -> Result<(), fmt::Error> {
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
    Number(#[serde(with = "crate::serde::u64")] u64),
    /// as a block tag (eg "latest")
    Tag(BlockTag),
    /// as an EIP-1898-compliant block specifier
    Eip1898(Eip1898BlockSpec),
}

macro_rules! impl_block_tags {
    ($type_name:ident) => {
        impl $type_name {
            /// Constructs an instance for the earliest block.
            #[must_use]
            pub fn earliest() -> Self {
                Self::Tag(BlockTag::Earliest)
            }

            /// Constructs an instance for the latest block.
            #[must_use]
            pub fn latest() -> Self {
                Self::Tag(BlockTag::Latest)
            }

            /// Constructs an instance for the pending block.
            #[must_use]
            pub fn pending() -> Self {
                Self::Tag(BlockTag::Pending)
            }

            /// Constructs an instance for the safe block.
            #[must_use]
            pub fn safe() -> Self {
                Self::Tag(BlockTag::Safe)
            }

            /// Constructs an instance for the finalized block.
            #[must_use]
            pub fn finalized() -> Self {
                Self::Tag(BlockTag::Finalized)
            }
        }
    };
}

impl_block_tags!(BlockSpec);

impl Display for BlockSpec {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> Result<(), fmt::Error> {
        match self {
            BlockSpec::Number(n) => n.fmt(formatter),
            BlockSpec::Tag(t) => t.fmt(formatter),
            BlockSpec::Eip1898(e) => e.fmt(formatter),
        }
    }
}

/// A block spec without EIP-1898 support.
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum PreEip1898BlockSpec {
    /// as a block number
    Number(#[serde(with = "crate::serde::u64")] u64),
    /// as a block tag (eg "latest")
    Tag(BlockTag),
}

impl From<PreEip1898BlockSpec> for BlockSpec {
    fn from(value: PreEip1898BlockSpec) -> Self {
        match value {
            PreEip1898BlockSpec::Number(block_number) => BlockSpec::Number(block_number),
            PreEip1898BlockSpec::Tag(block_tag) => BlockSpec::Tag(block_tag),
        }
    }
}

impl_block_tags!(PreEip1898BlockSpec);

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
        help_test_block_spec_serde(BlockSpec::Number(123));
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
            block_number: 1,
        }));
    }
}
