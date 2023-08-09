use bytes::Bytes;
use revm_primitives::{keccak256, B256, U256};

use crate::transaction::{kind::TransactionKind, signed::EIP155SignedTransaction};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EIP155TransactionRequest {
    pub nonce: u64,
    pub gas_price: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub chain_id: u64,
}

impl EIP155TransactionRequest {
    pub fn hash(&self) -> B256 {
        keccak256(&rlp::encode(self))
    }
}

impl From<&EIP155SignedTransaction> for EIP155TransactionRequest {
    fn from(tx: &EIP155SignedTransaction) -> Self {
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

impl rlp::Encodable for EIP155TransactionRequest {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(9);
        s.append(&self.nonce);
        s.append(&self.gas_price);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append(&self.chain_id);
        s.append(&0u8);
        s.append(&0u8);
    }
}
