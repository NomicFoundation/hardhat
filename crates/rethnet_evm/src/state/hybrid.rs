use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode, KECCAK_EMPTY},
    DatabaseCommit,
};

use crate::collections::SharedMap;

use super::{
    history::StateHistory,
    layered::LayeredChanges,
    trie::{AccountTrie, TrieState},
    AccountModifierFn, RethnetLayer, StateDebug, StateError,
};

#[derive(Debug)]
struct Snapshot<Layer> {
    pub changes: LayeredChanges<Layer>,
    pub trie: TrieState,
}

/// A state consisting of layers.
#[derive(Debug, Default)]
pub struct HybridState<Layer> {
    trie: TrieState,
    changes: LayeredChanges<Layer>,
    snapshots: SharedMap<B256, Snapshot<Layer>, true>,
}

impl<Layer: From<HashMap<Address, AccountInfo>>> HybridState<Layer> {
    /// Creates a [`HybridState`] with the provided layer at the bottom.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: HashMap<Address, AccountInfo>) -> Self {
        let latest_state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));
        let layer = accounts.into();

        Self {
            trie: latest_state,
            changes: LayeredChanges::with_layer(layer),
            snapshots: SharedMap::default(),
        }
    }
}

impl StateRef for HybridState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.trie.basic(address)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.trie.code_by_hash(code_hash)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.trie.storage(address, index)
    }
}

impl DatabaseCommit for HybridState<RethnetLayer> {
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.changes.apply(&changes);
        self.trie.commit(changes);
    }
}

impl StateDebug for HybridState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        self.trie.account_storage_root(address)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.trie.insert_account(address, account_info.clone())?;
        self.changes.account_or_insert_mut(&address).info = account_info;

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
    ) -> Result<(), Self::Error> {
        let mut account_info = self.trie.basic(address)?.map_or_else(
            || AccountInfo {
                code: None,
                ..AccountInfo::default()
            },
            |mut account_info| {
                // Fill the bytecode
                if account_info.code_hash != KECCAK_EMPTY {
                    account_info.code = Some(
                        self.trie
                            .code_by_hash(account_info.code_hash)
                            .expect("Code must exist"),
                    );
                }

                account_info
            },
        );

        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        let new_code = account_info.code.take();
        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, |code| code.hash());
        account_info.code_hash = new_code_hash;

        let code_changed = old_code_hash != new_code_hash;
        if code_changed {
            if let Some(new_code) = new_code {
                self.trie.insert_code(new_code.clone());
                self.changes.insert_code(new_code);
            }

            self.trie.remove_code(&old_code_hash);
            self.changes.remove_code(&old_code_hash);
        }

        self.trie.insert_account(address, account_info.clone())?;
        self.changes.account_or_insert_mut(&address).info = account_info;

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(if self.trie.remove_account(address).unwrap().is_some() {
            self.changes.remove_account(&address)
        } else {
            None
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn serialize(&self) -> String {
        self.trie.serialize()
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.trie.set_account_storage_slot(address, index, value)?;

        self.changes
            .account_or_insert_mut(&address)
            .storage
            .insert(index, value);

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn state_root(&self) -> Result<B256, Self::Error> {
        self.trie.state_root()
    }
}

impl StateHistory for HybridState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn make_snapshot(&mut self) -> B256 {
        let state_root = self.state_root().unwrap();

        self.snapshots.insert_with(state_root, || {
            let mut changes = self.changes.clone();
            changes.last_layer_mut().set_state_root(state_root);

            Snapshot {
                changes,
                trie: self.trie.clone(),
            }
        });

        state_root
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_snapshot(&mut self, state_root: &B256) {
        self.snapshots.remove(state_root)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_block_context(
        &mut self,
        state_root: &B256,
        _block_number: Option<U256>,
    ) -> Result<(), Self::Error> {
        // Ensure the last layer has a state root
        if !self.changes.last_layer_mut().has_state_root() {
            let state_root = self.state_root()?;
            self.changes.last_layer_mut().set_state_root(state_root);
        }

        if let Some(Snapshot {
            changes,
            trie: latest_state,
        }) = self.snapshots.get(state_root)
        {
            self.trie = latest_state.clone();
            self.changes = changes.clone();

            self.snapshots.remove(state_root);

            return Ok(());
        }

        let inverted_layer_id = self
            .changes
            .iter()
            .enumerate()
            .find_map(|(layer_id, layer)| {
                if *layer.state_root().unwrap() == *state_root {
                    Some(layer_id)
                } else {
                    None
                }
            });

        if let Some(layer_id) = inverted_layer_id {
            let layer_id = self.changes.last_layer_id() - layer_id;

            self.changes.revert_to_layer(layer_id);
            self.trie = TrieState::from(&self.changes);

            Ok(())
        } else {
            Err(StateError::InvalidStateRoot(*state_root))
        }
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        let state_root = self.state_root()?;
        self.changes.last_layer_mut().set_state_root(state_root);

        self.changes.add_layer_default();

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn revert(&mut self) -> Result<(), Self::Error> {
        let last_layer_id = self.changes.last_layer_id();
        if last_layer_id > 0 {
            self.changes.revert_to_layer(last_layer_id - 1);
            self.trie = TrieState::from(&self.changes);
            Ok(())
        } else {
            Err(StateError::CannotRevert)
        }
    }
}
