use std::{collections::BTreeMap, fmt::Debug};

use edr_eth::{account::BasicAccount, Address, B256, U256};
use hasher::{Hasher, HasherKeccak};
use revm::primitives::{Account, AccountInfo, HashMap};
use rpds::HashTrieMapSync;

use crate::state::trie::{
    state_trie::{StateTrie, StateTrieMutation},
    storage_trie::StorageTrie,
};

type StorageTries = HashTrieMapSync<Address, StorageTrie>;

/// A trie for maintaining the state of accounts and their storage.
#[derive(Clone, Debug, Default)]
pub struct AccountTrie {
    state_trie: StateTrie,
    storage_tries: StorageTries,
}

impl<'a> AccountTrie {
    /// Constructs a `TrieState` from an (address -> account) mapping.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: &HashMap<Address, AccountInfo>) -> Self {
        let mut account_trie = Self::default();

        {
            let mut account_trie_mutation = account_trie.mutate();

            accounts.iter().for_each(|(address, account_info)| {
                account_trie_mutation.init_account(address, account_info);
            });
        }

        account_trie
    }

    /// Retrieves an account corresponding to the specified address from the
    /// state.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn account(&self, address: &Address) -> Option<BasicAccount> {
        self.state_trie.account(address)
    }

    /// Retrieves the storage corresponding to the account at the
    /// specified address and the specified index, if they exist.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn account_storage_slot(&self, address: &Address, index: &U256) -> Option<U256> {
        self.storage_tries
            .get(address)
            .and_then(|storage_trie| storage_trie.storage_slot(index))
    }

    /// Commits changes to the state.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn commit(&mut self, changes: &HashMap<Address, Account>) {
        let mut account_trie_mutation = self.mutate();

        changes.iter().for_each(|(address, account)| {
            if account.is_touched() {
                if (account.is_empty() && !account.is_created()) || account.is_selfdestructed() {
                    // Removes account only if it exists, so safe to use for empty, touched accounts
                    account_trie_mutation.remove_account(address);
                } else {
                    // TODO question to reviewers: does it come from the Ethereum protocol or is it
                    // a quirk of our implementation that an account can already have a storage trie
                    // when it's status is created?
                    if account.is_created() {
                        // We can simply remove the storage trie db, as it will get reinitialized in
                        // the next operation
                        account_trie_mutation.remove_account_storage(address);
                    }

                    account_trie_mutation.insert_account_storage(address, account);
                }
            }
        });
    }

    /// Sets the provided account at the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn set_account(&mut self, address: &Address, account_info: &AccountInfo) {
        self.mutate().insert_account_info(address, account_info);
    }

    /// Removes the account at the specified address, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn remove_account(&mut self, address: &Address) -> Option<BasicAccount> {
        self.mutate().remove_account(address)
    }

    /// Serializes the state using ordering of addresses and storage indices.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn serialize(&self) -> String {
        #[derive(serde::Serialize)]
        struct StateAccount {
            /// Balance of the account.
            pub balance: U256,
            /// Code hash of the account.
            pub code_hash: B256,
            /// Nonce of the account.
            pub nonce: u64,
            /// Storage
            pub storage: BTreeMap<B256, U256>,
            /// Storage root of the account.
            pub storage_root: B256,
        }

        let state: BTreeMap<Address, StateAccount> = self
            .storage_tries
            .iter()
            .filter_map(|(address, storage_trie)| {
                let account = self.state_trie.account(address)
                    .unwrap_or_else(|| {
                        let hashed_address = HasherKeccak::new().digest(address.as_slice());
                        panic!("Account with address '{address}' and hashed address '{hashed_address:?}' must exist in state, if a storage trie is stored for it")
                    });

                if account == BasicAccount::default() {
                    None
                } else {
                    let account = StateAccount {
                        balance: account.balance,
                        code_hash: account.code_hash,
                        nonce: account.nonce,
                        storage: storage_trie.storage(),
                        storage_root: storage_trie.root(),
                    };

                    Some((*address, account))
                }})
            .collect();

        serde_json::to_string_pretty(&state).unwrap()
    }

    /// Sets the storage slot at the specified address and index to the provided
    /// value.
    ///
    /// Returns the old storage slot value.
    #[cfg_attr(
        feature = "tracing",
        tracing::instrument(skip(self, default_account_fn))
    )]
    pub fn set_account_storage_slot<ErrorT>(
        &mut self,
        address: &Address,
        index: &U256,
        value: &U256,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, ErrorT>,
    ) -> Result<Option<U256>, ErrorT> {
        self.mutate()
            .insert_storage_slot(address, index, value, default_account_fn)
    }

    /// Retrieves the trie's state root.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn state_root(&self) -> B256 {
        self.state_trie.root()
    }

    /// Retrieves the storage root of the account at the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn storage_root(&self, address: &Address) -> Option<B256> {
        self.storage_tries.get(address).map(StorageTrie::root)
    }

    fn mutate(&'a mut self) -> AccountTrieMutation<'a> {
        AccountTrieMutation {
            state_trie_mut: self.state_trie.mutate(),
            storage_tries: &mut self.storage_tries,
        }
    }
}

/// Helper struct that allows setting and removing multiple accounts and then
/// updates the state root.
struct AccountTrieMutation<'a> {
    state_trie_mut: StateTrieMutation<'a>,
    storage_tries: &'a mut StorageTries,
}

