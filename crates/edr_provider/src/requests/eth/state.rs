use edr_eth::{
    remote::BlockSpec, serde::ZeroXPrefixedBytes, utils::u256_to_hex_word, Address, U256,
};
use serde::{Deserialize, Deserializer};

use crate::{data::ProviderData, ProviderError};

pub fn handle_get_balance_request(
    data: &ProviderData,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<U256, ProviderError> {
    data.balance(address, block_spec.as_ref())
}

pub fn handle_get_code_request(
    data: &ProviderData,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> Result<ZeroXPrefixedBytes, ProviderError> {
    data.get_code(address, block_spec.as_ref())
        .map(ZeroXPrefixedBytes::from)
}

pub fn handle_get_storage_at_request(
    data: &ProviderData,
    address: Address,
    index: U256,
    block_spec: Option<BlockSpec>,
) -> Result<String, ProviderError> {
    let storage = data.get_storage_at(address, index, block_spec.as_ref())?;
    Ok(u256_to_hex_word(&storage))
}

pub(crate) fn deserialize_storage_index<'de, D>(deserializer: D) -> Result<U256, D::Error>
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
}
