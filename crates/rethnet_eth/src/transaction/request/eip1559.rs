use bytes::Bytes;
use revm_primitives::{keccak256, B256, U256};

use crate::{
    access_list::AccessListItem,
    transaction::{kind::TransactionKind, signed::EIP1559SignedTransaction},
};

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
pub struct EIP1559TransactionRequest {
    pub chain_id: u64,
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub access_list: Vec<AccessListItem>,
}

impl EIP1559TransactionRequest {
    pub fn hash(&self) -> B256 {
        let encoded = rlp::encode(self);
        let mut out = vec![0; 1 + encoded.len()];
        out[0] = 2;
        out[1..].copy_from_slice(&encoded);
        keccak256(&out)
    }
}

impl From<&EIP1559SignedTransaction> for EIP1559TransactionRequest {
    fn from(t: &EIP1559SignedTransaction) -> Self {
        Self {
            chain_id: t.chain_id,
            nonce: t.nonce,
            max_priority_fee_per_gas: t.max_priority_fee_per_gas,
            max_fee_per_gas: t.max_fee_per_gas,
            gas_limit: t.gas_limit,
            kind: t.kind,
            value: t.value,
            input: t.input.clone(),
            access_list: t.access_list.0.clone(),
        }
    }
}

impl rlp::Encodable for EIP1559TransactionRequest {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(9);
        s.append(&self.chain_id);
        s.append(&self.nonce);
        s.append(&self.max_priority_fee_per_gas);
        s.append(&self.max_fee_per_gas);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append_list(&self.access_list);
    }
}
