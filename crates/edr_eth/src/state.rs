use revm_primitives::HashMap;

use crate::{account::BasicAccount, trie::sec_trie_root, Address, B256, U256};

/// State mapping of addresses to accounts.
pub type State = HashMap<Address, BasicAccount>;

/// Account storage mapping of indices to values.
pub type Storage = HashMap<U256, U256>;

/// Calculates the state root hash of the provided state.
pub fn state_root<'a, I>(state: I) -> B256
where
    I: IntoIterator<Item = (&'a Address, &'a BasicAccount)>,
{
    sec_trie_root(state.into_iter().map(|(address, account)| {
        let account = alloy_rlp::encode(account);
        (address, account)
    }))
}

/// Calculates the storage root hash of the provided storage.
pub fn storage_root<'a, I>(storage: I) -> B256
where
    I: IntoIterator<Item = (&'a U256, &'a U256)>,
{
    sec_trie_root(storage.into_iter().map(|(index, value)| {
        let value = alloy_rlp::encode(value);
        (index.to_be_bytes::<32>(), value)
    }))
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;
    use crate::trie::KECCAK_NULL_RLP;

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
        const EXPECTED: &str = "0x5766c887a7240e4d1c035ccd3830a2f6a0c03d213a9f0b9b27c774916a4abcce";

        let mut state = State::default();

        for idx in 1..=8u8 {
            let mut address = Address::ZERO;
            address.0[19] = idx;
            state.insert(address, BasicAccount::default());
        }

        assert_eq!(state_root(&state), B256::from_str(EXPECTED).unwrap());
    }
}
