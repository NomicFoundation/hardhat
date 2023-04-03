use std::{collections::BTreeMap, fmt::Debug};

use cita_trie::Hasher;
use hashbrown::HashMap;
use hasher::HasherKeccak;
use rethnet_eth::{account::KECCAK_EMPTY, state::storage_root, Address, B256, U256};
use revm::primitives::{Account, AccountInfo, Bytecode};

use crate::state::{account::RethnetAccount, contract::ContractStorage};

#[derive(Clone, Debug)]
pub struct LayeredChanges<Layer> {
    stack: Vec<Layer>,
}

impl<Layer> LayeredChanges<Layer> {
    /// Creates [`LayeredChanges`] with the provided layer at the bottom.
    pub fn with_layer(layer: Layer) -> Self {
        Self { stack: vec![layer] }
    }

    /// Returns the index of the top layer.
    pub fn last_layer_id(&self) -> usize {
        self.stack.len() - 1
    }

    /// Returns a mutable reference to the top layer.
    pub fn last_layer_mut(&mut self) -> &mut Layer {
        // The `LayeredState` always has at least one layer
        self.stack.last_mut().unwrap()
    }

    /// Returns an iterator over the object's layers.
    pub fn iter(&self) -> impl Iterator<Item = &Layer> {
        self.stack.iter().rev()
    }

    /// Returns a reverse iterator over the object's layers, oldest to newest.
    pub fn rev(&self) -> impl Iterator<Item = &Layer> {
        self.stack.iter()
    }
}

impl<Layer: Debug> LayeredChanges<Layer> {
    /// Adds the provided layer to the top, returning its index and a
    /// mutable reference to the layer.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn add_layer(&mut self, layer: Layer) -> (usize, &mut Layer) {
        let layer_id = self.stack.len();
        self.stack.push(layer);
        (layer_id, self.stack.last_mut().unwrap())
    }

    /// Reverts to the layer with specified `layer_id`, removing all
    /// layers above it.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn revert_to_layer(&mut self, layer_id: usize) {
        assert!(layer_id < self.stack.len(), "Invalid layer id.");
        self.stack.truncate(layer_id + 1);
    }
}

impl<Layer: Debug + Default> LayeredChanges<Layer> {
    /// Adds a default layer to the top, returning its index and a
    /// mutable reference to the layer.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn add_layer_default(&mut self) -> (usize, &mut Layer) {
        self.add_layer(Layer::default())
    }
}

impl<Layer: Default> Default for LayeredChanges<Layer> {
    fn default() -> Self {
        Self {
            stack: vec![Layer::default()],
        }
    }
}

/// A layer with information needed for [`Rethnet`].
#[derive(Clone, Debug, Default)]
pub struct RethnetLayer {
    /// Accounts, where the Option signals deletion.
    accounts: HashMap<Address, Option<RethnetAccount>>,
    /// Code hash -> Address
    contracts: ContractStorage<false>,
    /// Cached state root
    state_root: Option<B256>,
}

impl RethnetLayer {
    /// Retrieves an iterator over all accounts.
    pub fn accounts(&self) -> impl Iterator<Item = (&Address, &Option<RethnetAccount>)> {
        self.accounts.iter()
    }

    /// Retrieves the contract storage
    pub fn contracts(&self) -> &ContractStorage<false> {
        &self.contracts
    }

    /// Returns whether the layer has a state root.
    pub fn has_state_root(&self) -> bool {
        self.state_root.is_some()
    }

    /// Retrieves the layer's state root.
    pub fn state_root(&self) -> Option<&B256> {
        self.state_root.as_ref()
    }

    /// Sets the layer's state root.
    pub fn set_state_root(&mut self, state_root: B256) {
        self.state_root = Some(state_root);
    }
}

impl From<HashMap<Address, AccountInfo>> for RethnetLayer {
    fn from(accounts: HashMap<Address, AccountInfo>) -> Self {
        let mut accounts: HashMap<Address, Option<RethnetAccount>> = accounts
            .into_iter()
            .map(|(address, account_info)| (address, Some(account_info.into())))
            .collect();

        let mut contracts = ContractStorage::default();

        accounts
            .values_mut()
            .filter_map(|account| {
                account
                    .as_mut()
                    .and_then(|account| account.info.code.take())
            })
            .for_each(|code| {
                if code.hash() != KECCAK_EMPTY {
                    contracts.insert_code(code);
                }
            });

        Self {
            accounts,
            contracts,
            state_root: None,
        }
    }
}

