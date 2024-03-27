use core::fmt::Debug;
use std::{
    ops::{Deref, DerefMut},
    str::FromStr,
};

use edr_eth::{Address, Bytes, U256, U64};
use serde::{Deserialize, Deserializer, Serialize};

use crate::ProviderError;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[repr(transparent)]
pub struct RpcAddress(#[serde(deserialize_with = "deserialize_address")] pub Address);

impl Deref for RpcAddress {
    type Target = Address;

    #[inline]
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for RpcAddress {
    #[inline]
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl From<Address> for RpcAddress {
    fn from(address: Address) -> Self {
        Self(address)
    }
}

const STORAGE_KEY_TOO_LARGE_ERROR_MESSAGE: &str =
    "Storage key must not be greater than or equal to 2^256.";
const STORAGE_VALUE_INVALID_LENGTH_ERROR_MESSAGE: &str =
    "Storage value must be exactly 32 bytes long.";
const UNSUPPORTED_METHOD: &str = "unknown variant";

pub enum InvalidRequestReason<'a> {
    UnsupportedMethod {
        method_name: &'a str,
    },
    InvalidStorageKey {
        method_name: &'a str,
        error_message: &'a str,
    },
    InvalidStorageValue {
        method_name: &'a str,
        error_message: &'a str,
    },
    InvalidJson {
        error_message: &'a str,
    },
}

impl<'a> InvalidRequestReason<'a> {
    pub fn new(json_request: &'a str, error_message: &'a str) -> Self {
        if let Ok(request) = serde_json::from_str::<RequestWithMethod<'a>>(json_request) {
            if error_message.starts_with(STORAGE_KEY_TOO_LARGE_ERROR_MESSAGE) {
                return InvalidRequestReason::InvalidStorageKey {
                    method_name: request.method,
                    error_message,
                };
            } else if error_message.starts_with(STORAGE_VALUE_INVALID_LENGTH_ERROR_MESSAGE) {
                return InvalidRequestReason::InvalidStorageValue {
                    method_name: request.method,
                    error_message,
                };
            } else if error_message.starts_with(UNSUPPORTED_METHOD) {
                return InvalidRequestReason::UnsupportedMethod {
                    method_name: request.method,
                };
            }
        }

        InvalidRequestReason::InvalidJson { error_message }
    }

    pub fn error_code(&self) -> i16 {
        match self {
            InvalidRequestReason::UnsupportedMethod { .. } => -32004,
            InvalidRequestReason::InvalidStorageKey { .. }
            | InvalidRequestReason::InvalidStorageValue { .. } => -32000,
            InvalidRequestReason::InvalidJson { .. } => -32602,
        }
    }

    pub fn error_message(&self) -> String {
        match self {
            InvalidRequestReason::UnsupportedMethod { method_name } => {
                format!("Method {method_name} is not supported")
            }
            InvalidRequestReason::InvalidStorageKey { error_message, .. }
            | InvalidRequestReason::InvalidStorageValue { error_message, .. }
            | InvalidRequestReason::InvalidJson { error_message } => (*error_message).into(),
        }
    }

    /// Converts the invalid request reason into a provider error.
    pub fn provider_error<LoggerErrorT: Debug>(
        &self,
    ) -> Option<(String, ProviderError<LoggerErrorT>)> {
        match self {
            InvalidRequestReason::InvalidJson { .. } => None,
            InvalidRequestReason::InvalidStorageKey {
                error_message,
                method_name,
            }
            | InvalidRequestReason::InvalidStorageValue {
                error_message,
                method_name,
            } => Some((
                (*method_name).to_string(),
                ProviderError::InvalidInput((*error_message).to_string()),
            )),
            InvalidRequestReason::UnsupportedMethod { method_name } => Some((
                (*method_name).to_string(),
                ProviderError::UnsupportedMethod {
                    method_name: (*method_name).to_string(),
                },
            )),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
struct RequestWithMethod<'a> {
    method: &'a str,
}

/// Helper function for deserializing the JSON-RPC address type.
pub(crate) fn deserialize_address<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<Address, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|error| {
        if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "This method only supports strings but input was: {value}"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize address argument into string with error: '{error}'"
            ))
        }
    })?;

    let error_message =
        || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : ADDRESS"));

    if !value.starts_with("0x") {
        return Err(error_message());
    }

    if value.len() != 42 {
        return Err(error_message());
    }

    Address::from_str(&value).map_err(|_error| error_message())
}

