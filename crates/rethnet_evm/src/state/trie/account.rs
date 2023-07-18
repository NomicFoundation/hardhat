use std::{collections::BTreeMap, fmt::Debug, sync::Arc};

use cita_trie::{MemoryDB, PatriciaTrie, Trie as CitaTrie};
use hashbrown::HashMap;
use hasher::{Hasher, HasherKeccak};
use rethnet_eth::{account::BasicAccount, Address, B160, B256, U256};
use revm::primitives::{Account, AccountInfo};

/// A change to the account, where `None` implies deletion.
pub type AccountChange<'a> = (&'a Address, Option<(BasicAccount, &'a HashMap<U256, U256>)>);

type AccountStorageTries = HashMap<Address, (Arc<MemoryDB>, B256)>;

type Trie = PatriciaTrie<MemoryDB, HasherKeccak>;

/// A trie for maintaining the state of accounts and their storage.
#[derive(Debug)]
pub struct AccountTrie {
    state_root: B256,
    state_trie_db: Arc<MemoryDB>,
    storage_trie_dbs: AccountStorageTries,
}

impl AccountTrie {
    /// Constructs a `TrieState` from an (address -> account) mapping.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: &HashMap<Address, AccountInfo>) -> Self {
        let state_trie_db = Arc::new(MemoryDB::new(true));
        let hasher = Arc::new(HasherKeccak::new());

        let mut storage_trie_dbs = HashMap::new();

        let state_root = {
            let mut state_trie = Trie::new(state_trie_db.clone(), hasher.clone());
            accounts.iter().for_each(|(address, account_info)| {
                let storage_trie_db = Arc::new(MemoryDB::new(true));
                let storage_root = {
                    let mut storage_trie = Trie::new(storage_trie_db.clone(), hasher.clone());

                    B256::from_slice(&storage_trie.root().unwrap())
                };
                storage_trie_dbs.insert(*address, (storage_trie_db, storage_root));

                Self::set_account_in(address, account_info, storage_root, &mut state_trie);
            });

            B256::from_slice(&state_trie.root().unwrap())
        };

        Self {
            state_root,
            state_trie_db,
            storage_trie_dbs,
        }
    }

    /// Constructs a `TrieState` from layers of changes.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(layers)))]
    pub fn from_changes<'a, I, C>(layers: I) -> Self
    where
        I: IntoIterator<Item = C>,
        C: IntoIterator<Item = AccountChange<'a>>,
    {
        let state_trie_db = Arc::new(MemoryDB::new(true));

        let mut storage_trie_dbs = HashMap::new();

        let state_root = {
            let mut state_trie = Trie::new(state_trie_db.clone(), Arc::new(HasherKeccak::new()));

            layers.into_iter().for_each(|layer| {
                layer.into_iter().for_each(|(address, change)| {
                    if let Some((mut account, storage)) = change {
                        let (storage_trie_db, storage_root) =
                            storage_trie_dbs.entry(*address).or_insert_with(|| {
                                let storage_trie_db = Arc::new(MemoryDB::new(true));
                                let storage_root = {
                                    let mut storage_trie = Trie::new(
                                        storage_trie_db.clone(),
                                        Arc::new(HasherKeccak::new()),
                                    );
                                    B256::from_slice(&storage_trie.root().unwrap())
                                };

                                (storage_trie_db, storage_root)
                            });

                        {
                            let mut storage_trie = Trie::from(
                                storage_trie_db.clone(),
                                Arc::new(HasherKeccak::new()),
                                storage_root.as_bytes(),
                            )
                            .expect("Invalid storage root");

                            storage.iter().for_each(|(index, value)| {
                                Self::set_account_storage_slot_in(index, value, &mut storage_trie);
                            });

                            *storage_root = B256::from_slice(&storage_trie.root().unwrap());
                        };

                        account.storage_root = *storage_root;

                        let hashed_address = HasherKeccak::new().digest(address.as_bytes());
                        state_trie
                            .insert(hashed_address, rlp::encode(&account).to_vec())
                            .unwrap();
                    } else {
                        Self::remove_account_in(address, &mut state_trie, &mut storage_trie_dbs);
                    }
                })
            });

            B256::from_slice(&state_trie.root().unwrap())
        };

        Self {
            state_root,
            state_trie_db,
            storage_trie_dbs,
        }
    }

    /// Retrieves an account corresponding to the specified address from the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn account(&self, address: &Address) -> Option<BasicAccount> {
        let state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

        Self::account_in(address, &state_trie)
    }

    fn account_in(address: &Address, state_trie: &Trie) -> Option<BasicAccount> {
        let hashed_address = HasherKeccak::new().digest(address.as_bytes());

        state_trie
            .get(&hashed_address)
            .unwrap()
            .map(|encoded_account| rlp::decode::<BasicAccount>(&encoded_account).unwrap())
    }

    /// Retrieves the storage storage corresponding to the account at the specified address and the specified index, if they exist.
    pub fn account_storage_slot(&self, address: &Address, index: &U256) -> Option<U256> {
        self.storage_trie_dbs
            .get(address)
            .and_then(|(storage_trie_db, storage_root)| {
                let storage_trie = Trie::from(
                    storage_trie_db.clone(),
                    Arc::new(HasherKeccak::new()),
                    storage_root.as_bytes(),
                )
                .expect("Invalid storage root");

                let hashed_index = HasherKeccak::new().digest(&index.to_be_bytes::<32>());
                storage_trie
                    .get(&hashed_index)
                    .unwrap()
                    .map(|decode_value| rlp::decode::<U256>(&decode_value).unwrap())
            })
    }

    /// Commits changes to the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn commit(&mut self, changes: &HashMap<B160, Account>) {
        let mut state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

        changes.iter().for_each(|(address, account)| {
            if account.is_touched() {
                if account.is_selfdestructed() {
                    // Removes account only if it exists, so safe to use for empty, touched accounts
                    Self::remove_account_in(address, &mut state_trie, &mut self.storage_trie_dbs);
                } else {
                    if account.is_newly_created() {
                        // We can simply remove the storage trie db, as it will get reinitialized in the next operation
                        self.storage_trie_dbs.remove(address);
                    }

                    let (storage_trie_db, storage_root) =
                        self.storage_trie_dbs.entry(*address).or_insert_with(|| {
                            let storage_trie_db = Arc::new(MemoryDB::new(true));
                            let storage_root = {
                                let mut storage_trie = Trie::new(
                                    storage_trie_db.clone(),
                                    Arc::new(HasherKeccak::new()),
                                );

                                B256::from_slice(&storage_trie.root().unwrap())
                            };

                            (storage_trie_db, storage_root)
                        });

                    let storage_changed = account.is_newly_created() || !account.storage.is_empty();
                    if storage_changed {
                        let mut storage_trie = Trie::from(
                            storage_trie_db.clone(),
                            Arc::new(HasherKeccak::new()),
                            storage_root.as_bytes(),
                        )
                        .expect("Invalid storage root");

                        account.storage.iter().for_each(|(index, value)| {
                            Self::set_account_storage_slot_in(
                                index,
                                &value.present_value,
                                &mut storage_trie,
                            );
                        });

                        *storage_root = B256::from_slice(&storage_trie.root().unwrap());
                    }

                    Self::set_account_in(address, &account.info, *storage_root, &mut state_trie);
                }
            }
        });

        self.state_root = B256::from_slice(&state_trie.root().unwrap());
    }

    /// Sets the provided account at the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn set_account(&mut self, address: &Address, account_info: &AccountInfo) {
        let mut state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

        // Check whether the account already existed. If so, use its storage root.
        let (_db, storage_root) = self.storage_trie_dbs.entry(*address).or_insert_with(|| {
            let storage_trie_db = Arc::new(MemoryDB::new(true));
            let storage_root = {
                let mut storage_trie =
                    Trie::new(storage_trie_db.clone(), Arc::new(HasherKeccak::new()));
                B256::from_slice(&storage_trie.root().unwrap())
            };

            (storage_trie_db, storage_root)
        });

        Self::set_account_in(address, account_info, *storage_root, &mut state_trie);

        self.state_root = B256::from_slice(&state_trie.root().unwrap());
    }

    /// Helper function for setting the account at the specified address into the provided state trie.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_account_in(
        address: &Address,
        account_info: &AccountInfo,
        storage_root: B256,
        state_trie: &mut Trie,
    ) {
        let account = BasicAccount::from((account_info, storage_root));

        let hashed_address = HasherKeccak::new().digest(address.as_bytes());
        state_trie
            .insert(hashed_address, rlp::encode(&account).to_vec())
            .unwrap();
    }

    /// Removes the account at the specified address, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn remove_account(&mut self, address: &Address) -> Option<BasicAccount> {
        let mut state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

        let account = Self::remove_account_in(address, &mut state_trie, &mut self.storage_trie_dbs);

        self.state_root = B256::from_slice(&state_trie.root().unwrap());

        account
    }

    /// Helper function for removing the account at the specified address from the provided state trie and storage tries, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_account_in(
        address: &Address,
        state_trie: &mut Trie,
        storage_trie_dbs: &mut AccountStorageTries,
    ) -> Option<BasicAccount> {
        let account = Self::account_in(address, state_trie);

        if account.is_some() {
            let hashed_address = HasherKeccak::new().digest(address.as_bytes());
            state_trie.remove(&hashed_address).unwrap();

            storage_trie_dbs.remove(address);
        }

        account
    }

    /// Serializes the state using ordering of addresses and storage indices.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn serialize(&self) -> String {
        let state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

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
            .storage_trie_dbs
            .iter()
            .filter_map(|(address, (storage_trie_db, storage_root))| {
                let hashed_address = HasherKeccak::new().digest(address.as_bytes());
                let account = state_trie
                    .get(&hashed_address)
                    .unwrap()
                    .unwrap_or_else(|| panic!("Account with address '{}' and hashed address '{:?}' must exist in state, if a storage trie is stored for it", address, hashed_address));

                let account: BasicAccount = rlp::decode(&account).unwrap();

                if account == BasicAccount::default() {
                    None
                } else {
                    let storage_trie = Trie::from(
                        storage_trie_db.clone(),
                        Arc::new(HasherKeccak::new()),
                        storage_root.as_bytes(),
                    )
                    .expect("Invalid storage root");

                    let storage = storage_trie
                        .iter()
                        .map(|(hashed_index, encoded_value)| {
                            let value: U256 = rlp::decode(&encoded_value).unwrap();
                            assert_eq!(hashed_index.len(), 32);
                            (B256::from_slice(&hashed_index), value)
                        })
                        .collect();

                    let account = StateAccount {
                        balance: account.balance,
                        code_hash: account.code_hash,
                        nonce: account.nonce,
                        storage,
                        storage_root: *storage_root,
                    };

                    Some((*address, account))
            }})
            .collect();

        serde_json::to_string_pretty(&state).unwrap()
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn set_account_storage_slot(&mut self, address: &Address, index: &U256, value: &U256) {
        let (storage_trie_db, storage_root) =
            self.storage_trie_dbs.entry(*address).or_insert_with(|| {
                let storage_trie_db = Arc::new(MemoryDB::new(true));
                let storage_root = {
                    let mut storage_trie =
                        Trie::new(storage_trie_db.clone(), Arc::new(HasherKeccak::new()));
                    B256::from_slice(&storage_trie.root().unwrap())
                };

                (storage_trie_db, storage_root)
            });

        {
            let mut storage_trie = Trie::from(
                storage_trie_db.clone(),
                Arc::new(HasherKeccak::new()),
                storage_root.as_bytes(),
            )
            .expect("Invalid storage root");

            Self::set_account_storage_slot_in(index, value, &mut storage_trie);

            *storage_root = B256::from_slice(&storage_trie.root().unwrap());
        };

        let mut state_trie = Trie::from(
            self.state_trie_db.clone(),
            Arc::new(HasherKeccak::new()),
            self.state_root.as_bytes(),
        )
        .expect("Invalid state root");

        let hashed_address = HasherKeccak::new().digest(address.as_bytes());
        let account = state_trie.get(&hashed_address).unwrap().map_or(
            BasicAccount {
                storage_root: *storage_root,
                ..BasicAccount::default()
            },
            |account| {
                let mut account: BasicAccount = rlp::decode(&account).unwrap();
                account.storage_root = *storage_root;
                account
            },
        );

        state_trie
            .insert(hashed_address, rlp::encode(&account).to_vec())
            .unwrap();

        self.state_root = B256::from_slice(&state_trie.root().unwrap());
    }

    /// Helper function for setting the storage slot at the specified address and index to the provided value.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_account_storage_slot_in(index: &U256, value: &U256, storage_trie: &mut Trie) {
        let hashed_index = HasherKeccak::new().digest(&index.to_be_bytes::<32>());
        if *value == U256::ZERO {
            if storage_trie.contains(&hashed_index).unwrap() {
                storage_trie.remove(&hashed_index).unwrap();
            }
        } else {
            storage_trie
                .insert(hashed_index, rlp::encode(value).to_vec())
                .unwrap();
        }
    }

    /// Retrieves the trie's state root.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn state_root(&self) -> B256 {
        self.state_root
    }

    /// Retrieves the storage root of the account at the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn storage_root(&self, address: &Address) -> Option<B256> {
        self.storage_trie_dbs.get(address).map(|(_db, root)| *root)
    }
}

