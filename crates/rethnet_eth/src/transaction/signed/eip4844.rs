use std::sync::OnceLock;

use bytes::Bytes;
use revm_primitives::{
    keccak256,
    ruint::aliases::{U160, U64},
    Address, B256, U256,
};

use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    transaction::Eip4844TransactionRequest,
    utils::envelop_bytes,
};

#[derive(Clone, Debug, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Eip4844SignedTransaction {
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub chain_id: u64,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    pub max_fee_per_blob_gas: U256,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub gas_limit: u64,
    pub to: Address,
    pub value: U256,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::bytes"))]
    pub input: Bytes,
    pub access_list: AccessList,
    pub blob_hashes: Vec<B256>,
    pub odd_y_parity: bool,
    pub r: U256,
    pub s: U256,
    /// Cached transaction hash
    #[cfg_attr(feature = "serde", serde(skip))]
    pub hash: OnceLock<B256>,
}

impl Eip4844SignedTransaction {
    pub fn nonce(&self) -> &u64 {
        &self.nonce
    }

    pub fn hash(&self) -> &B256 {
        self.hash.get_or_init(|| {
            let encoded = rlp::encode(self);
            let enveloped = envelop_bytes(2, &encoded);

            keccak256(&enveloped)
        })
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        let signature = Signature {
            r: self.r,
            s: self.s,
            v: u64::from(self.odd_y_parity),
        };

        signature.recover(Eip4844TransactionRequest::from(self).hash())
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

impl rlp::Encodable for Eip4844SignedTransaction {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(14);
        s.append(&U64::from(self.chain_id));
        s.append(&U64::from(self.nonce));
        s.append(&self.max_priority_fee_per_gas);
        s.append(&self.max_fee_per_gas);
        s.append(&self.gas_limit);
        s.append(&self.to.as_bytes());
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append(&self.access_list);
        s.append(&self.max_fee_per_blob_gas);

        let blob_hashes = self
            .blob_hashes
            .iter()
            .map(B256::as_bytes)
            .collect::<Vec<_>>();

        s.append_list::<&[u8], &[u8]>(blob_hashes.as_slice());
        s.append(&self.odd_y_parity);
        s.append(&self.r);
        s.append(&self.s);
    }
}

impl rlp::Decodable for Eip4844SignedTransaction {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        if rlp.item_count()? != 12 {
            return Err(rlp::DecoderError::RlpIncorrectListLen);
        }

        Ok(Self {
            chain_id: rlp.val_at(0)?,
            nonce: rlp.val_at(1)?,
            max_priority_fee_per_gas: rlp.val_at(2)?,
            max_fee_per_gas: rlp.val_at(3)?,
            gas_limit: rlp.val_at(4)?,
            to: Address::from(rlp.val_at::<U160>(5)?.to_be_bytes()),
            value: rlp.val_at(6)?,
            input: rlp.val_at::<Vec<u8>>(7)?.into(),
            access_list: rlp.val_at(8)?,
            max_fee_per_blob_gas: rlp.val_at(9)?,
            blob_hashes: {
                let blob_hashes = rlp.list_at::<U256>(1)?;
                blob_hashes
                    .into_iter()
                    .map(|hash| B256::from(hash.to_be_bytes()))
                    .collect()
            },
            odd_y_parity: rlp.val_at(9)?,
            r: rlp.val_at(10)?,
            s: rlp.val_at(11)?,
            hash: OnceLock::new(),
        })
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use revm_primitives::Address;
    use secp256k1::{Secp256k1, SecretKey};

    use crate::{access_list::AccessListItem, signature::private_key_to_address};

    use super::*;

    const DUMMY_PRIVATE_KEY: &str =
        "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109";

    fn dummy_request() -> Eip4844TransactionRequest {
        let to = Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e").unwrap();
        let input = hex::decode("1234").unwrap();
        Eip4844TransactionRequest {
            chain_id: 1,
            nonce: 1,
            max_priority_fee_per_gas: U256::from(2),
            max_fee_per_gas: U256::from(5),
            max_fee_per_blob_gas: U256::from(7),
            gas_limit: 3,
            to,
            value: U256::from(4),
            input: Bytes::from(input),
            access_list: vec![AccessListItem {
                address: Address::zero(),
                storage_keys: vec![B256::zero(), B256::from(U256::from(1))],
            }],
            blob_hashes: vec![B256::zero(), B256::from(U256::from(1))],
        }
    }

    fn dummy_private_key() -> SecretKey {
        SecretKey::from_str(DUMMY_PRIVATE_KEY).unwrap()
    }

    #[test]
    fn eip4884_signed_transaction_encoding() {
        // Generated by Hardhat
        let expected =
            hex::decode("f8be010102050394c014ba5ec014ba5ec014ba5ec014ba5ec014ba5e04821234f85bf859940000000000000000000000000000000000000000f842a00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000101a07764e376b5b4090264f73abee68ebb5fdc9f76050eff800237e5a2bedadcd7eda044c0ae9b07c75cf4e0a14aebfe792ab2fdccd7d89550b166b1b4a4ece0054f02")
                .unwrap();

        let request = dummy_request();
        let signed = request.sign(&dummy_private_key());

        let encoded = rlp::encode(&signed);
        assert_eq!(expected, encoded.to_vec());
    }

    #[test]
    fn eip4884_signed_transaction_hash() {
        // Generated by hardhat
        let expected = B256::from_slice(
            &hex::decode("043d6f6de2e81af3f48d6c64d4cdfc7576f8754c73569bc6903e50f3c92988d8")
                .unwrap(),
        );

        let request = dummy_request();
        let signed = request.sign(&dummy_private_key());

        assert_eq!(expected, *signed.hash());
    }

    #[test]
    fn eip4884_signed_transaction_recover() {
        let request = dummy_request();

        let signed = request.sign(&dummy_private_key());

        let expected = private_key_to_address(&Secp256k1::signing_only(), DUMMY_PRIVATE_KEY)
            .expect("Failed to retrieve address from private key");
        assert_eq!(expected, signed.recover().expect("should succeed"));
    }

    #[test]
    fn eip4884_signed_transaction_rlp() {
        let request = dummy_request();
        let signed = request.sign(&dummy_private_key());

        let encoded = rlp::encode(&signed);
        assert_eq!(signed, rlp::decode(&encoded).unwrap());
    }
}