/// Helper function for deserializing the JSON-RPC data type.
pub(crate) fn deserialize_data<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<Bytes, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|error| {
        if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "This method only supports strings but input was: {value}"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize data argument into string with error: '{error}'"
            ))
        }
    })?;

    let error_message =
        || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : DATA"));

    if !value.starts_with("0x") {
        return Err(error_message());
    }

    Bytes::from_str(&value).map_err(|_error| error_message())
}

/// Helper function for deserializing the JSON-RPC quantity type.
pub(crate) fn deserialize_quantity<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<U256, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|error| {
        if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "This method only supports strings but input was: {value}"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize quantity argument into string with error: '{error}'"
            ))
        }
    })?;

    let error_message =
        || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : QUANTITY"));

    if !value.starts_with("0x") {
        return Err(error_message());
    }

    U256::from_str(&value).map_err(|_error| error_message())
}

/// Helper function for deserializing the JSON-RPC quantity type, specialized
/// for `u64` nonces.
pub(crate) fn deserialize_nonce<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<u64, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|error| {
        if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "This method only supports strings but input was: {value}"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize quantity argument into string with error: '{error}'"
            ))
        }
    })?;

    let error_message =
        || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : QUANTITY"));

    if !value.starts_with("0x") {
        return Err(error_message());
    }

    if value.len() > 18 {
        return Err(serde::de::Error::custom(format!(
            "Nonce must not be greater than or equal to 2^64. Received {value}"
        )));
    }

    U64::from_str(&value).map_or_else(
        |_error| Err(error_message()),
        |value| Ok(value.as_limbs()[0]),
    )
}

/// Helper function for deserializing the JSON-RPC quantity type, specialized
/// for a storage key.
pub(crate) fn deserialize_storage_key<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<U256, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|error| {
        if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "This method only supports strings but input was: {value}"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize quantity argument into string with error: '{error}'"
            ))
        }
    })?;

    let error_message =
        || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : QUANTITY"));

    if !value.starts_with("0x") {
        return Err(error_message());
    }

    if value.len() > 66 {
        return Err(serde::de::Error::custom(format!(
            "{STORAGE_KEY_TOO_LARGE_ERROR_MESSAGE} Received {value}."
        )));
    }

    U256::from_str(&value).map_err(|_error| error_message())
}

/// Helper function for deserializing the JSON-RPC storage slot type.
pub(crate) fn deserialize_storage_slot<'de, D>(deserializer: D) -> Result<U256, D::Error>
where
    D: Deserializer<'de>,
{
    let value = String::deserialize(deserializer).map_err(|err| {
        if let Some(value) = extract_value_from_serde_json_error(err.to_string().as_str()) {
            serde::de::Error::custom(format!(
                "Storage slot argument must be a string, got '{value}'"
            ))
        } else {
            serde::de::Error::custom(format!(
                "Failed to deserialize storage slot argument into string with error: '{err}'"
            ))
        }
    })?;

    if value.is_empty() {
        return Err(serde::de::Error::custom(
            "Storage slot argument cannot be an empty string".to_string(),
        ));
    }

    let is_zero_x_prefixed = value.starts_with("0x");
    let expected_length = 2 * 32 + if is_zero_x_prefixed { 2 } else { 0 };

    if value.len() > expected_length {
        let explanation = if is_zero_x_prefixed {
            "(\"0x\" + 32 bytes)"
        } else {
            "(32 bytes)"
        };
        return Err(serde::de::Error::custom(format!(
            "Storage slot argument must have a length of at most {expected_length} {explanation}, but '{value}' has a length of {}'",
            value.len()
        )));
    }

    let result = if is_zero_x_prefixed {
        U256::from_str_radix(&value[2..], 16).map_err(|_err| invalid_hex::<D>(&value))?
    } else {
        U256::from_str_radix(&value, 16).map_err(|_err| invalid_hex::<D>(&value))?
    };

    Ok(result)
}

