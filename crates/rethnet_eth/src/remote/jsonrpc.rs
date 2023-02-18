// Parts of this code were adapted from github.com/koushiro/async-jsonrpc and are distributed under its
// licenses:
// - https://github.com/koushiro/async-jsonrpc/blob/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5/LICENSE-APACHE
// - https://github.com/koushiro/async-jsonrpc/blob/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5/LICENSE-MIT
// For the original context, see https://github.com/koushiro/async-jsonrpc/tree/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5

use serde::{Deserialize, Serialize};

/// Represents JSON-RPC 2.0 success response.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Success<T = serde_json::Value> {
    /// A String specifying the version of the JSON-RPC protocol.
    pub jsonrpc: Version,
    /// Successful execution result.
    pub result: T,
    /// Correlation id.
    ///
    /// It **MUST** be the same as the value of the id member in the Request Object.
    pub id: Id,
}

/// Represents JSON-RPC request/response id.
///
/// An identifier established by the Client that MUST contain a String, Number,
/// or NULL value if included, If it is not included it is assumed to be a notification.
/// The value SHOULD normally not be Null and Numbers SHOULD NOT contain fractional parts.
///
/// The Server **MUST** reply with the same value in the Response object if included.
/// This member is used to correlate the context between the two objects.
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[serde(untagged)]
pub enum Id {
    /// Numeric id
    Num(u64),
    /// String id
    Str(String),
}
/// Represents JSON-RPC protocol version.
#[derive(Copy, Clone, Debug, Eq, PartialEq, Hash)]
pub enum Version {
    /// Represents JSON-RPC 2.0 version.
    V2_0,
}

impl Serialize for Version {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Version::V2_0 => serializer.serialize_str("2.0"),
        }
    }
}

impl<'a> Deserialize<'a> for Version {
    fn deserialize<D>(deserializer: D) -> Result<Version, D::Error>
    where
        D: serde::Deserializer<'a>,
    {
        deserializer.deserialize_identifier(VersionVisitor)
    }
}

struct VersionVisitor;
impl<'a> serde::de::Visitor<'a> for VersionVisitor {
    type Value = Version;

    fn expecting(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        formatter.write_str("a string")
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        match value {
            "2.0" => Ok(Version::V2_0),
            _ => Err(serde::de::Error::custom(
                "Invalid JSON-RPC protocol version",
            )),
        }
    }
}

pub struct ZeroXPrefixedBytes {
    pub bytes: bytes::Bytes,
}

impl<'a> Deserialize<'a> for ZeroXPrefixedBytes {
    fn deserialize<D>(deserializer: D) -> Result<ZeroXPrefixedBytes, D::Error>
    where
        D: serde::Deserializer<'a>,
    {
        deserializer.deserialize_identifier(ZeroXPrefixedBytesVisitor)
    }
}

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
                bytes: bytes::Bytes::from(
                    hex::decode(value[2..].to_string()).expect("failed to decode hex string"),
                ),
            })
        }
    }
}
