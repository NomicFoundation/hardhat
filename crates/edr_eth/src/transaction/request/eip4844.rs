use std::sync::OnceLock;

use k256::SecretKey;
use revm_primitives::{keccak256, Address, Bytes, B256, U256};

use crate::signature::SignatureError;
use crate::{
    access_list::AccessListItem, signature::Signature, transaction::Eip4844SignedTransaction,
    utils::envelop_bytes,
};

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
pub struct Eip4844TransactionRequest {
    pub chain_id: u64,
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    pub max_fee_per_blob_gas: U256,
    pub gas_limit: u64,
    pub to: Address,
    pub value: U256,
    pub input: Bytes,
    pub access_list: Vec<AccessListItem>,
    pub blob_hashes: Vec<B256>,
}

impl Eip4844TransactionRequest {
    /// Computes the hash of the transaction.
    pub fn hash(&self) -> B256 {
        let encoded = rlp::encode(self);

        keccak256(&envelop_bytes(2, &encoded))
    }

    pub fn sign(self, private_key: &SecretKey) -> Result<Eip4844SignedTransaction, SignatureError> {
        let hash = self.hash();

        let signature = Signature::new(hash, private_key)?;

        Ok(Eip4844SignedTransaction {
            chain_id: self.chain_id,
            nonce: self.nonce,
            max_priority_fee_per_gas: self.max_priority_fee_per_gas,
            max_fee_per_gas: self.max_fee_per_gas,
            max_fee_per_blob_gas: self.max_fee_per_blob_gas,
            gas_limit: self.gas_limit,
            to: self.to,
            value: self.value,
            input: self.input,
            access_list: self.access_list.into(),
            blob_hashes: self.blob_hashes,
            odd_y_parity: signature.odd_y_parity(),
            r: signature.r,
            s: signature.s,
            hash: OnceLock::new(),
        })
    }
}

impl From<&Eip4844SignedTransaction> for Eip4844TransactionRequest {
    fn from(t: &Eip4844SignedTransaction) -> Self {
        Self {
            chain_id: t.chain_id,
            nonce: t.nonce,
            max_priority_fee_per_gas: t.max_priority_fee_per_gas,
            max_fee_per_gas: t.max_fee_per_gas,
            max_fee_per_blob_gas: t.max_fee_per_blob_gas,
            gas_limit: t.gas_limit,
            to: t.to,
            value: t.value,
            input: t.input.clone(),
            access_list: t.access_list.0.clone(),
            blob_hashes: t.blob_hashes.clone(),
        }
    }
}

impl rlp::Encodable for Eip4844TransactionRequest {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(11);
        s.append(&self.chain_id);
        s.append(&self.nonce);
        s.append(&self.max_priority_fee_per_gas);
        s.append(&self.max_fee_per_gas);
        s.append(&self.gas_limit);
        s.append(&self.to.as_bytes());
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append_list(&self.access_list);
        s.append(&self.max_fee_per_blob_gas);

        let blob_hashes = self
            .blob_hashes
            .iter()
            .map(B256::as_bytes)
            .collect::<Vec<_>>();

        s.append_list::<&[u8], &[u8]>(blob_hashes.as_slice());
    }
}
