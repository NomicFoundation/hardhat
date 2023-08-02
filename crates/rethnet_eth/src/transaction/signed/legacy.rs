use bytes::Bytes;
use revm_primitives::{keccak256, Address, B256, U256};

use crate::{
    signature::{Signature, SignatureError},
    transaction::{kind::TransactionKind, request::LegacyTransactionRequest},
};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct LegacySignedTransaction {
    pub nonce: u64,
    pub gas_price: U256,
    pub gas_limit: u64,
    pub kind: TransactionKind,
    pub value: U256,
    pub input: Bytes,
    pub signature: Signature,
}

impl LegacySignedTransaction {
    pub fn nonce(&self) -> &u64 {
        &self.nonce
    }

    pub fn hash(&self) -> B256 {
        keccak256(&rlp::encode(self))
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        self.signature
            .recover(LegacyTransactionRequest::from(self).hash())
    }

    pub fn chain_id(&self) -> Option<u64> {
        if self.signature.v > 36 {
            Some((self.signature.v - 35) / 2)
        } else {
            None
        }
    }

    /// See <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md>
    /// > If you do, then the v of the signature MUST be set to {0,1} + `CHAIN_ID` * 2 + 35 where
    /// > {0,1} is the parity of the y value of the curve point for which r is the x-value in the
    /// > secp256k1 signing process.
    pub fn meets_eip155(&self, chain_id: u64) -> bool {
        let double_chain_id = chain_id.saturating_mul(2);
        let v = self.signature.v;
        v == double_chain_id + 35 || v == double_chain_id + 36
    }
}

impl rlp::Encodable for LegacySignedTransaction {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(9);
        s.append(&self.nonce);
        s.append(&self.gas_price);
        s.append(&self.gas_limit);
        s.append(&self.kind);
        s.append(&self.value);
        s.append(&self.input.as_ref());
        s.append(&self.signature.v);
        s.append(&self.signature.r);
        s.append(&self.signature.s);
    }
}

impl rlp::Decodable for LegacySignedTransaction {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        if rlp.item_count()? != 9 {
            return Err(rlp::DecoderError::RlpIncorrectListLen);
        }

        let v = rlp.val_at(6)?;
        let r = rlp.val_at::<U256>(7)?;
        let s = rlp.val_at::<U256>(8)?;

        Ok(Self {
            nonce: rlp.val_at(0)?,
            gas_price: rlp.val_at(1)?,
            gas_limit: rlp.val_at(2)?,
            kind: rlp.val_at(3)?,
            value: rlp.val_at(4)?,
            input: rlp.val_at::<Vec<u8>>(5)?.into(),
            signature: Signature { v, r, s },
        })
    }
}
