use hashbrown::HashMap;
use rethnet_eth::{
    account::BasicAccount,
    state::{state_root, storage_root},
    trie::KECCAK_NULL_RLP,
    Address, B256, U256,
};
use revm::{
    db::State,
    primitives::{Account, AccountInfo, Bytecode, KECCAK_EMPTY},
    DatabaseCommit,
};

use crate::StateDebug;

use super::StateError;

#[derive(Clone, Debug)]
struct RevertedLayers<Layer: Clone> {
    /// The parent layer's state root
    pub parent_state_root: B256,
    /// The reverted layers
    pub stack: Vec<Layer>,
}

/// A state consisting of layers.
#[derive(Clone, Debug)]
pub struct LayeredState<Layer: Clone> {
    stack: Vec<Layer>,
    /// The old parent layer state root and the reverted layers
    reverted_layers: Option<RevertedLayers<Layer>>,
    /// Snapshots
    snapshots: HashMap<B256, Vec<Layer>>, // naive implementation
}

impl<Layer: Clone> LayeredState<Layer> {
    /// Creates a [`LayeredState`] with the provided layer at the bottom.
    pub fn with_layer(layer: Layer) -> Self {
        Self {
            stack: vec![layer],
            reverted_layers: None,
            snapshots: HashMap::new(),
        }
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

    /// Adds the provided layer to the top, returning its index and a
    /// mutable reference to the layer.
    pub fn add_layer(&mut self, layer: Layer) -> (usize, &mut Layer) {
        let layer_id = self.stack.len();
        self.stack.push(layer);
        (layer_id, self.stack.last_mut().unwrap())
    }

    /// Reverts to the layer with specified `layer_id`, removing all
    /// layers above it.
    pub fn revert_to_layer(&mut self, layer_id: usize) {
        assert!(layer_id < self.stack.len(), "Invalid layer id.");
        self.stack.truncate(layer_id + 1);
    }

    /// Returns an iterator over the object's layers.
    pub fn iter(&self) -> impl Iterator<Item = &Layer> {
        self.stack.iter().rev()
    }
}

impl<Layer: Clone + Default> LayeredState<Layer> {
    /// Adds a default layer to the top, returning its index and a
    /// mutable reference to the layer.
    pub fn add_layer_default(&mut self) -> (usize, &mut Layer) {
        self.add_layer(Layer::default())
    }
}

impl<Layer: Clone + Default> Default for LayeredState<Layer> {
    fn default() -> Self {
        Self {
            stack: vec![Layer::default()],
            reverted_layers: None,
            snapshots: HashMap::new(),
        }
    }
}

/// A layer with information needed for [`Rethnet`].
#[derive(Clone, Debug, Default)]
pub struct RethnetLayer {
    /// Address -> AccountInfo
    account_infos: HashMap<Address, Option<AccountInfo>>,
    /// Address -> Storage
    storage: HashMap<Address, Option<HashMap<U256, U256>>>,
    /// Code hash -> Address
    contracts: HashMap<B256, Bytecode>,
    /// Cached state root
    state_root: Option<B256>,
}

impl RethnetLayer {
    /// Creates a `RethnetLayer` with the provided genesis accounts.
    pub fn with_genesis_accounts(genesis_accounts: HashMap<Address, AccountInfo>) -> Self {
        let genesis_accounts = genesis_accounts
            .into_iter()
            .map(|(address, account_info)| (address, Some(account_info)))
            .collect();

        Self {
            account_infos: genesis_accounts,
            ..Default::default()
        }
    }

    /// Returns whether the layer has a state root.
    pub fn has_state_root(&self) -> bool {
        self.state_root.is_some()
    }

    /// Insert the provided `AccountInfo` at the specified `address`.
    pub fn insert_account(&mut self, address: Address, mut account_info: AccountInfo) {
        if let Some(code) = account_info.code.take() {
            if !code.is_empty() {
                account_info.code_hash = code.hash();
                self.contracts.insert(code.hash(), code);
            }
        }

        if account_info.code_hash.is_zero() {
            account_info.code_hash = KECCAK_EMPTY;
        }

        self.account_infos.insert(address, Some(account_info));
    }
}

impl LayeredState<RethnetLayer> {
    /// Retrieves a reference to the account corresponding to the address, if it exists.
    pub fn account(&self, address: &Address) -> Option<&AccountInfo> {
        self.iter()
            .find_map(|layer| {
                layer
                    .account_infos
                    .get(address)
                    .map(|account_info| account_info.as_ref())
            })
            .flatten()
    }

    /// Retrieves a mutable reference to the account corresponding to the address, if it exists.
    pub fn account_mut(&mut self, address: &Address) -> Option<&mut AccountInfo> {
        // WORKAROUND: https://blog.rust-lang.org/2022/08/05/nll-by-default.html
        if self.last_layer_mut().account_infos.contains_key(address) {
            return self
                .last_layer_mut()
                .account_infos
                .get_mut(address)
                .and_then(|account_info| account_info.as_mut());
        }

        self.account(address).cloned().map(|account_info| {
            self.last_layer_mut()
                .account_infos
                .insert_unique_unchecked(*address, Some(account_info))
                .1
                .as_mut()
                .unwrap()
        })
    }

