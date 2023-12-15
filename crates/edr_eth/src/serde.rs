//! Helper utilities for serde

use std::ops::Deref;

use revm_primitives::bytes::Bytes;
use serde::{
    de::DeserializeOwned, ser::SerializeSeq, Deserialize, Deserializer, Serialize, Serializer,
};

/// Type for specifying a byte string that will have a 0x prefix when serialized
/// and deserialized
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ZeroXPrefixedBytes {
    inner: Bytes,
}

impl Deref for ZeroXPrefixedBytes {
    type Target = Bytes;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
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

impl<'a> Deserialize<'a> for ZeroXPrefixedBytes {
    fn deserialize<D>(deserializer: D) -> Result<ZeroXPrefixedBytes, D::Error>
    where
        D: Deserializer<'a>,
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
                if &value[0..=1] == "0x" {
                    Ok(Bytes::from(
                        hex::decode(&value[2..])
                            .unwrap_or_else(|_| panic!("failed to decode hex string \"{value}\"")),
                    )
                    .into())
                } else {
                    Err(serde::de::Error::custom(format!(
                        "string \"{value}\" does not have a '0x' prefix"
                    )))
                }
            }
        }

        deserializer.deserialize_identifier(ZeroXPrefixedBytesVisitor)
    }
}

impl Serialize for ZeroXPrefixedBytes {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
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

/// for use with serde's `serialize_with` on an optional single value that
/// should be serialized as a sequence
pub fn optional_single_to_sequence<S, T>(val: &Option<T>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
    T: Serialize,
{
    let mut seq = s.serialize_seq(Some(1))?;
    if val.is_some() {
        seq.serialize_element(val)?;
    }
    seq.end()
}

/// for use with serde's `deserialize_with` on a sequence that should be
/// deserialized as a single but optional value.
pub fn sequence_to_optional_single<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de> + Clone,
{
    let s: Vec<T> = Deserialize::deserialize(deserializer)?;
    if s.is_empty() {
        Ok(None)
    } else {
        Ok(Some(s[0].clone()))
    }
}

/// Helper module for (de)serializing bytes into hexadecimal strings. This is
/// necessary because the default bytes serialization considers a string as
/// bytes.
pub mod bytes {
    use super::{Bytes, Deserialize, Deserializer, Serializer};

    /// Helper function for deserializing [`Bytes`] from a `0x`-prefixed
    /// hexadecimal string.
    pub fn deserialize<'de, DeserializerT>(d: DeserializerT) -> Result<Bytes, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        let value = String::deserialize(d)?;
        if let Some(remaining) = value.strip_prefix("0x") {
            hex::decode(remaining)
        } else {
            hex::decode(&value)
        }
        .map(Into::into)
        .map_err(|e| serde::de::Error::custom(e.to_string()))
    }

    /// Helper function for serializing [`Bytes`] into a hexadecimal string.
    pub fn serialize<SerializerT>(
        value: &Bytes,
        s: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
    {
        s.serialize_str(&format!("0x{}", hex::encode(value.as_ref())))
    }
}

/// Helper module for optionally (de)serializing `[]` into `()`.
pub mod empty_params {
    use super::{Deserialize, Deserializer, Serialize, SerializeSeq, Serializer};

    /// Helper function for deserializing `[]` into `()`.
    pub fn deserialize<'de, DeserializerT>(d: DeserializerT) -> Result<(), DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        let seq = Option::<Vec<()>>::deserialize(d)?.unwrap_or_default();
        if !seq.is_empty() {
            return Err(serde::de::Error::custom(format!(
                "expected params sequence with length 0 but got {}",
                seq.len()
            )));
        }
        Ok(())
    }

    /// Helper function for serializing `()` into `[]`.
    pub fn serialize<SerializerT, T>(
        _val: &T,
        s: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
        T: Serialize,
    {
        let seq = s.serialize_seq(Some(0))?;
        seq.end()
    }
}

/// Helper module for (de)serializing from/to a single value to/from a sequence.
pub mod sequence {
    use super::{Deserialize, DeserializeOwned, Deserializer, Serialize, SerializeSeq, Serializer};

    /// Helper function for deserializing a single value from a sequence.
    pub fn deserialize<'de, T, DeserializerT>(d: DeserializerT) -> Result<T, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
        T: DeserializeOwned,
    {
        let mut seq = Vec::<T>::deserialize(d)?;
        if seq.len() != 1 {
            return Err(serde::de::Error::custom(format!(
                "expected params sequence with length 1 but got {}",
                seq.len()
            )));
        }
        Ok(seq.remove(0))
    }

    /// Helper function for serializing a single value into a sequence.
    pub fn serialize<SerializerT, T>(
        val: &T,
        s: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
        T: Serialize,
    {
        let mut seq = s.serialize_seq(Some(1))?;
        seq.serialize_element(val)?;
        seq.end()
    }
}

/// Helper module for deserializing an at most 32-byte hexadecimal storage
/// index for `eth_getStorageAt` that may or may not have a 0x prefix.
pub mod storage_index {
    use serde::{Deserialize, Deserializer};

    use crate::U256;

    /// Helper function for deserializing an at most 32-byte hexadecimal storage
    /// index that may or may not have a 0x prefix.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<U256, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value: String = Deserialize::deserialize(deserializer).map_err(|err| {
            serde::de::Error::custom(format!(
                "Storage slot argument must be a string, got '{err:?}'"
            ))
        })?;

        if value.is_empty() {
            return Err(serde::de::Error::custom(
                "Storage slot argument cannot be an empty string".to_string(),
            ));
        }

        let is_zero_x_prefixed = value.starts_with("0x");
        let expected_length = if is_zero_x_prefixed {
            2 * 32 + 2
        } else {
            2 * 32
        };

        if value.len() > expected_length {
            return Err(serde::de::Error::custom(format!(
                    "Storage slot argument must have a length of at most 66 (\"0x\" + 32 bytes), but '{value}' has a length of {}'",
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
}

/// Helper module for (de)serializing [`std::primitive::u64`]s from and into
/// `0x`-prefixed hexadecimal strings.
pub mod u64 {
    use revm_primitives::ruint::aliases::U64;

    use super::{Deserialize, Deserializer, Serialize, Serializer};

    /// Helper function for deserializing a [`std::primitive::u64`] from a
    /// `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value: U64 = Deserialize::deserialize(deserializer)?;
        Ok(value.as_limbs()[0])
    }

    /// Helper function for serializing a [`std::primitive::u64`] into a
    /// 0x-prefixed hexadecimal string.
    pub fn serialize<S>(value: &u64, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        Serialize::serialize(&U64::from(*value), s)
    }
}

/// Helper module for (de)serializing an [`Option<std::primitive::u64>`] from a
/// `0x`-prefixed hexadecimal string.
pub mod optional_u64 {
    use revm_primitives::ruint::aliases::U64;

    use super::{Deserialize, Deserializer, Serialize, Serializer};

    /// Helper function for deserializing an [`Option<std::primitive::u64>`]
    /// from a `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, DeserializerT>(
        deserializer: DeserializerT,
    ) -> Result<Option<u64>, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        let value: Option<U64> = Deserialize::deserialize(deserializer)?;
        Ok(value.map(|value| value.as_limbs()[0]))
    }

    /// Helper function for serializing a [`Option<std::primitive::u64>`] into a
    /// `0x`-prefixed hexadecimal string.
    pub fn serialize<SerializerT>(
        value: &Option<u64>,
        s: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
    {
        Serialize::serialize(&value.map(U64::from), s)
    }
}

/// Helper module for (de)serializing [`std::primitive::u8`]s from and into
/// `0x`-prefixed hexadecimal strings.
pub mod u8 {
    use revm_primitives::ruint::aliases::U8;

    use super::{Deserialize, Deserializer, Serialize, Serializer};

    /// Helper function for deserializing a [`std::primitive::u8`] from a
    /// `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, DeserializerT>(
        deserializer: DeserializerT,
    ) -> Result<u8, DeserializerT::Error>
    where
        DeserializerT: Deserializer<'de>,
    {
        let value: U8 = Deserialize::deserialize(deserializer)?;
        Ok(value.to())
    }

    /// Helper function for serializing a [`std::primitive::u8`] into a
    /// `0x`-prefixed hexadecimal string.
    pub fn serialize<SerializerT>(
        value: &u8,
        s: SerializerT,
    ) -> Result<SerializerT::Ok, SerializerT::Error>
    where
        SerializerT: Serializer,
    {
        Serialize::serialize(&U8::from(*value), s)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
    struct TestStructSerde {
        #[serde(with = "u8")]
        u8: u8,
        #[serde(with = "u64")]
        u64: u64,
        #[serde(with = "optional_u64")]
        optional_u64: Option<u64>,
        #[serde(with = "bytes")]
        bytes: Bytes,
    }

    impl TestStructSerde {
        fn json() -> serde_json::Value {
            json!({
                "u8": "0x01",
                // 2 bytes (too large for u8)
                "u64": "0x1234",
                "optional_u64": "0x1234",
                // 33 bytes (too large for u256)
                "bytes": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            })
        }
    }
    #[test]
    fn test_serde() {
        let json = TestStructSerde::json();
        let test_struct: TestStructSerde = serde_json::from_value(json).unwrap();

        let serialized = serde_json::to_string(&test_struct).unwrap();
        let deserialized = serde_json::from_str(&serialized).unwrap();

        assert_eq!(test_struct, deserialized);
    }
}
