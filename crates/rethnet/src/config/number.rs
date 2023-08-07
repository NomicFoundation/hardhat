use rethnet_eth::U256;
use serde::{Deserialize, Serialize};

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

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct NumberForU256(pub Number);

impl From<NumberForU256> for U256 {
    fn from(number: NumberForU256) -> U256 {
        number.0.into()
    }
}

impl From<NumberForU256> for u64 {
    fn from(number: NumberForU256) -> u64 {
        number.0.into()
    }
}

impl<'a> Deserialize<'a> for NumberForU256 {
    fn deserialize<D>(deserializer: D) -> Result<NumberForU256, D::Error>
    where
        D: serde::Deserializer<'a>,
    {
        Number::deserialize(deserializer).map(|number| {
            NumberForU256(Number::U256(match number {
                Number::U256(number) => number,
                Number::U64(number) => U256::from(number),
            }))
        })
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(transparent)]
pub struct NumberForU64(pub Number);

impl From<NumberForU64> for U256 {
    fn from(number: NumberForU64) -> U256 {
        number.0.into()
    }
}

impl From<NumberForU64> for u64 {
    fn from(number: NumberForU64) -> u64 {
        number.0.into()
    }
}