    /// Retrieves a mutable reference to the account corresponding to the address, if it exists.
    /// Otherwise, inserts a new account.
    pub fn account_or_insert_mut(&mut self, address: &Address) -> &mut AccountInfo {
        // WORKAROUND: https://blog.rust-lang.org/2022/08/05/nll-by-default.html
        if self.last_layer_mut().account_infos.contains_key(address) {
            let was_deleted = self
                .last_layer_mut()
                .account_infos
                .get(address)
                .unwrap()
                .is_none();

            if !was_deleted {
                return self
                    .last_layer_mut()
                    .account_infos
                    .get_mut(address)
                    .unwrap()
                    .as_mut()
                    .unwrap();
            }
        }

        let account_info = self.account(address).cloned().unwrap_or(AccountInfo {
            balance: U256::ZERO,
            nonce: 0,
            code_hash: KECCAK_EMPTY,
            code: None,
        });

        self.last_layer_mut()
            .account_infos
            .insert_unique_unchecked(*address, Some(account_info))
            .1
            .as_mut()
            .unwrap()
    }

    /// Removes the [`AccountInfo`] corresponding to the specified address.
    fn remove_account(&mut self, address: &Address) -> Option<AccountInfo> {
        let account_info = self
            .iter()
            .find_map(|layer| layer.account_infos.get(address))
            .cloned()
            .flatten();

        if let Some(account_info) = &account_info {
            debug_assert!(account_info.code.is_none());

            let code_hash = account_info.code_hash;

            self.last_layer_mut()
                .contracts
                .insert(code_hash, Bytecode::new());

            // Write None to signal that the account was deleted
            self.last_layer_mut().account_infos.insert(*address, None);
        }

        let storage = self.iter().find_map(|layer| layer.storage.get(address));

        if let Some(Some(_)) = storage {
            // Write None to signal that the account's storage was deleted
            self.last_layer_mut().storage.insert(*address, None);
        }

        account_info
    }
}

impl State for LayeredState<RethnetLayer> {
    type Error = StateError;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let account = self
            .iter()
            .find_map(|layer| layer.account_infos.get(&address))
            .cloned()
            .flatten();

        // TODO: Move this out of LayeredState when forking
        Ok(account.or(Some(AccountInfo {
            balance: U256::ZERO,
            nonce: 0,
            code_hash: KECCAK_EMPTY,
            code: None,
        })))
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        if code_hash == KECCAK_EMPTY {
            return Ok(Bytecode::new());
        }

        self.iter()
            .find_map(|layer| layer.contracts.get(&code_hash).cloned())
            .ok_or(StateError::InvalidCodeHash(code_hash))
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        Ok(self
            .iter()
            .find_map(|layer| layer.storage.get(&address).map(|storage| storage.as_ref()))
            .flatten()
            .and_then(|storage| storage.get(&index))
            .cloned()
            .unwrap_or(U256::ZERO))
    }
}

impl DatabaseCommit for LayeredState<RethnetLayer> {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        changes.into_iter().for_each(|(address, account)| {
            if account.is_empty() || account.is_destroyed {
                self.remove_account(&address);
            } else {
                self.last_layer_mut().insert_account(address, account.info);

                let storage = if self.last_layer_mut().storage.contains_key(&address) {
                    let storage = self.last_layer_mut().storage.get_mut(&address).unwrap();

                    let was_deleted = storage.is_none();
                    if was_deleted {
                        storage.replace(HashMap::new());
                    }

                    storage.as_mut().unwrap()
                } else {
                    let storage = self
                        .iter()
                        .find_map(|layer| layer.storage.get(&address))
                        .cloned()
                        .flatten()
                        .unwrap_or_default();

                    self.last_layer_mut()
                        .storage
                        .insert_unique_unchecked(address, Some(storage))
                        .1
                        .as_mut()
                        .unwrap()
                };

                if account.storage_cleared {
                    storage.clear();
                }

                account.storage.into_iter().for_each(|(index, value)| {
                    let value = value.present_value();
                    if value == U256::ZERO {
                        storage.remove(&index);
                    } else {
                        storage.insert(index, value);
                    }
                });
            }
        });
    }
}

impl StateDebug for LayeredState<RethnetLayer> {
    type Error = StateError;

    fn account_storage_root(&mut self, address: &Address) -> Result<Option<B256>, Self::Error> {
        Ok(self
            .iter()
            .find_map(|layer| layer.storage.get(address))
            .map(|storage| storage.as_ref().map_or(KECCAK_NULL_RLP, storage_root)))
    }

    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.last_layer_mut().insert_account(address, account_info);

