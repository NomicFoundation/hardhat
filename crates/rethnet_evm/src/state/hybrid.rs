use std::fmt::Debug;

use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode, HashMap, KECCAK_EMPTY},
    DatabaseCommit,
};

use crate::collections::SharedMap;

use super::{
    history::StateHistory,
    layered::LayeredChanges,
    trie::{AccountTrie, TrieState},
    AccountModifierFn, RethnetLayer, StateDebug, StateError,
};

#[derive(Clone, Debug)]
struct RevertedLayers<Layer> {
    /// The parent layer's state root
    pub parent_state_root: B256,
    /// The reverted layers
    pub stack: Vec<Layer>,
}

#[derive(Clone, Debug)]
struct Snapshot<Layer> {
    pub changes: LayeredChanges<Layer>,
    pub trie: TrieState,
}

/// A state consisting of layers.
#[derive(Clone, Debug, Default)]
pub struct HybridState<Layer> {
    trie: TrieState,
    changes: LayeredChanges<Layer>,
    reverted_layers: Option<RevertedLayers<Layer>>,
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
            reverted_layers: None,
            snapshots: SharedMap::default(),
        }
    }

    /// Returns the changes that allow reconstructing the state.
    pub fn changes(&self) -> &LayeredChanges<Layer> {
        &self.changes
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
        self.changes.insert_account(&address, account_info);

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip(default_account_fn)))]
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, Self::Error>,
    ) -> Result<(), Self::Error> {
        let mut account_info = match self.trie.basic(address)? {
            Some(mut account_info) => {
                // Fill the bytecode
                if account_info.code_hash != KECCAK_EMPTY {
                    account_info.code = Some(
                        self.trie
                            .code_by_hash(account_info.code_hash)
                            .expect("Code must exist"),
                    );
                }

                account_info
            }
            None => default_account_fn()?,
        };

        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        let new_code = account_info.code.take();
        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, Bytecode::hash_slow);
        account_info.code_hash = new_code_hash;

        let code_changed = old_code_hash != new_code_hash;
        if code_changed {
            if let Some(new_code) = new_code {
                self.trie.insert_code(new_code_hash, new_code.clone());
                self.changes.insert_code(new_code_hash, new_code);
            }

            self.trie.remove_code(&old_code_hash);
            self.changes.remove_code(&old_code_hash);
        }

        self.trie.insert_account(address, account_info.clone())?;
        self.changes
            .account_or_insert_mut(&address, &|| {
                Ok(AccountInfo {
                    code: None,
                    ..AccountInfo::default()
                })
            })
            .info = account_info;

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
            .set_account_storage_slot(&address, &index, value);

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
        self.snapshots.remove(state_root);
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
            // Retain all layers except the first
            let stack = self.changes.revert_to_layer(0);
            let parent_state_root = self.changes.last_layer_mut().state_root().cloned().unwrap();

            self.reverted_layers = Some(RevertedLayers {
                parent_state_root,
                stack,
            });

            self.trie = latest_state.clone();
            self.changes = changes.clone();

            self.snapshots.remove(state_root);

            return Ok(());
        }

        // Check whether the state root is contained in the previously reverted layers
        let reinstated_layers = self.reverted_layers.take().and_then(|mut reverted_layers| {
            let layer_id = reverted_layers
                .stack
                .iter()
                .rev()
                .enumerate()
                .find_map(|(layer_id, layer)| {
                    if *layer.state_root().unwrap() == *state_root {
                        Some(layer_id)
                    } else {
                        None
                    }
                })
                .map(|inverted_layer_id| reverted_layers.stack.len() - inverted_layer_id - 1);

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

            let reverted_layers = self.changes.revert_to_layer(layer_id);
            let parent_state_root = self.changes.last_layer_mut().state_root().cloned().unwrap();

            if let Some(mut reinstated_layers) = reinstated_layers {
                self.changes.append(&mut reinstated_layers.stack);
            }

            self.reverted_layers = if reverted_layers.is_empty() {
                None
            } else {
                Some(RevertedLayers {
                    parent_state_root,
                    stack: reverted_layers,
                })
            };

            self.trie = TrieState::from(&self.changes);

            Ok(())
        } else {
            Err(StateError::InvalidStateRoot {
                state_root: *state_root,
                is_fork: false,
            })
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

#[cfg(test)]
mod tests {
    use super::*;

    use rethnet_eth::Bytes;

    #[test]
    fn test_irregular_state_modification() {
        // this test reproduces the sequence of calls that are induced by (the current
        // implementation of rethnet_rpc_server) being used as a provider in the hardhat tests and
        // running the hardhat_setBalance test entitled "should result in a modified balance".

        let mut state = HybridState::<RethnetLayer>::default();

        let seed = 1;
        let address = Address::from_low_u64_ne(1);
        let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_bytes()));
        let code_hash = code.hash_slow();
        state
            .insert_account(
                address,
                AccountInfo::new(U256::from(seed), seed, code_hash, code),
            )
            .unwrap();

        /* [eth_getBalance]
         * state_root
         * basic
         * set_block_context(that state root)
         * state_root
         */
        let state_root = state.state_root().unwrap();
        state.basic(address).unwrap();
        state.set_block_context(&state_root, None).unwrap();
        state.state_root().unwrap();

        /* [hardhat_setBalance]
         * modify_account
         */
        let balance = U256::from(1000);
        state
            .modify_account(
                address,
                AccountModifierFn::new(Box::new(move |account_balance, _, _| {
                    *account_balance = balance;
                })),
                &|| {
                    Ok(AccountInfo {
                        balance,
                        nonce: 0,
                        code: None,
                        code_hash: KECCAK_EMPTY,
                    })
                },
            )
            .unwrap();
        state.make_snapshot();

        /* [eth_getBalance]
         * state_root
         * basic
         * set_block_context(that last state root) -- FAILS
         */
        let state_root = state.state_root().unwrap();
        state.basic(address).unwrap();
        state.set_block_context(&state_root, None).unwrap();
        state.state_root().unwrap();
    }
}