impl<'a> AccountTrieMutation<'a> {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn init_account(&mut self, address: &Address, account_info: &AccountInfo) {
        let storage_trie = StorageTrie::default();
        let storage_root = storage_trie.root();

        self.storage_tries.insert_mut(*address, storage_trie);

        self.state_trie_mut.insert_account_info_with_storage_root(
            address,
            account_info,
            storage_root,
        );
    }

    /// Create or update teh account info. Ensures that a storage trie exists.
    pub fn insert_account_info(&mut self, address: &Address, account_info: &AccountInfo) {
        let storage_root = if let Some(storage_trie) = self.storage_tries.get_mut(address) {
            storage_trie.root()
        } else {
            let storage_trie = StorageTrie::default();

            let root = storage_trie.root();
            self.storage_tries.insert_mut(*address, storage_trie);
            root
        };

        self.state_trie_mut.insert_account_info_with_storage_root(
            address,
            account_info,
            storage_root,
        );
    }

    /// Create or update the account storage.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn insert_account_storage(&mut self, address: &Address, account: &Account) {
        let storage_root = if let Some(storage_trie) = self.storage_tries.get_mut(address) {
            // Dropping the mutation will update the storage trie root
            if !account.storage.is_empty() {
                let mut storage_trie_mutation = storage_trie.mutate();
                storage_trie_mutation.set_storage_slots(&account.storage);
            }

            storage_trie.root()
        } else {
            let mut storage_trie = StorageTrie::default();

            if !account.storage.is_empty() {
                let mut storage_trie_mutation = storage_trie.mutate();
                storage_trie_mutation.set_storage_slots(&account.storage);
            }

            let root = storage_trie.root();
            self.storage_tries.insert_mut(*address, storage_trie);
            root
        };

        self.state_trie_mut.insert_account_info_with_storage_root(
            address,
            &account.info,
            storage_root,
        );
    }

    /// Sets the storage slot at the specified address and index to the provided
    /// value. Create storage trie and account in state trie if necessary.
    pub fn insert_storage_slot<ErrorT>(
        &mut self,
        address: &Address,
        index: &U256,
        value: &U256,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, ErrorT>,
    ) -> Result<Option<U256>, ErrorT> {
        let (storage_root, old_value) =
            if let Some(storage_trie) = self.storage_tries.get_mut(address) {
                let old_value = { storage_trie.mutate().set_storage_slot(index, value) };
                (storage_trie.root(), old_value)
            } else {
                let mut storage_trie = StorageTrie::default();

                let old_value = { storage_trie.mutate().set_storage_slot(index, value) };

                let storage_root = storage_trie.root();
                self.storage_tries.insert_mut(*address, storage_trie);
                (storage_root, old_value)
            };

        let account = if let Some(mut account) = self.state_trie_mut.account(address) {
            account.storage_root = storage_root;
            account
        } else {
            let default_account = default_account_fn()?;
            BasicAccount {
                nonce: default_account.nonce,
                balance: default_account.balance,
                storage_root,
                code_hash: default_account.code_hash,
            }
        };

        self.state_trie_mut.insert_basic_account(address, account);

        Ok(old_value)
    }

    /// Helper function for removing the account at the specified address from
    /// the provided state trie and storage tries, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn remove_account(&mut self, address: &Address) -> Option<BasicAccount> {
        let account = self.state_trie_mut.account(address);

        if account.is_some() {
            self.state_trie_mut.remove_account(address);

            self.remove_account_storage(address);
        }

        account
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn remove_account_storage(&mut self, address: &Address) {
        self.storage_tries.remove_mut(address);
    }
}

#[cfg(test)]
mod tests {
    use edr_eth::{state::state_root, trie::KECCAK_NULL_RLP};

    use super::*;

    fn precompiled_contracts() -> HashMap<Address, AccountInfo> {
        let mut accounts = HashMap::new();

        // Mimic precompiles activation
        for idx in 1..=8 {
            let mut address = Address::ZERO;
            address.0[19] = idx;
            accounts.insert(address, AccountInfo::default());
        }

        accounts
    }

    #[test]
    #[allow(clippy::redundant_clone)]
    fn clone_empty() {
        let state = AccountTrie::default();
        let cloned_state = state.clone();

        assert_eq!(state.state_root(), cloned_state.state_root());
    }

    #[test]
    #[allow(clippy::redundant_clone)]
    fn clone_precompiles() {
        let accounts = precompiled_contracts();

        let state = AccountTrie::with_accounts(&accounts);
        let cloned_state = state.clone();

        assert_eq!(state.state_root(), cloned_state.state_root());
    }

    #[test]
    fn default_empty() {
        let state = AccountTrie::default();

        assert_eq!(state.state_root(), KECCAK_NULL_RLP);
    }

    #[test]
    fn with_accounts_empty() {
        let accounts = HashMap::new();
        let state = AccountTrie::with_accounts(&accounts);

        assert_eq!(state.state_root(), KECCAK_NULL_RLP);
    }

    #[test]
    fn with_accounts_precompiles() {
        let accounts = precompiled_contracts();

        let old: HashMap<_, _> = accounts
            .iter()
            .map(|(address, account_info)| {
                (
                    *address,
                    BasicAccount {
                        nonce: account_info.nonce,
                        balance: account_info.balance,
                        storage_root: KECCAK_NULL_RLP,
                        code_hash: account_info.code_hash,
                    },
                )
            })
            .collect();

        let old = state_root(old.iter());

        let state = AccountTrie::with_accounts(&accounts);

        assert_eq!(state.state_root(), old);
    }
}
