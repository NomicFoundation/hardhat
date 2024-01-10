use std::ops::Deref;

use alloy_rlp::BufMut;

use super::TypedReceipt;
use crate::{Address, Bloom, B256, U256};

/// Type for a receipt that's created when processing a transaction.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct TransactionReceipt<L> {
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub inner: TypedReceipt<L>,
    /// Hash of the transaction
    pub transaction_hash: B256,
    /// Index of the transaction in the block
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub transaction_index: u64,
    /// Address of the sender
    pub from: Address,
    /// Address of the receiver. `None` when it's a contract creation
    /// transaction.
    pub to: Option<Address>,
    /// The contract address created, if the transaction was a contract
    /// creation, otherwise `None`.
    pub contract_address: Option<Address>,
    /// Gas used by this transaction alone.
    pub gas_used: U256,
    /// The actual value per gas deducted from the senders account, which is
    /// equal to equal to baseFeePerGas + min(maxFeePerGas - baseFeePerGas,
    /// maxPriorityFeePerGas) after EIP-1559. Following Hardhat, only present if
    /// the hardfork is at least London.
    #[cfg_attr(feature = "serde", serde(skip_serializing_if = "Option::is_none"))]
    pub effective_gas_price: Option<U256>,
}

impl<L> TransactionReceipt<L> {
    /// Returns the gas used by the transactions up until this point.
    pub fn cumulative_gas_used(&self) -> u64 {
        self.inner.cumulative_gas_used
    }

    /// Returns the bloom filter of transaction's logs.
    pub fn logs_bloom(&self) -> &Bloom {
        &self.inner.logs_bloom
    }

    /// Returns the transaction's logs.
    pub fn logs(&self) -> &[L] {
        &self.inner.logs
    }
    /// Returns the status code of the receipt, if any.
    pub fn status_code(&self) -> Option<u8> {
        self.inner.status_code()
    }

    /// Returns the state root of the receipt, if any.
    pub fn state_root(&self) -> Option<&B256> {
        self.inner.state_root()
    }

    /// Returns the transaction type of the receipt.
    pub fn transaction_type(&self) -> u64 {
        self.inner.transaction_type()
    }
}

impl<L> Deref for TransactionReceipt<L> {
    type Target = TypedReceipt<L>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<LogT> alloy_rlp::Encodable for TransactionReceipt<LogT>
where
    LogT: alloy_rlp::Encodable,
{
    fn encode(&self, out: &mut dyn BufMut) {
        self.inner.encode(out);
    }

    fn length(&self) -> usize {
        self.inner.length()
    }
}

#[cfg(test)]
mod test {
    use revm_primitives::SpecId;

    use super::*;
    use crate::receipt::TypedReceiptData;

    #[test]
    fn test_transaction_receipt_serde() {
        let receipt = TransactionReceipt {
            inner: TypedReceipt {
                cumulative_gas_used: 100,
                logs_bloom: Bloom::default(),
                logs: vec![],
                data: TypedReceiptData::Eip1559 { status: 1 },
                spec_id: SpecId::LATEST,
            },
            transaction_hash: B256::default(),
            transaction_index: 5,
            from: Address::default(),
            to: None,
            contract_address: Some(Address::default()),
            gas_used: U256::from(100),
            effective_gas_price: Some(U256::from(100)),
        };

        let serialized = serde_json::to_string(&receipt).unwrap();
        let deserialized: TransactionReceipt<()> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(receipt, deserialized);
    }
}
