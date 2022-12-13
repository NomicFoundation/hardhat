// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/proof.rs

//! Return types for `eth_getProof`

use crate::trie::KECCAK_NULL_RLP;
use primitive_types::H256;
use revm::KECCAK_EMPTY;
use ruint::aliases::U256;

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
    pub storage_root: H256,
    /// Code hash of the account.
    pub code_hash: H256,
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
        stream.append(&self.storage_root);
        stream.append(&self.code_hash);
    }
}

impl rlp::Decodable for BasicAccount {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
        let result = BasicAccount {
            nonce: rlp.val_at(0)?,
            balance: rlp.val_at(1)?,
            storage_root: rlp.val_at(2)?,
            code_hash: rlp.val_at(3)?,
        };
        Ok(result)
    }
}
