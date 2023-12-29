//! Helper utilities for serde

use serde::{
    de::DeserializeOwned, ser::SerializeSeq, Deserialize, Deserializer, Serialize, Serializer,
};

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

/// Helper module for (de)serializing [`std::primitive::u64`]s from and into
/// `0x`-prefixed hexadecimal strings.
pub mod u64 {
    use super::{Deserialize, Deserializer, Serialize, Serializer};
    use crate::U64;

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
    use super::{Deserialize, Deserializer, Serialize, Serializer};
    use crate::U64;

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
    use alloy_primitives::U8;

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
    }

    impl TestStructSerde {
        fn json() -> serde_json::Value {
            json!({
                "u8": "0x01",
                // 2 bytes (too large for u8)
                "u64": "0x1234",
                "optional_u64": "0x1234",
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
