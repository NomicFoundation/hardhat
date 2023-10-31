use edr_eth::U256;
use serde::{de::Error, Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(untagged)]
pub enum Number {
    U256(U256),
    U64(u64),
}

impl From<Number> for U256 {
    fn from(number: Number) -> U256 {
        match number {
            Number::U256(number) => number,
            Number::U64(number) => U256::from(number),
        }
    }
}

impl From<Number> for u64 {
    fn from(number: Number) -> u64 {
        match number {
            Number::U256(number) => number
                .try_into()
                .expect("number is too big to fit into a u64"),
            Number::U64(number) => number,
        }
    }
}

impl Serialize for Number {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Number::U64(number) => serializer.serialize_u64(*number),
            Number::U256(number) => {
                if let Ok(number) = u64::try_from(number) {
                    serializer.serialize_u64(number)
                } else {
                    number.serialize(serializer)
                }
            }
        }
    }
}

/// deserialize a [`Number`] but always as a [`Number::U256`]
pub fn u256_number<'de, D>(deserializer: D) -> Result<Number, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let number: Number = Deserialize::deserialize(deserializer)?;
    match number {
        Number::U256(number) => Ok(Number::U256(number)),
        Number::U64(number) => Ok(Number::U256(U256::from(number))),
    }
}

/// deserialize a [`Number`] but always as a [`Number::U64`], panicking if the
/// value overflows.
pub fn u64_number<'de, D>(deserializer: D) -> Result<Number, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let number: Number = Deserialize::deserialize(deserializer)?;
    match number {
        Number::U256(number) => Ok(Number::U64(number.try_into().map_err(D::Error::custom)?)),
        Number::U64(number) => Ok(Number::U64(number)),
    }
}
