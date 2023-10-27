//! Helper utilities for serde

use std::ops::Deref;

use revm_primitives::bytes::Bytes;

/// Type for specifying a byte string that will have a 0x prefix when serialized and
/// deserialized
#[derive(Clone, Debug, PartialEq)]
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

/// for use with serde's `serialize_with` on an optional single value that should be serialized as
/// a sequence
pub fn optional_single_to_sequence<S, T>(val: &Option<T>, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: serde::Serialize,
{
    use serde::ser::SerializeSeq;
    let mut seq = s.serialize_seq(Some(1))?;
    if val.is_some() {
        seq.serialize_element(val)?;
    }
    seq.end()
}

/// for use with serde's `deserialize_with` on a sequence that should be deserialized as a single
/// but optional value.
pub fn sequence_to_optional_single<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de> + Clone,
{
    let s: Vec<T> = serde::de::Deserialize::deserialize(deserializer)?;
    if s.is_empty() {
        Ok(None)
    } else {
        Ok(Some(s[0].clone()))
    }
}

/// Helper module for (de)serializing bytes into hexadecimal strings. This is necessary because
/// the default bytes serialization considers a string as bytes.
pub mod bytes {
    use serde::Deserialize;

    use super::Bytes;

    /// Helper function for deserializing [`Bytes`] from a `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, Deserializer>(d: Deserializer) -> Result<Bytes, Deserializer::Error>
    where
        Deserializer: serde::Deserializer<'de>,
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
    pub fn serialize<Serializer>(
        value: &Bytes,
        s: Serializer,
    ) -> Result<Serializer::Ok, Serializer::Error>
    where
        Serializer: serde::Serializer,
    {
        s.serialize_str(&format!("0x{}", hex::encode(value.as_ref())))
    }
}

/// Helper module for (de)serializing [`std::primitive::u64`]s from and into `0x`-prefixed hexadecimal strings.
pub mod u64 {
    use revm_primitives::ruint::aliases::U64;

    /// Helper function for deserializing a [`std::primitive::u64`] from a `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value: U64 = serde::Deserialize::deserialize(deserializer)?;
        Ok(value.as_limbs()[0])
    }

    /// Helper function for serializing a [`std::primitive::u64`] into a 0x-prefixed hexadecimal string.
    pub fn serialize<S>(value: &u64, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serde::Serialize::serialize(&U64::from(*value), s)
    }
}

/// Helper module for (de)serializing an [`Option<std::primitive::u64>`] from a `0x`-prefixed hexadecimal string.
pub mod optional_u64 {
    use revm_primitives::ruint::aliases::U64;

    /// Helper function for deserializing an [`Option<std::primitive::u64>`] from a `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value: Option<U64> = serde::Deserialize::deserialize(deserializer)?;
        Ok(value.map(|value| value.as_limbs()[0]))
    }

    /// Helper function for serializing a [`Option<std::primitive::u64>`] into a `0x`-prefixed hexadecimal string.
    pub fn serialize<S>(value: &Option<u64>, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serde::Serialize::serialize(&value.map(U64::from), s)
    }
}

/// Helper module for (de)serializing [`std::primitive::u8`]s from and into `0x`-prefixed hexadecimal strings.
pub mod u8 {
    use revm_primitives::ruint::aliases::U8;

    /// Helper function for deserializing a [`std::primitive::u8`] from a `0x`-prefixed hexadecimal string.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<u8, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value: U8 = serde::Deserialize::deserialize(deserializer)?;
        Ok(value.to())
    }

    /// Helper function for serializing a [`std::primitive::u8`] into a `0x`-prefixed hexadecimal string.
    pub fn serialize<S>(value: &u8, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serde::Serialize::serialize(&U8::from(*value), s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[derive(Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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
