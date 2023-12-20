mod cacheable_method_invocation;
/// an Ethereum JSON-RPC client
pub mod client;
/// ethereum objects as specifically used in the JSON-RPC interface
pub mod eth;
/// data types for use with filter-based RPC methods
pub mod filter;
/// data types specific to JSON-RPC but not specific to Ethereum.
pub mod jsonrpc;
mod r#override;
mod request_methods;

use std::{
    borrow::Cow,
    fmt,
    fmt::{Display, Formatter},
};

use serde::de;

pub use self::{
    client::{RpcClient, RpcClientError},
    r#override::*,
};
use crate::{B256, U64};

const BLOCK_HASH_FIELD: &str = "blockHash";
const REQUIRE_CANONICAL_FIELD: &str = "requireCanonical";
const BLOCK_NUMBER_FIELD: &str = "blockNumber";

/// for representing block specifications per EIP-1898
#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(untagged)]
pub enum Eip1898BlockSpec {
    /// to represent the Object { blockHash, requireCanonical } in EIP-1898
    #[serde(rename_all = "camelCase")]
    Hash {
        /// the block hash
        block_hash: B256,
        /// whether the server should additionally raise a JSON-RPC error if the
        /// block is not in the canonical chain
        #[serde(skip_serializing_if = "Option::is_none")]
        require_canonical: Option<bool>,
    },
    /// to represent the Object { blockNumber } in EIP-1898
    #[serde(rename_all = "camelCase")]
    Number {
        /// the block number
        #[serde(serialize_with = "crate::serde::u64::serialize")]
        block_number: u64,
    },
}

// We are not using a derived implementation for untagged enums, because we want
// to be able to error on invalid combinations of fields
impl<'de> serde::Deserialize<'de> for Eip1898BlockSpec {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(serde::Deserialize)]
        #[serde(field_identifier, rename_all = "camelCase")]
        enum Field {
            BlockHash,
            RequireCanonical,
            BlockNumber,
        }

        // https://serde.rs/deserialize-struct.html
        struct Eip1898BlockSpecVisitor;
        impl<'de> de::Visitor<'de> for Eip1898BlockSpecVisitor {
            type Value = Eip1898BlockSpec;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("EIP-1898 block spec")
            }

            fn visit_map<M>(self, mut map: M) -> Result<Eip1898BlockSpec, M::Error>
            where
                M: de::MapAccess<'de>,
            {
                let mut block_hash = None;
                let mut block_number: Option<Cow<'de, str>> = None;
                let mut require_canonical = None;
                while let Some(key) = map.next_key()? {
                    match key {
                        Field::BlockHash => {
                            if block_hash.is_some() {
                                return Err(de::Error::duplicate_field(BLOCK_HASH_FIELD));
                            }
                            block_hash = Some(map.next_value()?);
                        }
                        Field::RequireCanonical => {
                            if require_canonical.is_some() {
                                return Err(de::Error::duplicate_field(REQUIRE_CANONICAL_FIELD));
                            }
                            require_canonical = Some(map.next_value()?);
                        }
                        Field::BlockNumber => {
                            if block_number.is_some() {
                                return Err(de::Error::duplicate_field(BLOCK_NUMBER_FIELD));
                            }
                            block_number = Some(map.next_value()?);
                        }
                    }
                }

                if block_hash.is_some() && block_number.is_some() {
                    return Err(de::Error::custom(format!(
                        "EIP-1898 block spec cannot have both `{BLOCK_HASH_FIELD}` and `{BLOCK_NUMBER_FIELD}`",
                    )));
                }

                if block_number.is_some() && require_canonical.is_some() {
                    return Err(de::Error::custom(format!(
                        "EIP-1898 block spec cannot have both `{BLOCK_NUMBER_FIELD}` and `{REQUIRE_CANONICAL_FIELD}`",
                    )));
                }

                if let Some(block_hash) = block_hash {
                    Ok(Eip1898BlockSpec::Hash {
                        block_hash,
                        require_canonical,
                    })
                } else if let Some(block_number) = block_number {
                    let block_number: U64 = de::Deserialize::deserialize(
                        de::value::CowStrDeserializer::new(block_number),
                    )?;
                    Ok(Eip1898BlockSpec::Number {
                        block_number: block_number.try_into().expect("U64 fits into u64"),
                    })
                } else {
                    Err(de::Error::custom("Invalid EIP-1898 block spec"))
                }
            }
        }

        const FIELDS: &[&str] = &[
            BLOCK_HASH_FIELD,
            REQUIRE_CANONICAL_FIELD,
            BLOCK_NUMBER_FIELD,
        ];
        deserializer.deserialize_struct("Eip1898BlockSpec", FIELDS, Eip1898BlockSpecVisitor)
    }
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
#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(untagged)]
pub enum BlockSpec {
    /// as a block number
    Number(#[serde(serialize_with = "crate::serde::u64::serialize")] u64),
    /// as a block tag (eg "latest")
    Tag(BlockTag),
    /// as an EIP-1898-compliant block specifier
    Eip1898(Eip1898BlockSpec),
}

// We are not using a derived implementation for untagged enums, because we want
// to propagate custom error messages from the `Eip1898BlockSpec` deserializer.
impl<'de> de::Deserialize<'de> for BlockSpec {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: de::Deserializer<'de>,
    {
        struct BlockSpecVisitor;

