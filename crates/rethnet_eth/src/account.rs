// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/proof.rs

//! Ethereum account types

use hex_literal::hex;

use crate::{trie::KECCAK_NULL_RLP, B256, U256};

/// The KECCAK for empty code.
pub const KECCAK_EMPTY: revm::B256 = revm::B256(hex!(
    "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
));

/// Basic account type.
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
pub struct BasicAccount {
    /// Nonce of the account.
    pub nonce: U256,
    /// Balance of the account.
    pub balance: U256,
    /// Storage root of the account.
    pub storage_root: B256,
    /// Code hash of the account.
    pub code_hash: B256,
}

impl Default for BasicAccount {
    fn default() -> Self {
        BasicAccount {
            balance: U256::ZERO,
            nonce: U256::ZERO,
            code_hash: KECCAK_EMPTY,
            storage_root: KECCAK_NULL_RLP,
        }
    }
}

impl rlp::Encodable for BasicAccount {
    fn rlp_append(&self, stream: &mut rlp::RlpStream) {
        stream.begin_list(4);
        stream.append(&self.nonce);
        stream.append(&self.balance);
        stream.append(&ruint::aliases::B256::from_be_bytes(self.storage_root.0));
        stream.append(&ruint::aliases::B256::from_be_bytes(self.code_hash.0));
    }
}

impl rlp::Decodable for BasicAccount {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
        let result = BasicAccount {
            nonce: rlp.val_at(0)?,
            balance: rlp.val_at(1)?,
            storage_root: B256::from(rlp.val_at::<U256>(2)?.to_be_bytes()),
            code_hash: B256::from(rlp.val_at::<U256>(3)?.to_be_bytes()),
        };
        Ok(result)
    }
}
