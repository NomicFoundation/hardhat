// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/receipt.rs

#![allow(missing_docs)]

mod block;
mod transaction;

use ethbloom::Bloom;
use revm_primitives::{B256, U256};

pub use self::{block::BlockReceipt, transaction::TransactionReceipt};

/// Typed receipt that's generated after execution of a transaction.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
#[cfg_attr(feature = "serde", serde(deny_unknown_fields))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct TypedReceipt<LogT> {
    /// Cumulative gas used in block after this transaction was executed
    pub cumulative_gas_used: U256,
    /// Bloom filter of the logs generated within this transaction
    pub logs_bloom: Bloom,
    /// Logs generated within this transaction
    pub logs: Vec<LogT>,
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub data: TypedReceiptData,
}

/// Data of a typed receipt.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
#[cfg_attr(feature = "serde", serde(tag = "type"))]
pub enum TypedReceiptData {
    #[cfg_attr(feature = "serde", serde(rename = "0x0"))]
    Legacy {
        #[cfg_attr(feature = "serde", serde(rename = "root"))]
        state_root: B256,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x0"))]
    EIP658 {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x1"))]
    EIP2930 {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x2"))]
    EIP1559 {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
}

impl<LogT> TypedReceipt<LogT> {
    /// Returns the status code of the receipt, if any.
    pub fn status_code(&self) -> Option<u8> {
        match &self.data {
            TypedReceiptData::Legacy { .. } => None,
            TypedReceiptData::EIP658 { status }
            | TypedReceiptData::EIP2930 { status }
            | TypedReceiptData::EIP1559 { status } => Some(*status),
        }
    }

    /// Returns the state root of the receipt, if any.
    pub fn state_root(&self) -> Option<&B256> {
        match &self.data {
            TypedReceiptData::Legacy { state_root } => Some(state_root),
            _ => None,
        }
    }

    /// Returns the transaction type of the receipt.
    pub fn transaction_type(&self) -> u64 {
        match &self.data {
            TypedReceiptData::Legacy { .. } | TypedReceiptData::EIP658 { .. } => 0u64,
            TypedReceiptData::EIP2930 { .. } => 1u64,
            TypedReceiptData::EIP1559 { .. } => 2u64,
        }
    }
}

#[cfg(feature = "serde")]
impl<'deserializer, LogT> serde::Deserialize<'deserializer> for TypedReceipt<LogT>
where
    LogT: serde::Deserialize<'deserializer>,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'deserializer>,
    {
        use core::marker::PhantomData;

        use serde::de::Visitor;

        #[derive(serde::Deserialize)]
        #[serde(field_identifier, rename_all = "camelCase")]
        enum Field {
            Type,
            Root,
            Status,
            CumulativeGasUsed,
            LogsBloom,
            Logs,
        }

        struct TypedReceiptVisitor<LogT> {
            phantom: PhantomData<LogT>,
        }

        impl<'deserializer, LogT> Visitor<'deserializer> for TypedReceiptVisitor<LogT>
        where
            LogT: serde::Deserialize<'deserializer>,
        {
            type Value = TypedReceipt<LogT>;

            fn expecting(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
                formatter.write_str("a valid receipt")
            }

            fn visit_map<MapAccessT>(
                self,
                mut map: MapAccessT,
            ) -> Result<Self::Value, MapAccessT::Error>
            where
                MapAccessT: serde::de::MapAccess<'deserializer>,
            {
                use serde::de::Error;
                let mut transaction_type = None;
                let mut status_code = None;
                let mut state_root = None;
                let mut cumulative_gas_used = None;
                let mut logs_bloom = None;
                let mut logs = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Type => {
                            if transaction_type.is_some() {
                                return Err(Error::duplicate_field("type"));
                            }
                            transaction_type = Some(map.next_value()?);
                        }
                        Field::Root => {
                            if state_root.is_some() {
                                return Err(Error::duplicate_field("root"));
                            }
                            state_root = Some(map.next_value()?);
                        }
                        Field::Status => {
                            if status_code.is_some() {
                                return Err(Error::duplicate_field("status"));
                            }
                            status_code = Some(map.next_value()?);
                        }
                        Field::CumulativeGasUsed => {
                            if cumulative_gas_used.is_some() {
                                return Err(Error::duplicate_field("cumulativeGasUsed"));
                            }
                            cumulative_gas_used = Some(map.next_value()?);
                        }
                        Field::LogsBloom => {
                            if logs_bloom.is_some() {
                                return Err(Error::duplicate_field("logsBloom"));
                            }
                            logs_bloom = Some(map.next_value()?);
                        }
                        Field::Logs => {
                            if logs.is_some() {
                                return Err(Error::duplicate_field("logs"));
                            }
                            logs = Some(map.next_value()?);
                        }
                    }
                }

                let cumulative_gas_used =
                    cumulative_gas_used.ok_or_else(|| Error::missing_field("cumulativeGasUsed"))?;
                let logs_bloom = logs_bloom.ok_or_else(|| Error::missing_field("logsBloom"))?;
                let logs = logs.ok_or_else(|| Error::missing_field("logs"))?;

                let data = if let Some(status_code) = status_code {
                    let status = match status_code {
                        "0x0" => 0u8,
                        "0x1" => 1u8,
                        _ => return Err(Error::custom(format!("unknown status: {status_code}"))),
                    };

                    if let Some(transaction_type) = transaction_type {
                        match transaction_type {
                            "0x0" => TypedReceiptData::EIP658 { status },
                            "0x1" => TypedReceiptData::EIP2930 { status },
                            "0x2" => TypedReceiptData::EIP1559 { status },
                            _ => return Err(Error::custom("unknown transaction type")),
                        }
                    } else {
                        TypedReceiptData::EIP658 { status }
                    }
                } else if let Some(state_root) = state_root {
                    TypedReceiptData::Legacy { state_root }
                } else {
                    return Err(Error::missing_field("root or status"));
                };

                Ok(TypedReceipt {
                    cumulative_gas_used,
                    logs_bloom,
                    logs,
                    data,
                })
            }
        }

        deserializer.deserialize_map(TypedReceiptVisitor {
            phantom: PhantomData,
        })
    }
}

impl<LogT> rlp::Decodable for TypedReceipt<LogT>
where
    LogT: rlp::Decodable,
{
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        fn decode_inner<LogT>(
            rlp: &rlp::Rlp<'_>,
            id: Option<u8>,
        ) -> Result<TypedReceipt<LogT>, rlp::DecoderError>
        where
            LogT: rlp::Decodable,
        {
            let status = rlp.val_at(0)?;
            Ok(TypedReceipt {
                cumulative_gas_used: rlp.val_at(1)?,
                logs_bloom: rlp.val_at(2)?,
                logs: rlp.list_at(3)?,
                data: match id {
                    Some(1) => TypedReceiptData::EIP2930 { status },
                    Some(2) => TypedReceiptData::EIP1559 { status },
                    _ => TypedReceiptData::EIP658 { status },
                },
            })
        }

        let slice = rlp.data()?;

        let first = *slice
            .first()
            .ok_or(rlp::DecoderError::Custom("empty receipt"))?;

        if rlp.is_list() {
            return decode_inner(rlp, None);
        }

        let s = slice
            .get(1..)
            .ok_or(rlp::DecoderError::Custom("no receipt content"))?;

        let rlp = rlp::Rlp::new(s);

        if first == 0x01 {
            return decode_inner(&rlp, Some(1));
        }

        if first == 0x02 {
            return decode_inner(&rlp, Some(2));
        }

        Err(rlp::DecoderError::Custom("unknown receipt type"))
    }
}

