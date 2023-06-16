use bytes::Bytes;
use revm_primitives::{keccak256, Address, B256, U256};

use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    transaction::{kind::TransactionKind, request::EIP1559TransactionRequest},
};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct EIP1559SignedTransaction {
    pub chain_id: u64,
    pub nonce: u64,
    pub max_priority_fee_per_gas: U256,
    pub max_fee_per_gas: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub access_list: AccessList,
    pub odd_y_parity: bool,
    pub r: B256,
    pub s: B256,
}

impl EIP1559SignedTransaction {
    pub fn nonce(&self) -> &u64 {
        &self.nonce
    }

    pub fn hash(&self) -> B256 {
        let encoded = rlp::encode(self);
        let mut out = vec![0; 1 + encoded.len()];
        out[0] = 2;
        out[1..].copy_from_slice(&encoded);
        keccak256(&out)
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        let mut sig = [0u8; 65];
        sig[0..32].copy_from_slice(&self.r[..]);
        sig[32..64].copy_from_slice(&self.s[..]);
        sig[64] = self.odd_y_parity as u8;
        let signature = Signature::try_from(&sig[..])?;
        signature.recover(EIP1559TransactionRequest::from(self).hash())
    }
}

impl rlp::Encodable for EIP1559SignedTransaction {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(12);
        s.append(&self.chain_id);
        s.append(&self.nonce);
        s.append(&self.max_priority_fee_per_gas);
        s.append(&self.max_fee_per_gas);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append(&self.access_list);
        s.append(&self.odd_y_parity);
        s.append(&U256::from_be_bytes(self.r.0));
        s.append(&U256::from_be_bytes(self.s.0));
    }
}

impl rlp::Decodable for EIP1559SignedTransaction {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
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
            r: B256::from(rlp.val_at::<U256>(10)?.to_be_bytes()),
            s: B256::from(rlp.val_at::<U256>(11)?.to_be_bytes()),
        })
    }
}
