use hashbrown::HashMap;
use primitive_types::H256;
use ruint::aliases::U256;

use crate::{account::BasicAccount, trie::sec_trie_root, Address};

/// State mapping of addresses to accounts.
pub type State = HashMap<Address, BasicAccount>;

/// Account storage mapping of indices to values.
pub type Storage = HashMap<U256, U256>;

pub fn state_root(state: &State) -> H256 {
    sec_trie_root(state.iter().map(|(address, account)| {
        let account = rlp::encode(account);
        (address, account)
    }))
}

pub fn storage_root(storage: &Storage) -> H256 {
    sec_trie_root(storage.iter().map(|(index, value)| {
        let index = H256::from(index.to_be_bytes());
        let value = rlp::encode(value);
        (index, value)
    }))
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use crate::trie::KECCAK_NULL_RLP;

    use super::*;

    #[test]
    fn empty_state_root() {
        let state = State::default();

        assert_eq!(state_root(&state), KECCAK_NULL_RLP);
    }

    #[test]
    fn empty_storage_root() {
        let storage = Storage::default();

        assert_eq!(storage_root(&storage), KECCAK_NULL_RLP);
    }

    #[test]
    fn precompiles_state_root() {
        let mut state = State::default();

        for idx in 1..=8 {
            let mut address = Address::zero();
            address.0[19] = idx;
            state.insert(address, BasicAccount::default());
        }

        const EXPECTED: &str = "0x5766c887a7240e4d1c035ccd3830a2f6a0c03d213a9f0b9b27c774916a4abcce";
        assert_eq!(state_root(&state), H256::from_str(EXPECTED).unwrap())
    }
}