/// Helper module for serializing/deserializing the JSON-RPC data type,
/// specialized for a storage value.
pub(crate) mod storage_value {
    use serde::Serializer;

    use super::{
        extract_value_from_serde_json_error, Deserialize, Deserializer, FromStr,
        STORAGE_VALUE_INVALID_LENGTH_ERROR_MESSAGE, U256,
    };

    /// Helper function for deserializing the JSON-RPC data type, specialized
    /// for a storage value.
    pub fn deserialize<'de, DeserializerT>(
        deserializer: DeserializerT,
    ) -> Result<U256, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer).map_err(|error| {
            if let Some(value) = extract_value_from_serde_json_error(error.to_string().as_str()) {
                serde::de::Error::custom(format!(
                    "This method only supports strings but input was: {value}"
                ))
            } else {
                serde::de::Error::custom(format!(
                    "Failed to deserialize quantity argument into string with error: '{error}'"
                ))
            }
        })?;

        let error_message =
            || serde::de::Error::custom(format!("invalid value \"{value}\" supplied to : DATA"));

        if !value.starts_with("0x") {
            return Err(error_message());
        }

        // Remove 2 characters for the "0x" prefix and divide by 2 because each byte is
        // represented by 2 hex characters.
        let length = (value.len() - 2) / 2;
        if length != 32 {
            return Err(serde::de::Error::custom(format!(
            "{STORAGE_VALUE_INVALID_LENGTH_ERROR_MESSAGE} Received {value}, which is {length} bytes long."
        )));
        }

        U256::from_str(&value).map_err(|_error| error_message())
    }

    /// Serialize U256 with padding to make sure it's accepted by
    /// `deserialize_storage_value` which expects padded values (as opposed to
    /// the Ethereum JSON-RPC spec which expects values without padding).
    pub fn serialize<SerializerT>(
        value: &U256,
        serializer: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
    {
        let padded = format!("0x{value:0>64x}");
        serializer.serialize_str(&padded)
    }
}

/// Helper module for deserializing the payload of an `eth_signTypedData_v4`
/// request. The types and the deserializer implementation are a patched version
/// of [`ethers_core`](https://github.com/gakonst/ethers-rs/blob/5394d899adca736a602e316e6f0c06fdb5aa64b9/ethers-core/src/types/transaction/eip712.rs)
/// in order to support hex strings for the salt parameter.
/// `ethers_core` is copyright (c) 2020 Georgios Konstantopoulos and is licensed
/// under the MIT License.
pub(crate) mod typed_data {
    use std::collections::BTreeMap;

