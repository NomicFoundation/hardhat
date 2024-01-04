use std::str::FromStr;

use edr_eth::{Address, Bytes, U256, U64};
use serde::{Deserialize, Deserializer};

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
            "Storage key must not be greater than or equal to 2^256. Received {value}."
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

/// Helper function for deserializing the JSON-RPC data type, specialized
/// for a storage value.
pub(crate) fn deserialize_storage_value<'de, DeserializerT>(
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
            "Storage value must be exactly 32 bytes long. Received {value}, which is {length} bytes long."
        )));
    }

    U256::from_str(&value).map_err(|_error| error_message())
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
}
