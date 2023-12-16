use std::sync::OnceLock;

use alloy_rlp::RlpEncodable;
use k256::SecretKey;
use revm_primitives::{keccak256, Address, Bytes, B256, U256};

use crate::{
    access_list::AccessListItem,
    signature::{Signature, SignatureError},
    transaction::{request::fake_signature::make_fake_signature, Eip4844SignedTransaction},
    utils::envelop_bytes,
};

#[derive(Clone, Debug, PartialEq, Eq, RlpEncodable)]
pub struct Eip4844TransactionRequest {
    // The order of these fields determines encoding order.
    pub chain_id: u64,
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    pub gas_limit: u64,
    pub to: Address,
    pub value: U256,
    pub input: Bytes,
    pub access_list: Vec<AccessListItem>,
    pub max_fee_per_blob_gas: U256,
    pub blob_hashes: Vec<B256>,
}

impl Eip4844TransactionRequest {
    /// Computes the hash of the transaction.
    pub fn hash(&self) -> B256 {
        let encoded = alloy_rlp::encode(self);

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

    pub fn fake_sign(self, address: &Address) -> Eip4844SignedTransaction {
        let signature = make_fake_signature::<1>(address);

        Eip4844SignedTransaction {
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
        }
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

#[cfg(test)]
pub(crate) mod tests {
    use std::str::FromStr;

    use revm_primitives::Address;

    use super::*;
    use crate::transaction::request::fake_signature::tests::test_fake_sign_properties;

    fn dummy_request() -> Eip4844TransactionRequest {
        // From https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/tx/test/eip4844.spec.ts#L68
        Eip4844TransactionRequest {
            chain_id: 0x28757b3,
            nonce: 0,
            max_priority_fee_per_gas: U256::from(0x12a05f200u64),
            max_fee_per_gas: U256::from(0x12a05f200u64),
            max_fee_per_blob_gas: U256::from(0xb2d05e00u64),
            gas_limit: 0x33450,
            to: Address::from_str("0xffb38a7a99e3e2335be83fc74b7faa19d5531243").unwrap(),
            value: U256::from(0xbc614eu64),
            input: Bytes::default(),
            access_list: Vec::new(),
            blob_hashes: vec![B256::from_str(
                "0x01b0a4cdd5f55589f5c5b4d46c76704bb6ce95c0a8c09f77f197a57808dded28",
            )
            .unwrap()],
        }
    }

    test_fake_sign_properties!();

    // Hardhat doesn't support EIP-4844 yet, hence no fake signature test
    // vector.
}