        impl<'de> de::Visitor<'de> for BlockSpecVisitor {
            type Value = BlockSpec;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a block specifier")
            }

            fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                let result = if v.starts_with("0x") {
                    let number: U64 =
                        de::Deserialize::deserialize(de::value::StrDeserializer::new(v))?;
                    BlockSpec::Number(number.try_into().expect("U64 fits into u64"))
                } else {
                    // Forward to deserializer of `BlockTag`
                    BlockSpec::Tag(de::Deserialize::deserialize(
                        de::value::StrDeserializer::new(v),
                    )?)
                };
                Ok(result)
            }

            fn visit_map<M>(self, map: M) -> Result<BlockSpec, M::Error>
            where
                M: de::MapAccess<'de>,
            {
                // Forward to deserializer of `Eip1898BlockSpec`
                Ok(BlockSpec::Eip1898(de::Deserialize::deserialize(
                    de::value::MapAccessDeserializer::new(map),
                )?))
            }
        }

        deserializer.deserialize_any(BlockSpecVisitor)
    }
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
    use serde_json::json;

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
        help_test_block_spec_serde(BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
            block_hash: B256::from_low_u64_ne(1),
            require_canonical: None,
        }));
        help_test_block_spec_serde(BlockSpec::Eip1898(Eip1898BlockSpec::Number {
            block_number: 1,
        }));
    }

    #[test]
    fn test_eip_1898_block_number_serialization() {
        let block_spec = Eip1898BlockSpec::Number { block_number: 1 };
        let serialize = serde_json::to_string(&block_spec).unwrap();
        assert!(serialize.contains("0x1"));
    }

    #[test]
    fn test_eip_1898_block_hash_serialization_skips_canonical_none() {
        let block_spec = Eip1898BlockSpec::Hash {
            block_hash: B256::from_low_u64_ne(1),
            require_canonical: None,
        };
        let serialize = serde_json::to_string(&block_spec).unwrap();
        assert!(!serialize.contains("requireCanonical"));
    }

    #[test]
    fn test_block_spec_eip_1898_block_number_deserialization() {
        // Owned value
        let value = json!({"blockNumber": "0x1"});
        let block_spec: BlockSpec = serde_json::from_value(value).unwrap();
        assert!(matches!(
            block_spec,
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number: 1 })
        ));
    }

    #[test]
    fn test_block_spec_eip_1898_block_number_from_str_deserialization() {
        let value = r#"{"blockNumber": "0x1"}"#;
        // Check that the deserializer works for references as well (serde_json::Value
        // is owned).
        let block_spec: BlockSpec = serde_json::from_str(value).unwrap();
        assert!(matches!(
            block_spec,
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number: 1 })
        ));
    }

    #[test]
    fn test_block_spec_eip_1898_block_hash_deserialization() {
        let value = json!({
            "blockHash": "0xa3294400ca7d8dc2c1a9120b2178718700fd2a0f58d59c518cc25767524fe0f2"
        });
        let block_spec: BlockSpec = serde_json::from_value(value).unwrap();
        assert!(matches!(
            block_spec,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash: _,
                require_canonical: None
            })
        ));
    }

    #[test]
    fn test_block_spec_eip_1898_block_hash_canonical_deserialization() {
        let value = json!({
            "blockHash": "0xa3294400ca7d8dc2c1a9120b2178718700fd2a0f58d59c518cc25767524fe0f2",
            "requireCanonical": true
        });
        let block_spec: BlockSpec = serde_json::from_value(value).unwrap();
        assert!(matches!(
            block_spec,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash: _,
                require_canonical: Some(true)
            })
        ));
    }

    #[test]
    fn test_block_spec_eip_1898_block_number_and_hash_deserialization_error() {
        let value = json!({
            "blockNumber": "0x0",
            "blockHash": "0xa3294400ca7d8dc2c1a9120b2178718700fd2a0f58d59c518cc25767524fe0f2"
        });
        let error_message = serde_json::from_value::<BlockSpec>(value)
            .err()
            .unwrap()
            .to_string();
        assert_eq!(
            error_message,
            "EIP-1898 block spec cannot have both `blockHash` and `blockNumber`"
        );
    }

    #[test]
    fn test_block_spec_eip_1898_block_number_and_canonical_deserialization_error() {
        let value = json!({
            "blockNumber": "0x0",
            "requireCanonical": true
        });
        let error_message = serde_json::from_value::<BlockSpec>(value)
            .err()
            .unwrap()
            .to_string();
        assert_eq!(
            error_message,
            "EIP-1898 block spec cannot have both `blockNumber` and `requireCanonical`"
        );
    }
}