        Ok(())
    }

    fn make_snapshot(&mut self) -> B256 {
        let state_root = self.state_root().unwrap();
        let mut snapshot = self.stack.clone();
        if let Some(layer) = snapshot.last_mut() {
            layer.state_root.replace(state_root);
        }

        // Currently overwrites old snapshots
        self.snapshots.insert(state_root, snapshot);

        state_root
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>,
    ) -> Result<(), Self::Error> {
        // TODO: Move account insertion out of LayeredState when forking
        let account_info = self.account_or_insert_mut(&address);
        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        if let Some(code) = account_info.code.take() {
            let new_code_hash = code.hash();

            if old_code_hash != new_code_hash {
                account_info.code_hash = new_code_hash;

                let last_layer = self.last_layer_mut();

                // The old contract should now return empty bytecode
                last_layer.contracts.insert(old_code_hash, Bytecode::new());

                last_layer.contracts.insert(new_code_hash, code);
            }
        }

        Ok(())
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(self.remove_account(&address))
    }

    fn remove_snapshot(&mut self, state_root: &B256) -> bool {
        self.snapshots.remove(state_root).is_some()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.last_layer_mut()
            .storage
            .entry(address)
            .and_modify(|entry| {
                let was_deleted = entry.is_none();
                if was_deleted {
                    entry.replace(HashMap::new());
                }

                entry.as_mut().unwrap().insert(index, value);
            })
            .or_insert_with(|| {
                let mut account_storage = HashMap::new();
                account_storage.insert(index, value);

                Some(account_storage)
            });

        Ok(())
    }

    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error> {
        // Ensure the last layer has a state root
        if !self.last_layer_mut().has_state_root() {
            let state_root = self.state_root()?;
            self.last_layer_mut().state_root.replace(state_root);
        }

        if let Some(snapshot) = self.snapshots.get(state_root) {
            // Retain all layers except the first
            self.reverted_layers = Some(RevertedLayers {
                parent_state_root: self.stack.first().unwrap().state_root.unwrap(),
                stack: self.stack.split_off(1),
            });
            self.stack = snapshot.clone();

            return Ok(());
        }

        // Check whether the state root is contained in the previously reverted layers
        let reinstated_layers = self.reverted_layers.take().and_then(|mut reverted_layers| {
            let layer_id =
                reverted_layers
                    .stack
                    .iter()
                    .enumerate()
                    .find_map(|(layer_id, layer)| {
                        if layer.state_root.unwrap() == *state_root {
                            Some(layer_id)
                        } else {
                            None
                        }
                    });

            if let Some(layer_id) = layer_id {
                reverted_layers.stack.truncate(layer_id + 1);

                Some(reverted_layers)
            } else {
                None
            }
        });

        let state_root = reinstated_layers
            .as_ref()
            .map_or(state_root, |reinstated_layers| {
                &reinstated_layers.parent_state_root
            });

        let layer_id = self.stack.iter().enumerate().find_map(|(layer_id, layer)| {
            if layer.state_root.unwrap() == *state_root {
                Some(layer_id)
            } else {
                None
            }
        });

        if let Some(layer_id) = layer_id {
            let reverted_layers = self.stack.split_off(layer_id + 1);
            let parent_state_root = self.stack.last().unwrap().state_root.unwrap();

            if let Some(mut reinstated_layers) = reinstated_layers {
                self.stack.append(&mut reinstated_layers.stack);
            }

            self.add_layer_default();

            self.reverted_layers = if reverted_layers.is_empty() {
                None
            } else {
                Some(RevertedLayers {
                    parent_state_root,
                    stack: reverted_layers,
                })
            };

            Ok(())
        } else {
            Err(StateError::InvalidStateRoot(*state_root))
        }
    }

    fn state_root(&mut self) -> Result<B256, Self::Error> {
        let mut storage = HashMap::new();

        self.iter().flat_map(|layer| layer.storage.iter()).for_each(
            |(address, account_storage)| {
                storage.entry(*address).or_insert(account_storage.clone());
            },
        );

        let storage_roots: HashMap<Address, B256> = storage
            .into_iter()
            .filter_map(|(address, storage)| {
                storage.map(|storage| (address, storage_root(&storage)))
            })
            .collect();

        let mut state = HashMap::new();

        self.iter()
            .flat_map(|layer| layer.account_infos.iter())
            .for_each(|(address, account_info)| {
                let storage_root = storage_roots
                    .get(address)
                    .cloned()
                    .unwrap_or(KECCAK_NULL_RLP);

                state
                    .entry(*address)
                    .or_insert(account_info.as_ref().map(|account_info| BasicAccount {
                        nonce: U256::from(account_info.nonce),
                        balance: account_info.balance,
                        storage_root,
                        code_hash: account_info.code_hash,
                    }));
            });

        let state: HashMap<Address, BasicAccount> = state
            .into_iter()
            .filter_map(|(address, account)| account.map(|account| (address, account)))
            .collect();

        Ok(state_root(&state))
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        let state_root = self.state_root()?;
        self.last_layer_mut().state_root.replace(state_root);

        self.add_layer_default();

        Ok(())
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        let last_layer_id = self.last_layer_id();
        if last_layer_id > 0 {
            self.revert_to_layer(last_layer_id - 1);
            Ok(())
        } else {
            Err(StateError::CannotRevert)
        }
    }
}