impl<LogT> rlp::Encodable for TypedReceipt<LogT>
where
    LogT: rlp::Encodable,
{
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        let (id, status) = match &self.data {
            TypedReceiptData::Legacy { .. } => (None, None),
            TypedReceiptData::EIP658 { status } => (None, Some(status)),
            TypedReceiptData::EIP2930 { status } => (Some(1), Some(status)),
            TypedReceiptData::EIP1559 { status } => (Some(2), Some(status)),
        };

        if let Some(id) = id {
            s.append_raw(&[id], 1);
        }

        s.begin_list(4);

        if let Some(status) = status {
            s.append(status);
        } else {
            s.append(&"");
        }

        s.append(&self.cumulative_gas_used);
        s.append(&self.logs_bloom);
        s.append_list(&self.logs);
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use bytes::Bytes;
    use revm_primitives::Address;

    use crate::log::Log;

    use super::*;

    #[test]
    fn test_typed_receipt_serde() {
        let receipt = TypedReceipt {
            logs_bloom: [0; 256].into(),
            cumulative_gas_used: U256::from(0x1u64),
            logs: vec![Log {
                address: Address::default(),
                topics: vec![],
                data: Bytes::default(),
            }],
            data: TypedReceiptData::EIP1559 { status: 1 },
        };

        let serialized = serde_json::to_string(&receipt).unwrap();
        let deserialized: TypedReceipt<Log> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(receipt, deserialized);
    }

    #[test]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_typed_receipt_encode_legacy() {
        let expected = hex::decode("f901668001b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f85ff85d940000000000000000000000000000000000000011f842a0000000000000000000000000000000000000000000000000000000000000deada0000000000000000000000000000000000000000000000000000000000000beef830100ff").unwrap();

        let receipt = TypedReceipt {
            logs_bloom: [0; 256].into(),
            cumulative_gas_used: U256::from(0x1u64),
            logs: vec![Log {
                address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
                topics: vec![
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000dead",
                    )
                    .unwrap(),
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000beef",
                    )
                    .unwrap(),
                ],
                data: Bytes::from(hex::decode("0100ff").unwrap()),
            }],
            data: TypedReceiptData::EIP658 { status: 0 },
        };

        let decoded = rlp::encode(&receipt);

        // check that the rlp length equals the length of the expected rlp
        assert_eq!(decoded.len(), expected.len());
        assert_eq!(decoded, expected);
    }

    #[test]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_typed_receipt_decode_legacy() {
        use std::str::FromStr;

        let data = hex::decode("f901668001b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f85ff85d940000000000000000000000000000000000000011f842a0000000000000000000000000000000000000000000000000000000000000deada0000000000000000000000000000000000000000000000000000000000000beef830100ff").unwrap();

        let expected = TypedReceipt {
            logs_bloom: [0; 256].into(),
            cumulative_gas_used: U256::from(0x1u64),
            logs: vec![Log {
                address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
                topics: vec![
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000dead",
                    )
                    .unwrap(),
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000beef",
                    )
                    .unwrap(),
                ],
                data: Bytes::from(hex::decode("0100ff").unwrap()),
            }],
            data: TypedReceiptData::EIP658 { status: 0 },
        };

        let decoded: TypedReceipt<Log> = rlp::decode(&data[..]).unwrap();
        assert_eq!(decoded, expected);
    }
}
