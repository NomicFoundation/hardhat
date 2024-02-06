use std::ops::Deref;

use alloy_rlp::BufMut;

use super::TransactionReceipt;
use crate::{log::FilterLog, B256};

/// Type for a receipt that's included in a block.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct BlockReceipt {
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub inner: TransactionReceipt<FilterLog>,
    /// Hash of the block that this is part of
    pub block_hash: B256,
    /// Number of the block that this is part of
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub block_number: u64,
}

impl Deref for BlockReceipt {
    type Target = TransactionReceipt<FilterLog>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl alloy_rlp::Encodable for BlockReceipt {
    fn encode(&self, out: &mut dyn BufMut) {
        self.inner.encode(out);
    }

    fn length(&self) -> usize {
        self.inner.length()
    }
}

#[cfg(test)]
mod test {
    use assert_json_diff::assert_json_eq;
    use revm_primitives::SpecId;
    use serde_json::json;

    use super::*;
    use crate::{
        receipt::{TypedReceipt, TypedReceiptData},
        Address, Bloom, U256,
    };

    #[test]
    fn test_block_receipt_serde() {
        let receipt = BlockReceipt {
            inner: TransactionReceipt {
                inner: TypedReceipt {
                    cumulative_gas_used: 1,
                    logs_bloom: Bloom::default(),
                    logs: vec![],
                    data: TypedReceiptData::Eip1559 { status: 1 },
                    spec_id: Some(SpecId::LATEST),
                },
                transaction_hash: B256::default(),
                transaction_index: 5,
                from: Address::default(),
                to: Some(Address::default()),
                contract_address: None,
                gas_used: 1,
                effective_gas_price: Some(U256::from(1)),
            },
            block_hash: B256::default(),
            block_number: 1,
        };

        let serialized = serde_json::to_string(&receipt).unwrap();
        let deserialized = serde_json::from_str(&serialized).unwrap();

        assert_eq!(receipt, deserialized);
    }

    #[test]
    fn test_matches_hardhat_serialization() -> anyhow::Result<()> {
        // Generated with the "Hardhat Network provider eth_getTransactionReceipt should
        // return the right values for successful txs" hardhat-core test.
        let receipt_from_hardhat = json!({
          "transactionHash": "0x08d14db1a6253234f7efc94fc661f52b708882552af37ebf4f5cd904618bb208",
          "transactionIndex": "0x0",
          "blockHash": "0x404b3b3ed507ff47178e9ca9d7757165050180091e1cc17de7981871a6e5785a",
          "blockNumber": "0x2",
          "from": "0xbe862ad9abfe6f22bcb087716c7d89a26051f74c",
          "to": "0x61de9dc6f6cff1df2809480882cfd3c2364b28f7",
          "cumulativeGasUsed": "0xaf91",
          "gasUsed": "0xaf91",
          "contractAddress": null,
          "logs": [
            {
              "removed": false,
              "logIndex": "0x0",
              "transactionIndex": "0x0",
              "transactionHash": "0x08d14db1a6253234f7efc94fc661f52b708882552af37ebf4f5cd904618bb208",
              "blockHash": "0x404b3b3ed507ff47178e9ca9d7757165050180091e1cc17de7981871a6e5785a",
              "blockNumber": "0x2",
              "address": "0x61de9dc6f6cff1df2809480882cfd3c2364b28f7",
              "data": "0x000000000000000000000000000000000000000000000000000000000000000a",
              "topics": [
                "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              ]
            }
          ],
          "logsBloom": "0x00000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000400000000000000000020000000000000000000800000002000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000",
          "type": "0x2",
          "status": "0x1",
          "effectiveGasPrice": "0x699e6346"
        });

        let deserialized: BlockReceipt = serde_json::from_value(receipt_from_hardhat.clone())?;
        let serialized = serde_json::to_value(deserialized)?;

        assert_json_eq!(receipt_from_hardhat, serialized);

        Ok(())
    }
}
