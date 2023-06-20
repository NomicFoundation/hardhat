use bytes::Bytes;
use revm_primitives::{keccak256, B256, U256};

use crate::transaction::{kind::TransactionKind, signed::LegacySignedTransaction};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LegacyTransactionRequest {
    pub nonce: u64,
    pub gas_price: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub chain_id: Option<u64>,
}

impl LegacyTransactionRequest {
    pub fn hash(&self) -> B256 {
        keccak256(&rlp::encode(self))
    }
}

impl From<&LegacySignedTransaction> for LegacyTransactionRequest {
    fn from(tx: &LegacySignedTransaction) -> Self {
        let chain_id = tx.chain_id();
        Self {
            nonce: tx.nonce,
            gas_price: tx.gas_price,
            gas_limit: tx.gas_limit,
            kind: tx.kind,
            value: tx.value,
            input: tx.input.clone(),
            chain_id,
        }
    }
}

impl rlp::Encodable for LegacyTransactionRequest {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        if let Some(chain_id) = self.chain_id {
            s.begin_list(9);
            s.append(&self.nonce);
            s.append(&self.gas_price);
            s.append(&self.gas_limit);
            s.append(&self.kind);
            s.append(&self.value);
            s.append(&self.input.as_ref());
            s.append(&chain_id);
            s.append(&0u8);
            s.append(&0u8);
        } else {
            s.begin_list(6);
            s.append(&self.nonce);
            s.append(&self.gas_price);
            s.append(&self.gas_limit);
            s.append(&self.kind);
            s.append(&self.value);
            s.append(&self.input.as_ref());
        }
    }
}
