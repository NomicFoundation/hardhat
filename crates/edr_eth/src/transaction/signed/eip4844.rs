use std::sync::OnceLock;

use alloy_rlp::{RlpDecodable, RlpEncodable};
use revm_primitives::{keccak256, GAS_PER_BLOB};

use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    transaction::{fake_signature::recover_fake_signature, Eip4844TransactionRequest},
    utils::envelop_bytes,
    Address, Bytes, B256, U256,
};

#[derive(Clone, Debug, Eq, RlpDecodable, RlpEncodable)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Eip4844SignedTransaction {
    // The order of these fields determines de-/encoding order.
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub chain_id: u64,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub gas_limit: u64,
    pub to: Address,
    pub value: U256,
    pub input: Bytes,
    pub access_list: AccessList,
    pub max_fee_per_blob_gas: U256,
    pub blob_hashes: Vec<B256>,
    pub odd_y_parity: bool,
    pub r: U256,
    pub s: U256,
    /// Cached transaction hash
    #[rlp(default)]
    #[rlp(skip)]
    #[cfg_attr(feature = "serde", serde(skip))]
    pub hash: OnceLock<B256>,
    /// Whether the signed transaction is from an impersonated account.
    #[rlp(default)]
    #[rlp(skip)]
    #[cfg_attr(feature = "serde", serde(skip))]
    pub is_fake: bool,
}

impl Eip4844SignedTransaction {
    pub fn nonce(&self) -> &u64 {
        &self.nonce
    }

    pub fn hash(&self) -> &B256 {
        self.hash.get_or_init(|| {
            let encoded = alloy_rlp::encode(self);
            let enveloped = envelop_bytes(3, &encoded);

            keccak256(enveloped)
        })
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        let signature = Signature {
            r: self.r,
            s: self.s,
            v: u64::from(self.odd_y_parity),
        };

        if self.is_fake {
            return Ok(recover_fake_signature(&signature));
        }

        signature.recover(Eip4844TransactionRequest::from(self).hash())
    }

    /// Total blob gas used by the transaction.
    pub fn total_blob_gas(&self) -> u64 {
        GAS_PER_BLOB * self.blob_hashes.len() as u64
    }
}

impl PartialEq for Eip4844SignedTransaction {
    fn eq(&self, other: &Self) -> bool {
        self.chain_id == other.chain_id
            && self.nonce == other.nonce
            && self.max_priority_fee_per_gas == other.max_priority_fee_per_gas
            && self.max_fee_per_gas == other.max_fee_per_gas
            && self.max_fee_per_blob_gas == other.max_fee_per_blob_gas
            && self.gas_limit == other.gas_limit
            && self.to == other.to
            && self.value == other.value
            && self.input == other.input
            && self.access_list == other.access_list
            && self.blob_hashes == other.blob_hashes
            && self.odd_y_parity == other.odd_y_parity
            && self.r == other.r
            && self.s == other.s
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;

    // From https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/tx/test/eip4844.spec.ts#L68
    fn dummy_transaction() -> Eip4844SignedTransaction {
        Eip4844SignedTransaction {
            chain_id: 0x28757b3,
            nonce: 0,
            max_priority_fee_per_gas: U256::from(0x12a05f200u64),
            max_fee_per_gas: U256::from(0x12a05f200u64),
            max_fee_per_blob_gas: U256::from(0xb2d05e00u64),
            gas_limit: 0x33450,
            to: Address::from_str("0xffb38a7a99e3e2335be83fc74b7faa19d5531243").unwrap(),
            value: U256::from(0xbc614eu64),
            input: Bytes::default(),
            access_list: Vec::new().into(),
            blob_hashes: vec![B256::from_str(
                "0x01b0a4cdd5f55589f5c5b4d46c76704bb6ce95c0a8c09f77f197a57808dded28",
            )
            .unwrap()],
            r: U256::from_str("0x8a83833ec07806485a4ded33f24f5cea4b8d4d24dc8f357e6d446bcdae5e58a7")
                .unwrap(),
            s: U256::from_str("0x68a2ba422a50cf84c0b5fcbda32ee142196910c97198ffd99035d920c2b557f8")
                .unwrap(),
            odd_y_parity: false,
            hash: OnceLock::new(),
            is_fake: false,
        }
    }

    #[test]
    fn eip4884_signed_transaction_encoding() {
        // From https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/tx/test/eip4844.spec.ts#L86
        let expected =
            hex::decode("f89b84028757b38085012a05f20085012a05f2008303345094ffb38a7a99e3e2335be83fc74b7faa19d553124383bc614e80c084b2d05e00e1a001b0a4cdd5f55589f5c5b4d46c76704bb6ce95c0a8c09f77f197a57808dded2880a08a83833ec07806485a4ded33f24f5cea4b8d4d24dc8f357e6d446bcdae5e58a7a068a2ba422a50cf84c0b5fcbda32ee142196910c97198ffd99035d920c2b557f8")
                .unwrap();

        let signed = dummy_transaction();
        let encoded = alloy_rlp::encode(&signed);
        assert_eq!(expected, encoded);
    }

    #[test]
    fn eip4884_signed_transaction_hash() {
        // From https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/tx/test/eip4844.spec.ts#L86
        let expected =
            B256::from_str("0xe5e02be0667b6d31895d1b5a8b916a6761cbc9865225c6144a3e2c50936d173e")
                .unwrap();

        let signed = dummy_transaction();
        assert_eq!(expected, *signed.hash());
    }
}