impl Clone for AccountTrie {
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn clone(&self) -> Self {
        let state_trie_db = Arc::new((*self.state_trie_db).clone());

        let storage_trie_dbs = self
            .storage_trie_dbs
            .iter()
            .map(|(address, (storage_trie_db, storage_root))| {
                let storage_trie_db = Arc::new((**storage_trie_db).clone());

                (*address, (storage_trie_db, *storage_root))
            })
            .collect();

        Self {
            state_root: self.state_root,
            state_trie_db,
            storage_trie_dbs,
        }
    }
}

impl Default for AccountTrie {
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn default() -> Self {
        let state_trie_db = Arc::new(MemoryDB::new(true));
        let state_root = {
            let mut state_trie = Trie::new(state_trie_db.clone(), Arc::new(HasherKeccak::new()));

            B256::from_slice(&state_trie.root().unwrap())
        };

        Self {
            state_root,
            state_trie_db,
            storage_trie_dbs: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use rethnet_eth::{
        account::KECCAK_EMPTY,
        state::{state_root, storage_root, Storage},
        trie::KECCAK_NULL_RLP,
    };

    use super::*;

    fn precompiled_contracts() -> HashMap<Address, AccountInfo> {
        let mut accounts = HashMap::new();

        // Mimic precompiles activation
        for idx in 1..=8 {
            let mut address = Address::zero();
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

    #[test]
    fn from_changes_empty() {
        let changes: Vec<Vec<AccountChange<'_>>> = Vec::new();
        let state = AccountTrie::from_changes(changes);

        assert_eq!(state.state_root(), KECCAK_NULL_RLP);
    }

    #[test]
    fn from_changes_one_layer() {
        const DUMMY_ADDRESS: [u8; 20] = [1u8; 20];
        const DUMMY_STORAGE_SLOT_INDEX: u64 = 100;
        const DUMMY_STORAGE_SLOT_VALUE: u64 = 100;

        let expected_address = Address::from(DUMMY_ADDRESS);
        let expected_index = U256::from(DUMMY_STORAGE_SLOT_INDEX);
        let expected_storage_value = U256::from(DUMMY_STORAGE_SLOT_VALUE);

        let mut expected_storage = Storage::new();
        expected_storage.insert(expected_index, expected_storage_value);

        let expected_account = BasicAccount {
            nonce: 1,
            balance: U256::from(100u32),
            storage_root: storage_root(expected_storage.iter()),
            code_hash: KECCAK_EMPTY,
        };

        let changes: Vec<Vec<AccountChange<'_>>> = vec![vec![(
            &expected_address,
            Some((expected_account.clone(), &expected_storage)),
        )]];
        let state = AccountTrie::from_changes(changes);

        let account = state.account(&expected_address);
        assert_eq!(account, Some(expected_account));

        let storage_value = state.account_storage_slot(&expected_address, &expected_index);
        assert_eq!(storage_value, Some(expected_storage_value));
    }

    #[test]
    fn from_changes_two_layers() {
        const DUMMY_ADDRESS: [u8; 20] = [1u8; 20];
        const DUMMY_STORAGE_SLOT_INDEX: u64 = 100;
        const DUMMY_STORAGE_SLOT_VALUE1: u64 = 50;
        const DUMMY_STORAGE_SLOT_VALUE2: u64 = 100;

        let expected_address = Address::from(DUMMY_ADDRESS);
        let expected_index = U256::from(DUMMY_STORAGE_SLOT_INDEX);
        let expected_storage_value = U256::from(DUMMY_STORAGE_SLOT_VALUE2);

        let mut storage_layer1 = Storage::new();
        storage_layer1.insert(expected_index, U256::from(DUMMY_STORAGE_SLOT_VALUE1));

        let init_account = BasicAccount {
            nonce: 1,
            balance: U256::from(100u32),
            storage_root: storage_root(storage_layer1.iter()),
            code_hash: KECCAK_EMPTY,
        };

        let mut storage_layer2 = Storage::new();
        storage_layer2.insert(expected_index, expected_storage_value);

        let expected_account = BasicAccount {
            nonce: 2,
            balance: U256::from(200u32),
            storage_root: storage_root(storage_layer2.iter()),
            code_hash: KECCAK_EMPTY,
        };

        let changes: Vec<Vec<AccountChange<'_>>> = vec![
            vec![(&expected_address, Some((init_account, &storage_layer1)))],
            vec![(
                &expected_address,
                Some((expected_account.clone(), &storage_layer2)),
            )],
        ];
        let state = AccountTrie::from_changes(changes);

        let account = state.account(&expected_address);
        assert_eq!(account, Some(expected_account));

        let storage_value = state.account_storage_slot(&expected_address, &expected_index);
        assert_eq!(storage_value, Some(expected_storage_value));
    }

