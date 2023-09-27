use std::ops::Deref;

use revm_primitives::B256;

use crate::log::FullBlockLog;

use super::TransactionReceipt;

/// Type for a receipt that's included in a block.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct BlockReceipt {
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub inner: TransactionReceipt<FullBlockLog>,
    /// Hash of the block that this is part of
    pub block_hash: B256,
    /// Number of the block that this is part of
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub block_number: u64,
}

impl Deref for BlockReceipt {
    type Target = TransactionReceipt<FullBlockLog>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl rlp::Encodable for BlockReceipt {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.append(&self.inner);
    }
}

#[cfg(test)]
mod test {

    use ethbloom::Bloom;
    use revm_primitives::{Address, U256};

    use crate::receipt::{TypedReceipt, TypedReceiptData};

    use super::*;

    #[test]
    fn test_block_receipt_serde() {
        let receipt = BlockReceipt {
            inner: TransactionReceipt {
                inner: TypedReceipt {
                    cumulative_gas_used: 1,
                    logs_bloom: Bloom::default(),
                    logs: vec![],
                    data: TypedReceiptData::Eip1559 { status: 1 },
                },
                transaction_hash: B256::default(),
                transaction_index: 5,
                from: Address::default(),
                to: Some(Address::default()),
                contract_address: None,
                gas_used: U256::from(1),
                effective_gas_price: U256::from(1),
            },
            block_hash: B256::default(),
            block_number: 1,
        };

        let serialized = serde_json::to_string(&receipt).unwrap();
        let deserialized = serde_json::from_str(&serialized).unwrap();

        assert_eq!(receipt, deserialized);
    }
}
