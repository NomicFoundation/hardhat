use bytes::Bytes;
use revm_primitives::{keccak256, B256, U256};

use crate::{
    access_list::AccessListItem,
    transaction::{kind::TransactionKind, signed::EIP2930SignedTransaction},
};

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
pub struct EIP2930TransactionRequest {
    pub chain_id: u64,
    pub nonce: u64,
    pub gas_price: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub access_list: Vec<AccessListItem>,
}

impl EIP2930TransactionRequest {
    pub fn hash(&self) -> B256 {
        let encoded = rlp::encode(self);
        let mut out = vec![0; 1 + encoded.len()];
        out[0] = 1;
        out[1..].copy_from_slice(&encoded);
        keccak256(&out)
    }
}

impl From<&EIP2930SignedTransaction> for EIP2930TransactionRequest {
    fn from(tx: &EIP2930SignedTransaction) -> Self {
        Self {
            chain_id: tx.chain_id,
            nonce: tx.nonce,
            gas_price: tx.gas_price,
            gas_limit: tx.gas_limit,
            kind: tx.kind,
            value: tx.value,
            input: tx.input.clone(),
            access_list: tx.access_list.0.clone(),
        }
    }
}

impl rlp::Encodable for EIP2930TransactionRequest {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(8);
        s.append(&self.chain_id);
        s.append(&self.nonce);
        s.append(&self.gas_price);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append_list(&self.access_list);
    }
}