    #[test]
    fn from_changes_remove_zeroed_storage_slot() {
        const DUMMY_ADDRESS: [u8; 20] = [1u8; 20];
        const DUMMY_STORAGE_SLOT_INDEX: u64 = 100;
        const DUMMY_STORAGE_SLOT_VALUE: u64 = 100;

        let expected_address = Address::from(DUMMY_ADDRESS);
        let expected_index = U256::from(DUMMY_STORAGE_SLOT_INDEX);

        let mut storage_layer1 = Storage::new();
        storage_layer1.insert(expected_index, U256::from(DUMMY_STORAGE_SLOT_VALUE));

        let init_account = BasicAccount {
            nonce: 1,
            balance: U256::from(100u32),
            storage_root: storage_root(storage_layer1.iter()),
            code_hash: KECCAK_EMPTY,
        };

        let mut storage_layer2 = Storage::new();
        storage_layer2.insert(U256::from(100), U256::ZERO);

        let expected_account = BasicAccount {
            nonce: 2,
            balance: U256::from(200u32),
            storage_root: storage_root(
                storage_layer2
                    .iter()
                    .filter(|(_index, value)| **value != U256::ZERO),
            ),
            code_hash: KECCAK_EMPTY,
        };

        let changes: Vec<Vec<AccountChange<'_>>> = vec![
            vec![(&expected_address, Some((init_account, &storage_layer1)))],
            vec![(
                &expected_address,
                Some((expected_account.clone(), &storage_layer2)),
            )],
        ];
        let state = AccountTrie::from_changes(changes);

        let account = state.account(&expected_address);
        assert_eq!(account, Some(expected_account));

        let storage_value = state.account_storage_slot(&expected_address, &expected_index);
        assert_eq!(storage_value, None);
    }
}
