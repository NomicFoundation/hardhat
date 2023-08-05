//! Helper utilities for serde

use std::{fmt::Write, ops::Deref};

use crate::U256;

/// Type that serializes a [`U256`] without leading zeroes.
#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct U256WithoutLeadingZeroes(#[serde(serialize_with = "u256::serialize")] U256);

impl Deref for U256WithoutLeadingZeroes {
    type Target = U256;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<U256> for U256WithoutLeadingZeroes {
    fn from(value: U256) -> Self {
        Self(value)
    }
}

/// Type that serializes a [`U256`] without leading zeroes.
#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct U64WithoutLeadingZeroes(#[serde(serialize_with = "u64::serialize")] u64);

impl Deref for U64WithoutLeadingZeroes {
    type Target = u64;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl From<u64> for U64WithoutLeadingZeroes {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

/// for use with serde's `serialize_with` on a single value that should be serialized as a
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

/// for use with serde's `deserialize_with` on a sequence that should be deserialized as a
/// single value
pub fn sequence_to_single<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de> + Clone,
{
    let s: Vec<T> = serde::de::Deserialize::deserialize(deserializer)?;
    Ok(s[0].clone())
}

/// Helper function for serializing the little-endian bytes of an unsigned integer into a hexadecimal string.
fn serialize_uint_bytes_without_leading_zeroes<S, T>(le_bytes: T, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: AsRef<[u8]>,
{
    let le_bytes = le_bytes.as_ref();
    let mut bytes = le_bytes.iter().rev().skip_while(|b| **b == 0);

    // We avoid String allocation if there is no non-0 byte
    // If there is a first byte, we allocate a string, and write the prefix
    // and first byte to it
    let mut result = match bytes.next() {
        Some(b) => {
            let mut result = String::with_capacity(2 + 8 * 2);
            write!(result, "0x{b:x}").unwrap();
            result
        }
        None => return s.serialize_str("0x0"),
    };
    bytes
        .try_for_each(|byte| write!(result, "{byte:02x}"))
        .unwrap();

    s.serialize_str(&result)
}

/// Helper module for (de)serializing [`U256`]s into hexadecimal strings. This is necessary because
/// the default [`U256`] serialization includes leading zeroes.
pub mod u256 {
    use revm_primitives::U256;

    /// Helper function for serializing a [`U256`] into a hexadecimal string.
    pub fn serialize<S>(value: &U256, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if *value == U256::ZERO {
            return s.serialize_str("0x0");
        }

        super::serialize_uint_bytes_without_leading_zeroes(value.to_le_bytes::<32>(), s)
    }
}

/// Helper module for (de)serializing [`std::primitive::u64`]s into hexadecimal strings.
pub mod u64 {
    /// Helper function for deserializing a hexadecimal string into a [`std::primitive::u64`].
    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"))
    }

    /// Helper function for serializing a [`std::primitive::u64`] into a hexadecimal string.
    pub fn serialize<S>(value: &u64, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if *value == 0 {
            return s.serialize_str("0x0");
        }

        super::serialize_uint_bytes_without_leading_zeroes(value.to_le_bytes(), s)
    }
}

/// Helper module for (de)serializing [`std::primitive::u8`]s into hexadecimal strings.
pub mod u8 {
    /// Helper function for deserializing a hexadecimal string into a [`std::primitive::u8`].
    pub fn deserialize<'de, D>(deserializer: D) -> Result<u8, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(u8::from_str_radix(&s[2..], 16).expect("failed to parse u8"))
    }

    /// Helper function for serializing a [`std::primitive::u8`] into a hexadecimal string.
    pub fn serialize<S>(value: &u8, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if *value == 0 {
            return s.serialize_str("0x0");
        }

        super::serialize_uint_bytes_without_leading_zeroes(value.to_le_bytes(), s)
    }
}

/// Helper function for deserializing a'n optional hexadecimal string into a [`std::primitive::u64`].
pub fn optional_u64_from_hex<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<&str> = serde::Deserialize::deserialize(deserializer)?;
    Ok(s.map(|s| u64::from_str_radix(&s[2..], 16).expect("failed to parse u64")))
}
