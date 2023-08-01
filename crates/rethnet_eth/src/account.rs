// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/proof.rs

//! Ethereum account types

use revm_primitives::{ruint, AccountInfo};

use crate::{trie::KECCAK_NULL_RLP, B256, U256};

pub use revm_primitives::KECCAK_EMPTY;

/// Basic account type.
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
pub struct BasicAccount {
    /// Nonce of the account.
    pub nonce: u64,
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
            nonce: 0,
            code_hash: KECCAK_EMPTY,
            storage_root: KECCAK_NULL_RLP,
        }
    }
}

impl From<BasicAccount> for AccountInfo {
    fn from(account: BasicAccount) -> Self {
        Self {
            balance: account.balance,
            nonce: account.nonce,
            code_hash: account.code_hash,
            code: None,
        }
    }
}

impl From<(&AccountInfo, B256)> for BasicAccount {
    fn from((account_info, storage_root): (&AccountInfo, B256)) -> Self {
        Self {
            nonce: account_info.nonce,
            balance: account_info.balance,
            storage_root,
            code_hash: account_info.code_hash,
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