impl LayeredChanges<RethnetLayer> {
    /// Retrieves a reference to the account corresponding to the address, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn account(&self, address: &Address) -> Option<&RethnetAccount> {
        self.iter()
            .find_map(|layer| layer.accounts.get(address).map(Option::as_ref))
            .flatten()
    }

    /// Retrieves a mutable reference to the account corresponding to the address, if it exists.
    /// Otherwise, inserts a new account.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn account_or_insert_mut(&mut self, address: &Address) -> &mut RethnetAccount {
        // WORKAROUND: https://blog.rust-lang.org/2022/08/05/nll-by-default.html
        if self.last_layer_mut().accounts.contains_key(address) {
            let was_deleted = self
                .last_layer_mut()
                .accounts
                .get(address)
                .unwrap()
                .is_none();

            if !was_deleted {
                return self
                    .last_layer_mut()
                    .accounts
                    .get_mut(address)
                    .unwrap()
                    .as_mut()
                    .unwrap();
            }
        }

        let account = self.account(address).cloned().unwrap_or_default();

        self.last_layer_mut()
            .accounts
            .insert_unique_unchecked(*address, Some(account))
            .1
            .as_mut()
            .unwrap()
    }

    /// Applies the provided changes to the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn apply(&mut self, changes: &HashMap<Address, Account>) {
        changes.iter().for_each(|(address, account)| {
            if account.is_destroyed || account.is_empty() {
                // Removes account only if it exists, so safe to use for empty, touched accounts
                self.remove_account(address);
            } else {
                let old_account = self.account_or_insert_mut(address);

                if account.storage_cleared {
                    old_account.storage.clear();
                }

                account.storage.iter().for_each(|(index, value)| {
                    let value = value.present_value();
                    if value == U256::ZERO {
                        old_account.storage.remove(index);
                    } else {
                        old_account.storage.insert(*index, value);
                    }
                });

                let mut account_info = account.info.clone();

                let old_code_hash = old_account.info.code_hash;
                let code_changed = old_code_hash != account_info.code_hash;

                let new_code = account_info.code.take();
                old_account.info = account_info;

                if code_changed {
                    if let Some(new_code) = new_code {
                        self.insert_code(new_code);
                    }

                    self.remove_code(&old_code_hash);
                }
            }
        });
    }

    /// Retrieves the code corresponding to the specified code hash.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn code_by_hash(&self, code_hash: &B256) -> Option<&Bytecode> {
        self.iter().find_map(|layer| layer.contracts.get(code_hash))
    }

    /// Removes the [`AccountInfo`] corresponding to the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn remove_account(&mut self, address: &Address) -> Option<AccountInfo> {
        if let Some(account) = self.account(address) {
            let account_info = account.info.clone();

            if account.info.code_hash != KECCAK_EMPTY {
                debug_assert!(account.info.code.is_none());

                let code_hash = account.info.code_hash;

                self.last_layer_mut().contracts.remove_code(&code_hash);
            }

            // Insert `None` to signal that the account was deleted
            self.last_layer_mut().accounts.insert(*address, None);

            return Some(account_info);
        }

        None
    }

    /// Serializes the state using ordering of addresses and storage indices.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn serialize(&self) -> String {
        let mut state = BTreeMap::new();

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

        self.iter()
            .flat_map(|layer| layer.accounts())
            .for_each(|(address, account)| {
                state.entry(*address).or_insert_with(|| {
                    account.as_ref().map(|account| {
                        let storage_root = storage_root(&account.storage);

                        // Sort entries
                        let storage: BTreeMap<B256, U256> = account
                            .storage
                            .iter()
                            .map(|(index, value)| {
                                let hashed_index =
                                    HasherKeccak::new().digest(&index.to_be_bytes::<32>());

                                (B256::from_slice(&hashed_index), *value)
                            })
                            .collect();

                        StateAccount {
                            balance: account.info.balance,
                            nonce: account.info.nonce,
                            code_hash: account.info.code_hash,
                            storage_root,
                            storage,
                        }
                    })
                });
            });

        // Remove deleted entries
        let state: BTreeMap<_, _> = state
            .into_iter()
            .filter_map(|(address, account)| account.map(|account| (address, account)))
            .collect();

        serde_json::to_string_pretty(&state).unwrap()
    }

    /// Inserts the provided bytecode using its hash, potentially overwriting an existing value.
    pub fn insert_code(&mut self, code: Bytecode) {
        self.last_layer_mut().contracts.insert_code(code);
    }

    /// Removes the code corresponding to the provided hash, if it exists.
    pub fn remove_code(&mut self, code_hash: &B256) {
        self.last_layer_mut().contracts.remove_code(code_hash);
    }
}
