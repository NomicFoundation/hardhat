use std::sync::OnceLock;

use revm_primitives::{keccak256, ruint::aliases::U64, Address, Bytes, B256, U256};

use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    transaction::{kind::TransactionKind, request::Eip1559TransactionRequest},
    utils::envelop_bytes,
};

#[derive(Clone, Debug, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Eip1559SignedTransaction {
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub chain_id: u64,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::bytes"))]
    pub input: Bytes,
    pub access_list: AccessList,
    pub odd_y_parity: bool,
    pub r: U256,
    pub s: U256,
    /// Cached transaction hash
    #[cfg_attr(feature = "serde", serde(skip))]
    pub hash: OnceLock<B256>,
}

impl Eip1559SignedTransaction {
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

        signature.recover(Eip1559TransactionRequest::from(self).hash())
    }
}

impl PartialEq for Eip1559SignedTransaction {
    fn eq(&self, other: &Self) -> bool {
        self.chain_id == other.chain_id
            && self.nonce == other.nonce
            && self.max_priority_fee_per_gas == other.max_priority_fee_per_gas
            && self.max_fee_per_gas == other.max_fee_per_gas
            && self.gas_limit == other.gas_limit
            && self.kind == other.kind
            && self.value == other.value
            && self.input == other.input
            && self.access_list == other.access_list
            && self.odd_y_parity == other.odd_y_parity
            && self.r == other.r
            && self.s == other.s
    }
}

impl rlp::Encodable for Eip1559SignedTransaction {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(12);
        s.append(&U64::from(self.chain_id));
        s.append(&U64::from(self.nonce));
        s.append(&self.max_priority_fee_per_gas);
        s.append(&self.max_fee_per_gas);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append(&self.access_list);
        s.append(&self.odd_y_parity);
        s.append(&self.r);
        s.append(&self.s);
    }
}

impl rlp::Decodable for Eip1559SignedTransaction {
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
            kind: rlp.val_at(5)?,
            value: rlp.val_at(6)?,
            input: rlp.val_at::<Vec<u8>>(7)?.into(),
            access_list: rlp.val_at(8)?,
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

    use k256::SecretKey;
    use revm_primitives::Address;

    use super::*;
    use crate::{
        access_list::AccessListItem,
        signature::{secret_key_from_str, secret_key_to_address},
    };

    const DUMMY_SECRET_KEY: &str =
        "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109";

    fn dummy_request() -> Eip1559TransactionRequest {
        let to = Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e").unwrap();
        let input = hex::decode("1234").unwrap();
        Eip1559TransactionRequest {
            chain_id: 1,
            nonce: 1,
            max_priority_fee_per_gas: U256::from(2),
            max_fee_per_gas: U256::from(5),
            gas_limit: 3,
            kind: TransactionKind::Call(to),
            value: U256::from(4),
            input: Bytes::from(input),
            access_list: vec![AccessListItem {
                address: Address::zero(),
                storage_keys: vec![B256::zero(), B256::from(U256::from(1))],
            }],
        }
    }

    fn dummy_secret_key() -> SecretKey {
        secret_key_from_str(DUMMY_SECRET_KEY).unwrap()
    }

    #[test]
    fn test_eip1559_signed_transaction_encoding() {
        // Generated by Hardhat
        let expected =
            hex::decode("f8be010102050394c014ba5ec014ba5ec014ba5ec014ba5ec014ba5e04821234f85bf859940000000000000000000000000000000000000000f842a00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000101a07764e376b5b4090264f73abee68ebb5fdc9f76050eff800237e5a2bedadcd7eda044c0ae9b07c75cf4e0a14aebfe792ab2fdccd7d89550b166b1b4a4ece0054f02")
                .unwrap();

        let request = dummy_request();
        let signed = request.sign(&dummy_secret_key()).unwrap();

        let encoded = rlp::encode(&signed);
        assert_eq!(expected, encoded.to_vec());
    }

    #[test]
    fn test_eip1559_signed_transaction_hash() {
        // Generated by hardhat
        let expected = B256::from_slice(
            &hex::decode("043d6f6de2e81af3f48d6c64d4cdfc7576f8754c73569bc6903e50f3c92988d8")
                .unwrap(),
        );

        let request = dummy_request();
        let signed = request.sign(&dummy_secret_key()).unwrap();

        assert_eq!(expected, *signed.hash());
    }

    #[test]
    fn test_eip1559_signed_transaction_recover() {
        let request = dummy_request();

        let signed = request.sign(&dummy_secret_key()).unwrap();

        let expected = secret_key_to_address(DUMMY_SECRET_KEY)
            .expect("Failed to retrieve address from secret key");
        assert_eq!(expected, signed.recover().expect("should succeed"));
    }

    #[test]
    fn test_eip1559_signed_transaction_rlp() {
        let request = dummy_request();
        let signed = request.sign(&dummy_secret_key()).unwrap();

        let encoded = rlp::encode(&signed);
        assert_eq!(signed, rlp::decode(&encoded).unwrap());
    }
}
