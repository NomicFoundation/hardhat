mod changes;

pub use changes::{LayeredChanges, RethnetLayer};

use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{
    account::BasicAccount,
    state::{state_root, storage_root},
    Address, B256, U256,
};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode, KECCAK_EMPTY},
    DatabaseCommit,
};

use super::{history::StateHistory, AccountModifierFn, StateDebug, StateError};

/// A state consisting of layers.
#[derive(Debug, Default)]
pub struct LayeredState<Layer> {
    changes: LayeredChanges<Layer>,
    /// Snapshots
    snapshots: HashMap<B256, LayeredChanges<Layer>>,
}

impl<Layer: From<HashMap<Address, AccountInfo>>> LayeredState<Layer> {
    /// Creates a [`LayeredState`] with the provided layer at the bottom.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: HashMap<Address, AccountInfo>) -> Self {
        let layer = accounts.into();

        Self {
            changes: LayeredChanges::with_layer(layer),
            snapshots: HashMap::new(),
        }
    }
}

impl StateRef for LayeredState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(self
            .changes
            .account(&address)
            .map(|account| account.info.clone()))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.changes
            .code_by_hash(&code_hash)
            .map(Clone::clone)
            .ok_or(StateError::InvalidCodeHash(code_hash))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        Ok(self
            .changes
            .account(&address)
            .and_then(|account| account.storage.get(&index))
            .cloned()
            .unwrap_or(U256::ZERO))
    }
}

impl DatabaseCommit for LayeredState<RethnetLayer> {
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.changes.apply(&changes);
    }
}

impl StateDebug for LayeredState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn account_storage_root(&mut self, address: &Address) -> Result<Option<B256>, Self::Error> {
        Ok(self
            .changes
            .account(address)
            .map(|account| storage_root(&account.storage)))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.changes.account_or_insert_mut(&address).info = account_info;

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
    ) -> Result<(), Self::Error> {
        let mut account_info = self.changes.account_or_insert_mut(&address).info.clone();

        // Fill the bytecode
        if account_info.code_hash != KECCAK_EMPTY {
            account_info.code = Some(
                self.changes
                    .code_by_hash(&account_info.code_hash)
                    .cloned()
                    .expect("Code must exist"),
            );
        }

        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        let new_code = account_info.code.take();
        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, |code| code.hash());
        account_info.code_hash = new_code_hash;

        let code_change = old_code_hash != new_code_hash;
        if code_change {
            if let Some(new_code) = new_code {
                self.changes.insert_code(new_code);
            }

            self.changes.remove_code(&old_code_hash);
        }

        self.changes.account_or_insert_mut(&address).info = account_info;

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(self.changes.remove_account(&address))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn serialize(&mut self) -> String {
        self.changes.serialize()
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.changes
            .account_or_insert_mut(&address)
            .storage
            .insert(index, value);

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn state_root(&mut self) -> Result<B256, Self::Error> {
        let mut state = HashMap::new();

        self.changes
            .iter()
            .flat_map(|layer| layer.accounts())
            .for_each(|(address, account)| {
                state
                    .entry(*address)
                    .or_insert(account.as_ref().map(|account| BasicAccount {
                        nonce: account.info.nonce,
                        balance: account.info.balance,
                        storage_root: storage_root(&account.storage),
                        code_hash: account.info.code_hash,
                    }));
            });

        let state = state
            .iter()
            .filter_map(|(address, account)| account.as_ref().map(|account| (address, account)));

        Ok(state_root(state))
    }
}

impl StateHistory for LayeredState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn make_snapshot(&mut self) -> (B256, bool) {
        let state_root = self.state_root().unwrap();

        let mut exists = true;
        self.snapshots.entry(state_root).or_insert_with(|| {
            exists = false;

            let mut snapshot = self.changes.clone();
            snapshot.last_layer_mut().set_state_root(state_root);

            snapshot
        });

        (state_root, exists)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_snapshot(&mut self, state_root: &B256) -> bool {
        self.snapshots.remove(state_root).is_some()
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error> {
        // Ensure the last layer has a state root
        if !self.changes.last_layer_mut().has_state_root() {
            let state_root = self.state_root()?;
            self.changes.last_layer_mut().set_state_root(state_root);
        }

        if let Some(snapshot) = self.snapshots.remove(state_root) {
            self.changes = snapshot;

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

        if let Some(inverted_layer_id) = inverted_layer_id {
            let layer_id = self.changes.last_layer_id() - inverted_layer_id;
            self.changes.revert_to_layer(layer_id);

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
            Ok(())
        } else {
            Err(StateError::CannotRevert)
        }
    }
}
