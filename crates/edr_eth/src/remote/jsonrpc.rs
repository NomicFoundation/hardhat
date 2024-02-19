// Parts of this code were adapted from github.com/koushiro/async-jsonrpc and
// are distributed under its licenses:
// - https://github.com/koushiro/async-jsonrpc/blob/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5/LICENSE-APACHE
// - https://github.com/koushiro/async-jsonrpc/blob/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5/LICENSE-MIT
// For the original context, see https://github.com/koushiro/async-jsonrpc/tree/9b42602f4faa63dd4b6a1a9fe359bffa97e636d5

use serde::{Deserialize, Serialize};

/// Represents a JSON-RPC error.
#[derive(thiserror::Error, Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[error("The response reported error `{code}`: `{message}`. (optional data: {data:?})")]
pub struct Error {
    /// error code
    pub code: i16,
    /// error message
    pub message: String,
    /// optional additional data
    pub data: Option<serde_json::Value>,
}

/// Represents a JSON-RPC 2.0 response.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Response<T> {
    /// A String specifying the version of the JSON-RPC protocol.
    pub jsonrpc: Version,
    //
    /// Correlation id.
    ///
    /// It **MUST** be the same as the value of the id member in the Request
    /// Object.
    pub id: Id,
    /// Response data.
    #[serde(flatten)]
    pub data: ResponseData<T>,
}

/// Represents JSON-RPC 2.0 success response.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ResponseData<T> {
    /// an error response
    Error {
        /// the error
        error: Error,
    },
    /// a success response
    Success {
        /// the result
        result: T,
    },
}

impl<T> ResponseData<T> {
    /// Returns a [`Result`] where `Success` is mapped to `Ok` and `Error` to
    /// `Err`.
    pub fn into_result(self) -> Result<T, Error> {
        match self {
            ResponseData::Success { result } => Ok(result),
            ResponseData::Error { error } => Err(error),
        }
    }

    /// convenience constructor for an error response
    pub fn new_error(code: i16, message: &str, data: Option<serde_json::Value>) -> Self {
        ResponseData::<T>::Error {
            error: Error {
                code,
                message: String::from(message),
                data,
            },
        }
    }
}

impl<SuccessT: Serialize, ErrorT: Into<Error>> From<Result<SuccessT, ErrorT>>
    for ResponseData<SuccessT>
{
    fn from(result: Result<SuccessT, ErrorT>) -> Self {
        match result {
            Ok(result) => ResponseData::Success { result },
            Err(error) => ResponseData::Error {
                error: error.into(),
            },
        }
    }
}

/// Represents JSON-RPC request/response id.
///
/// An identifier established by the Client that MUST contain a String, Number,
/// or NULL value if included, If it is not included it is assumed to be a
/// notification. The value SHOULD normally not be Null and Numbers SHOULD NOT
/// contain fractional parts.
///
/// The Server **MUST** reply with the same value in the Response object if
/// included. This member is used to correlate the context between the two
/// objects.
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize)]
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