    use edr_eth::Bytes;
    use ethers_core::types::transaction::eip712::{EIP712Domain, TypedData, Types};
    use serde::{Deserialize, Deserializer};

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct PatchedEIP712Domain {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        name: Option<String>,

        #[serde(default, skip_serializing_if = "Option::is_none")]
        version: Option<String>,

        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            deserialize_with = "ethers_core::types::serde_helpers::deserialize_stringified_numeric_opt"
        )]
        chain_id: Option<ethers_core::types::U256>,

        #[serde(default, skip_serializing_if = "Option::is_none")]
        verifying_contract: Option<ethers_core::types::Address>,

        // Changed salt from `[u8; 32]` to `Bytes` to support hex strings.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        salt: Option<Bytes>,
    }

    #[derive(Debug, thiserror::Error)]
    #[error("The salt parameter must be exactly 32 bytes long.")]
    struct InvalidSaltError;

    impl TryFrom<PatchedEIP712Domain> for EIP712Domain {
        type Error = InvalidSaltError;

        fn try_from(value: PatchedEIP712Domain) -> Result<Self, Self::Error> {
            let PatchedEIP712Domain {
                name,
                version,
                chain_id,
                verifying_contract,
                salt,
            } = value;

            let salt: Option<[u8; 32]> = salt
                .map(|bytes| {
                    let vec: Vec<u8> = bytes.into();
                    vec.try_into().map_err(|_error| InvalidSaltError {})
                })
                .transpose()?;

            Ok(EIP712Domain {
                name,
                version,
                chain_id,
                verifying_contract,
                salt,
            })
        }
    }

    #[derive(Deserialize)]
    struct TypedDataHelper {
        domain: PatchedEIP712Domain,
        types: Types,
        #[serde(rename = "primaryType")]
        primary_type: String,
        message: BTreeMap<String, serde_json::Value>,
    }

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Type {
        Val(TypedDataHelper),
        String(String),
    }

    fn invalid_json_error<'de, DeserializerT: Deserializer<'de>>(
        _error: impl std::error::Error,
    ) -> DeserializerT::Error {
        serde::de::Error::custom("The message parameter is an invalid JSON.".to_string())
    }

    /// Helper function for deserializing the payload of an
    /// `eth_signTypedData_v4` request.
    pub(crate) fn deserialize<'de, DeserializerT>(
        deserializer: DeserializerT,
    ) -> Result<TypedData, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        match Type::deserialize(deserializer).map_err(invalid_json_error::<'de, DeserializerT>)? {
            Type::Val(v) => {
                let TypedDataHelper {
                    domain,
                    types,
                    primary_type,
                    message,
                } = v;
                Ok(TypedData {
                    domain: domain.try_into().map_err(serde::de::Error::custom)?,
                    types,
                    primary_type,
                    message,
                })
            }
            Type::String(s) => {
                let TypedDataHelper {
                    domain,
                    types,
                    primary_type,
                    message,
                } = serde_json::from_str(&s).map_err(invalid_json_error::<'de, DeserializerT>)?;
                Ok(TypedData {
                    domain: domain.try_into().map_err(serde::de::Error::custom)?,
                    types,
                    primary_type,
                    message,
                })
            }
        }
    }
}

fn invalid_hex<'de, D>(value: &str) -> D::Error
where
    D: Deserializer<'de>,
{
    serde::de::Error::custom(format!(
        "Storage slot argument must be a valid hexadecimal, got '{value}'"
    ))
}

fn extract_value_from_serde_json_error(error_message: &str) -> Option<&str> {
    let start = error_message.find('`')?;
    let end = error_message.rfind('`')?;
    if start < end {
        Some(&error_message[start + 1..end])
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_value_from_error_message() {
        assert_eq!(
            extract_value_from_serde_json_error("invalid type: integer `0`, expected a string"),
            Some("0"),
        );
        assert_eq!(extract_value_from_serde_json_error(""), None);
        assert_eq!(extract_value_from_serde_json_error("`"), None);
        assert_eq!(extract_value_from_serde_json_error("``"), Some(""));
        assert_eq!(
            extract_value_from_serde_json_error("foo`bar`baz"),
            Some("bar")
        );
        assert_eq!(extract_value_from_serde_json_error("`foobarbaz"), None);
        assert_eq!(extract_value_from_serde_json_error("foobarbaz`"), None);
        assert_eq!(extract_value_from_serde_json_error("foo`barbaz"), None);
    }

    #[test]
    fn deserialize_too_large_nonce() {
        let json = r#""0xffffffffffffffffff""#;

        let mut deserializer = serde_json::Deserializer::from_str(json);
        let error = deserialize_nonce(&mut deserializer)
            .unwrap_err()
            .to_string();

        assert!(
            error.contains("Nonce must not be greater than or equal to 2^64."),
            "actual: {error}"
        );
    }

    #[test]
    fn serialize_storage_value_round_trip() {
        #[derive(Serialize, Deserialize)]
        struct Test {
            #[serde(with = "storage_value")]
            n: U256,
        }

        let u256_json = r#""0x313f922be1649cec058ec0f076664500c78bdc0b""#;
        let n: U256 = serde_json::from_str(u256_json).unwrap();

        let test = Test { n };

        let json = serde_json::to_string(&test).unwrap();
        assert!(json.contains("0x000000000000000000000000313f922be1649cec058ec0f076664500c78bdc0b"));

        let parsed = serde_json::from_str::<Test>(&json).unwrap();

        assert_eq!(parsed.n, n);
    }
}
