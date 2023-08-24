mod changes;

pub use changes::{LayeredChanges, RethnetLayer};

use std::fmt::Debug;

use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode, HashMap, KECCAK_EMPTY},
    DatabaseCommit,
};

use crate::collections::SharedMap;

use super::{history::StateHistory, AccountModifierFn, StateDebug, StateError};

/// A state consisting of layers.
#[derive(Clone, Debug, Default)]
pub struct LayeredState<Layer> {
    changes: LayeredChanges<Layer>,
    /// Snapshots
    snapshots: SharedMap<B256, LayeredChanges<Layer>, true>,
}

impl<Layer: From<HashMap<Address, AccountInfo>>> LayeredState<Layer> {
    /// Creates a [`LayeredState`] with the provided layer at the bottom.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: HashMap<Address, AccountInfo>) -> Self {
        let layer = accounts.into();

        Self {
            changes: LayeredChanges::with_layer(layer),
            snapshots: SharedMap::default(),
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
    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        Ok(self.changes.storage_root(address))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
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
        let mut account_info = self
            .changes
            .account_or_insert_mut(&address, default_account_fn)
            .info
            .clone();

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
        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, Bytecode::hash_slow);
        account_info.code_hash = new_code_hash;

        let code_change = old_code_hash != new_code_hash;
        if code_change {
            if let Some(new_code) = new_code {
                self.changes.insert_code(new_code_hash, new_code);
            }

            self.changes.remove_code(&old_code_hash);
        }

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
        Ok(self.changes.remove_account(&address))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn serialize(&self) -> String {
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
            .set_account_storage_slot(&address, &index, value);

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn state_root(&self) -> Result<B256, Self::Error> {
        Ok(self.changes.state_root())
    }
}

impl StateHistory for LayeredState<RethnetLayer> {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn make_snapshot(&mut self) -> B256 {
        let state_root = self.state_root().unwrap();

        self.snapshots.insert_with(state_root, || {
            let mut snapshot = self.changes.clone();
            snapshot.last_layer_mut().set_state_root(state_root);

            snapshot
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

        if let Some(snapshot) = self.snapshots.get(state_root) {
            self.changes = snapshot.clone();

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

        if let Some(inverted_layer_id) = inverted_layer_id {
            let layer_id = self.changes.last_layer_id() - inverted_layer_id;
            self.changes.revert_to_layer(layer_id);

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
            Ok(())
        } else {
            Err(StateError::CannotRevert)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    use rethnet_eth::Bytes;

    #[test]
    fn code_by_hash_success() {
        let mut state = LayeredState::<RethnetLayer>::default();
        let inserted_bytecode = Bytecode::new_raw(Bytes::from("0x11"));
        let inserted_bytecode_hash = inserted_bytecode.hash_slow();
        state
            .insert_account(
                Address::from_low_u64_ne(1234),
                AccountInfo::new(
                    U256::ZERO,
                    0,
                    inserted_bytecode_hash,
                    inserted_bytecode.clone(),
                ),
            )
            .unwrap();
        let retrieved_bytecode = state.code_by_hash(inserted_bytecode_hash).unwrap();
        assert_eq!(retrieved_bytecode, inserted_bytecode);
    }

    #[test]
    fn repro_remove_code_panic_with_attempt_to_subtract_with_overflow() {
        let state = RefCell::new(LayeredState::default());

        let seed = 1;
        let address = Address::from_low_u64_ne(seed);
        let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_bytes()));
        let code_hash = code.hash_slow();
        state
            .borrow_mut()
            .insert_account(
                address,
                AccountInfo::new(U256::from(seed), seed, code_hash, code),
            )
            .unwrap();
        state.borrow_mut().checkpoint().unwrap();
        state.borrow_mut().make_snapshot();
        let take_code = || {
            state
                .borrow_mut()
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                    &|| Ok(AccountInfo::default()),
                )
                .unwrap();
        };
        let add_code = || {
            state
                .borrow_mut()
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(move |_balance, _nonce, code| {
                        code.replace(Bytecode::new_raw(Bytes::copy_from_slice(
                            Address::from_low_u64_ne(seed + 1).as_bytes(),
                        )));
                    })),
                    &|| Ok(AccountInfo::default()),
                )
                .unwrap();
        };

        take_code();
        add_code();
        take_code();
        add_code();
    }

    #[test]
    fn repro_repeated_remove_and_insert_account_has_no_effect() {
        let state = RefCell::new(LayeredState::default());

        let address = Address::from_low_u64_ne(1);

        let insert_account = || {
            state
                .borrow_mut()
                .insert_account(address, AccountInfo::default())
                .unwrap();
            assert!(state.borrow().basic(address).unwrap().is_some());
        };

        insert_account();

        assert!(state
            .borrow_mut()
            .remove_account(address)
            .unwrap()
            .is_some());
        assert!(state.borrow().basic(address).unwrap().is_none());

        insert_account();
    }
}
