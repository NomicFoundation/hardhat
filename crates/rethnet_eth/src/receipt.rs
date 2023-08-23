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
    PreEip658Legacy {
        #[cfg_attr(feature = "serde", serde(rename = "root"))]
        state_root: B256,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x0"))]
    PostEip658Legacy {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x1"))]
    Eip2930 {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
    #[cfg_attr(feature = "serde", serde(rename = "0x2"))]
    Eip1559 {
        #[cfg_attr(feature = "serde", serde(with = "crate::serde::u8"))]
        status: u8,
    },
}

impl<LogT> TypedReceipt<LogT> {
    /// Returns the status code of the receipt, if any.
    pub fn status_code(&self) -> Option<u8> {
        match &self.data {
            TypedReceiptData::PreEip658Legacy { .. } => None,
            TypedReceiptData::PostEip658Legacy { status }
            | TypedReceiptData::Eip2930 { status }
            | TypedReceiptData::Eip1559 { status } => Some(*status),
        }
    }

    /// Returns the state root of the receipt, if any.
    pub fn state_root(&self) -> Option<&B256> {
        match &self.data {
            TypedReceiptData::PreEip658Legacy { state_root } => Some(state_root),
            _ => None,
        }
    }

    /// Returns the transaction type of the receipt.
    pub fn transaction_type(&self) -> u64 {
        match &self.data {
            TypedReceiptData::PreEip658Legacy { .. }
            | TypedReceiptData::PostEip658Legacy { .. } => 0u64,
            TypedReceiptData::Eip2930 { .. } => 1u64,
            TypedReceiptData::Eip1559 { .. } => 2u64,
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

                let data = if let Some(state_root) = state_root {
                    TypedReceiptData::PreEip658Legacy { state_root }
                } else if let Some(status_code) = status_code {
                    let status = match status_code {
                        "0x0" => 0u8,
                        "0x1" => 1u8,
                        _ => return Err(Error::custom(format!("unknown status: {status_code}"))),
                    };

                    if let Some(transaction_type) = transaction_type {
                        match transaction_type {
                            "0x0" => TypedReceiptData::PostEip658Legacy { status },
                            "0x1" => TypedReceiptData::Eip2930 { status },
                            "0x2" => TypedReceiptData::Eip1559 { status },
                            _ => return Err(Error::custom("unknown transaction type")),
                        }
                    } else {
                        TypedReceiptData::PostEip658Legacy { status }
                    }
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
            fn normalize_status(status: u8) -> u8 {
                if status == 1 {
                    1
                } else {
                    0
                }
            }

            Ok(TypedReceipt {
                cumulative_gas_used: rlp.val_at(1)?,
                logs_bloom: rlp.val_at(2)?,
                logs: rlp.list_at(3)?,
                data: match id {
                    None | Some(0) => {
                        if let Ok(status) = rlp.val_at(0) {
                            TypedReceiptData::PostEip658Legacy {
                                status: normalize_status(status),
                            }
                        } else {
                            let state_root = rlp.val_at::<Vec<u8>>(0)?;
                            TypedReceiptData::PreEip658Legacy {
                                state_root: B256::from_slice(&state_root),
                            }
                        }
                    }
                    Some(1) => TypedReceiptData::Eip2930 {
                        status: normalize_status(rlp.val_at(0)?),
                    },
                    Some(2) => TypedReceiptData::Eip1559 {
                        status: normalize_status(rlp.val_at(0)?),
                    },
                    _ => return Err(rlp::DecoderError::Custom("Unsupported receipt type")),
                },
            })
        }

        let slice = rlp.as_raw();

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
        let id = match &self.data {
            TypedReceiptData::PreEip658Legacy { .. }
            | TypedReceiptData::PostEip658Legacy { .. } => None,
            TypedReceiptData::Eip2930 { .. } => Some(1),
            TypedReceiptData::Eip1559 { .. } => Some(2),
        };

        if let Some(id) = id {
            s.append_raw(&[id], 1);
        }

        s.begin_list(4);

        match &self.data {
            TypedReceiptData::PreEip658Legacy { state_root } => {
                s.append(&state_root.as_bytes());
            }
            TypedReceiptData::PostEip658Legacy { status }
            | TypedReceiptData::Eip2930 { status }
            | TypedReceiptData::Eip1559 { status } => {
                if *status == 0 {
                    s.append_empty_data();
                } else {
                    s.append(&1u8);
                }
            }
        }

        s.append(&self.cumulative_gas_used);
        s.append(&self.logs_bloom);
        s.append_list(&self.logs);
    }
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;
    use revm_primitives::Address;

    use crate::log::Log;

    use super::*;

    fn dummy_receipts() -> Vec<TypedReceipt<Log>> {
        [
            TypedReceiptData::PreEip658Legacy {
                state_root: B256::random(),
            },
            TypedReceiptData::PostEip658Legacy { status: 1 },
            TypedReceiptData::Eip2930 { status: 1 },
            TypedReceiptData::Eip1559 { status: 0 },
        ]
        .into_iter()
        .map(|data| TypedReceipt {
            cumulative_gas_used: U256::from(0xffff),
            logs_bloom: Bloom::random(),
            logs: vec![
                Log {
                    address: Address::random(),
                    topics: vec![B256::random(), B256::random()],
                    data: Bytes::new(),
                },
                Log {
                    address: Address::random(),
                    topics: Vec::new(),
                    data: Bytes::from_static(b"test"),
                },
            ],
            data,
        })
        .collect()
    }

    #[test]
    fn test_typed_receipt_rlp() {
        let receipts = dummy_receipts();

        for receipt in receipts {
            let encoded = rlp::encode(&receipt);
            assert_eq!(rlp::decode::<TypedReceipt<Log>>(&encoded).unwrap(), receipt);
        }
    }

    #[test]
    fn test_typed_receipt_serde() {
        let receipts = dummy_receipts();

        for receipt in receipts {
            let serialized = serde_json::to_string(&receipt).unwrap();
            let deserialized: TypedReceipt<Log> = serde_json::from_str(&serialized).unwrap();

            assert_eq!(receipt, deserialized);
        }
    }

    #[cfg(feature = "test-remote")]
    mod alchemy {
        use super::*;

        macro_rules! impl_test_receipt_rlp_encoding {
            ($(
                $name:ident: $transaction_hash:literal => $encoding:literal,
            )+) => {
                $(
                    paste::item! {
                        #[tokio::test]
                        async fn [<test_receipt_rlp_encoding_ $name>]() {
                            use rethnet_test_utils::env::get_alchemy_url;
                            use revm_primitives::B256;
                            use tempfile::TempDir;

                            use crate::remote::RpcClient;

                            let tempdir = TempDir::new().unwrap();
                            let client = RpcClient::new(&get_alchemy_url(), tempdir.path().into());

                            let transaction_hash = B256::from_slice(&hex::decode($transaction_hash).unwrap());

                            let receipt = client
                                .get_transaction_receipt(&transaction_hash)
                                .await
                                .expect("Should succeed")
                                .expect("Receipt must exist");

                            // Generated by Hardhat
                            let expected = hex::decode($encoding).unwrap();

                            assert_eq!(rlp::encode(&receipt).to_vec(), expected);

                            let decoded: TypedReceipt<Log> = rlp::decode(&expected).unwrap();
                            let receipt = TypedReceipt {
                                data: receipt.inner.inner.data,
                                cumulative_gas_used: receipt.inner.inner.cumulative_gas_used,
                                logs_bloom: receipt.inner.inner.logs_bloom,
                                logs: receipt.inner.inner.logs.into_iter().map(|log| {
                                    let log = log.inner.inner;
                                    Log {
                                        address: log.address,
                                        topics: log.topics,
                                        data: log.data,
                                    }
                            }).collect(),
                            };

                            assert_eq!(decoded, receipt);
                        }
                    }
                )+
            };
        }

        impl_test_receipt_rlp_encoding! {
            pre_eip658: "427b0b68b1ccc46b01d99ed399b61c4ae681e22216035eb6953afc83ef463e17"
                => "f90128a08af7cdcc6991b441f6285f4298df6add6506b3fd3ca559b0682fb2d57929652f825208b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0",
            post_eip658: "1421a887a02301ae127bf2cd4c006116053c9dc4a255e69ea403a2d77c346cf5"
                => "f9010801825208b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0",
            eip2930: "01361649690dbff1ac1da1a7351a125b7cb0f26b9c5e017c4aefe90135b9be14"
                => "01f90109018351e668b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0",
            eip1559: "3dac2080b4c423029fcc9c916bc430cde441badfe736fc6d1fe9325348af80fd"
                => "02f91c7701830ea827b9010000201000000000000004040080005010004000000000000000000000280004102000000000000400004001800001010003000000080020000000004100200010020000000000000800000008080220a04000a00100400040000000008000000010200200001000000000b000000000004100804000000540100040100009002000010100000010000000004000100000000000004020000828000244001000080200006000020400080000804100004000800801a000000401010000000000000100000200080000010000000088140008202280000000100008008200102800c010200000000320000002000020000000004000010080100000000040000000f91b6cf9017c949008d19f58aabd9ed0d60971565aa8510560ab41f842a0a07a543ab8a018198e99ca0184c93fe9050a79400a0a723441f84de1d972cc17a0000000000000000000000000f967aa80d80d6f22df627219c5113a118b57d0efb901200000000000000000000000009e46a38f5daabe8683e10793b06749eef7d733d1000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000069e10de76676d080000000000000000000000000000000000000000000000000000128e23797a37671e700000000000000000000000000000000000000000000004efc8c538e1084000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000038d11030660bf632eb31345d6b5f3e6ba2d2311cc783f3764c405f5272200dd670f967aa80d80d6f22df627219c5113a118b57d0ef61e0b5bc0000000000000000f9017c949008d19f58aabd9ed0d60971565aa8510560ab41f842a0a07a543ab8a018198e99ca0184c93fe9050a79400a0a723441f84de1d972cc17a000000000000000000000000003bada9ff1cf0d0264664b43977ed08feee32584b90120000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000c7283b66eb1eb5fb86327f08e1b5816b0720212b000000000000000000000000000000000000000000000000fbec1330f280b3fd000000000000000000000000000000000000000000000a322816740bfd499e6600000000000000000000000000000000000000000000000000b46ffd87079be800000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000380437203aec40e6c16642904f125e7d97bf45f39a51a729d775b8e3ea3cc667cd03bada9ff1cf0d0264664b43977ed08feee3258461e0b5d90000000000000000f89b949e46a38f5daabe8683e10793b06749eef7d733d1f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000f967aa80d80d6f22df627219c5113a118b57d0efa00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a00000000000000000000000000000000000000000000069e10de76676d0800000f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000003bada9ff1cf0d0264664b43977ed08feee32584a00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a0000000000000000000000000000000000000000000000000fbec1330f280b3fdf89b949e46a38f5daabe8683e10793b06749eef7d733d1f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000006992115b12e8bffc0000f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000005aaa0053fa5c28e8c558d4c648cc129bea45018a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a000000000000000000000000000000000000000000000000065ca4d7e75041e08f89b949e46a38f5daabe8683e10793b06749eef7d733d1f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a000000000000000000000000005aaa0053fa5c28e8c558d4c648cc129bea45018a0000000000000000000000000000000000000000000002330b073b0f83ffeaaaaf9011c9405aaa0053fa5c28e8c558d4c648cc129bea45018f863a0c42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2b8a0000000000000000000000000000000000000000000002330b073b0f83ffeaaaaffffffffffffffffffffffffffffffffffffffffffffffff9a35b2818afbe1f8000000000000000000000000000000000000000001af7ab4eebc6eaabac2b8540000000000000000000000000000000000000000000008462c8201774345ee54fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe778cf89b949e46a38f5daabe8683e10793b06749eef7d733d1f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000119c71d3bbac22029622cbaec24854d3d32d2828a000000000000000000000000000000000000000000000466160e761f07ffd5556f89b94119c71d3bbac22029622cbaec24854d3d32d2828f842a0b9ed0243fdf00f0545c63a0af8850c090d86bb46682baec4bf3c496814fe4f02a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2b8401fd446014fc12b89bb0aee29f847d7fbf7e4237a671c70945013f952ca4a567a00000000000000000000000000000000000000000000000000000000a6444848f89b949e46a38f5daabe8683e10793b06749eef7d733d1f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000ca90ac7c132da0602b69b84af2b6a69a905379a2a000000000000000000000000000000000000000000000466160e761f07ffd5556f89b94dac17f958d2ee523a2206206994597c13d831ec7f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000ca90ac7c132da0602b69b84af2b6a69a905379a2a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a00000000000000000000000000000000000000000000000000000000afdf72bb8f89b94dac17f958d2ee523a2206206994597c13d831ec7f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a00000000000000000000000001111111254fb6c44bac0bed2854e76f90643097da00000000000000000000000000000000000000000000000000000000afdf72bb8f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000945bcf562085de2d5875b9e2012ed5fd5cfab927a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000000000c96c4c288f973ff8f89b94dac17f958d2ee523a2206206994597c13d831ec7f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000945bcf562085de2d5875b9e2012ed5fd5cfab927a00000000000000000000000000000000000000000000000000000000afdf72bb8f879941111111254fb6c44bac0bed2854e76f90643097de1a0c3b639f02b125bfa160e50739b8c44eb2d1b6908e2b6d5925c6d770f2ca78127b840a7036786313db68944e1789fa8a69f90c41e29301442c6731a151688acbe6a26000000000000000000000000000000000000000000000000c96c4c288f973ff8f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000dd9f24efc84d93deef3c8745c837ab63e80abd27a00000000000000000000000000000000000000000000000000654620f6124ec19f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a000000000000000000000000000000000000000000000000128e23797a37671e7f8f99411111112542d85b3ef69ae05771c2dccff4faa26e1a0d6d4f5681c246c9f42c203e287975af1601f8df8035a9251f79aab5c8f09e2f8b8c00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab410000000000000000000000009e46a38f5daabe8683e10793b06749eef7d733d1000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41000000000000000000000000000000000000000000006992115b12e8bffc000000000000000000000000000000000000000000000000000128e23797a37671e7f89b949008d19f58aabd9ed0d60971565aa8510560ab41f842a0ed99827efb37016f2275f98c4bcf71c7551c75d59e9b450f79fa32e60be672c2a000000000000000000000000011111112542d85b3ef69ae05771c2dccff4faa26b84000000000000000000000000000000000000000000000000000000000000000007c02520000000000000000000000000000000000000000000000000000000000f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000000000fb37a3336b791815f89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a08c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000ba12222222228d8ba445958a75a0704d566bf2c8a0000000000000000000000000000000000000000000000000fb37a3336b791815f8dd94ba12222222228d8ba445958a75a0704d566bf2c8f884a02170c741c41531aec20e7c107c24eecfdd15e69c9bb0a8dd37b1840b9e0b207ba00b09dea16768f0799065c475be02919503cb2a3500020000000000000000001aa0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2a00000000000000000000000006b175474e89094c44da98b954eedeac495271d0fb840000000000000000000000000000000000000000000000000fb37a3336b791815000000000000000000000000000000000000000000000c74f130b221944b84caf89b94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000ba12222222228d8ba445958a75a0704d566bf2c8a0000000000000000000000000000000000000000000000000fb37a3336b791815f89b946b175474e89094c44da98b954eedeac495271d0ff863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000ba12222222228d8ba445958a75a0704d566bf2c8a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000000c74f130b221944b84caf89b94956f47f50a910163d8bf957cf5846d573e7f87caf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bb2e5c2ff298fd96e166f90c8abacaf714df14f8a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000000c74da893438a10088bff89b946b175474e89094c44da98b954eedeac495271d0ff863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000bb2e5c2ff298fd96e166f90c8abacaf714df14f8a0000000000000000000000000000000000000000000000c74f130b221944b84caf9011c94bb2e5c2ff298fd96e166f90c8abacaf714df14f8f863a0c42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2b8a0000000000000000000000000000000000000000000000c74f130b221944b84cafffffffffffffffffffffffffffffffffffffffffffff38b2576cbc75eff77410000000000000000000000000000000000000001000f16fba6ff427463b0357d00000000000000000000000000000000000000000fefa81144cbfbd548a25a7c0000000000000000000000000000000000000000000000000000000000000004f89b94956f47f50a910163d8bf957cf5846d573e7f87caf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a00000000000000000000000009928e4046d7c6513326ccea028cd3e7a91c7590aa0000000000000000000000000000000000000000000000c74da893438a10088bff89b94c7283b66eb1eb5fb86327f08e1b5816b0720212bf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000009928e4046d7c6513326ccea028cd3e7a91c7590aa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a0000000000000000000000000000000000000000000000a2faafe6664fcd2fd91f879949928e4046d7c6513326ccea028cd3e7a91c7590ae1a01c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1b8400000000000000000000000000000000000000000007f015873850f3f6be1a2500000000000000000000000000000000000000000006821664c5f0a4b332570a2f8fc949928e4046d7c6513326ccea028cd3e7a91c7590af863a0d78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2b880000000000000000000000000000000000000000000000c74da893438a10088bf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a2faafe6664fcd2fd91f89b94c7283b66eb1eb5fb86327f08e1b5816b0720212bf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2a00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a0000000000000000000000000000000000000000000000a2faafe6664fcd2fd91f8f99411111112542d85b3ef69ae05771c2dccff4faa26e1a0d6d4f5681c246c9f42c203e287975af1601f8df8035a9251f79aab5c8f09e2f8b8c00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000c7283b66eb1eb5fb86327f08e1b5816b0720212b0000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41000000000000000000000000000000000000000000000000fb37a3336b791815000000000000000000000000000000000000000000000a2faafe6664fcd2fd91f89b949008d19f58aabd9ed0d60971565aa8510560ab41f842a0ed99827efb37016f2275f98c4bcf71c7551c75d59e9b450f79fa32e60be672c2a000000000000000000000000011111112542d85b3ef69ae05771c2dccff4faa26b84000000000000000000000000000000000000000000000000000000000000000007c02520000000000000000000000000000000000000000000000000000000000f87a94c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2f842a07fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65a00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a000000000000000000000000000000000000000000000000128e23797a37671e7f89b949008d19f58aabd9ed0d60971565aa8510560ab41f842a0ed99827efb37016f2275f98c4bcf71c7551c75d59e9b450f79fa32e60be672c2a0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2b84000000000000000000000000000000000000000000000000000000000000000002e1a7d4d00000000000000000000000000000000000000000000000000000000f89b94c7283b66eb1eb5fb86327f08e1b5816b0720212bf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000009008d19f58aabd9ed0d60971565aa8510560ab41a000000000000000000000000003bada9ff1cf0d0264664b43977ed08feee32584a0000000000000000000000000000000000000000000000a322816740bfd499e66f85a949008d19f58aabd9ed0d60971565aa8510560ab41f842a040338ce1a7c49204f0099533b1e9a7ee0a3d261f84974ab7af36105b8c4e9db4a0000000000000000000000000de1c59bc25d806ad9ddcbe246c4b5e550564571880",
        }
    }
}
