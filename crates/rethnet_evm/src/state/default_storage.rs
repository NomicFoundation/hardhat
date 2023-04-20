use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};

use super::{StateDebug, StateError, StateHistory};

/// A wrapper around state that always returns zero for missing storage slots.
#[derive(Debug)]
pub struct DefaultStorageState<S> {
    ext: S,
}

impl<S: StateRef> DefaultStorageState<S> {
    /// Constructs a new [`DefaultStorageState`] from the provided [`StateRef`] implementation.
    pub fn new(ext: S) -> Self {
        Self { ext }
    }
}

impl<S: StateRef<Error = StateError>> StateRef for DefaultStorageState<S> {
    type Error = StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.ext.basic(address)
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.ext.code_by_hash(code_hash)
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        match self.ext.storage(address, index) {
            Ok(value) => Ok(value),
            Err(StateError::InvalidStorageSlot(_)) => Ok(U256::ZERO),
            Err(e) => Err(e),
        }
    }
}

impl<S: DatabaseCommit> DatabaseCommit for DefaultStorageState<S> {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.ext.commit(changes)
    }
}

impl<S: StateDebug> StateDebug for DefaultStorageState<S> {
    type Error = S::Error;

    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        self.ext.account_storage_root(address)
    }

    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.ext.insert_account(address, account_info)
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: super::AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, Self::Error>,
    ) -> Result<(), Self::Error> {
        self.ext
            .modify_account(address, modifier, default_account_fn)
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.ext.remove_account(address)
    }

    fn serialize(&self) -> String {
        self.ext.serialize()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.ext.set_account_storage_slot(address, index, value)
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        self.ext.state_root()
    }
}

impl<S: StateHistory> StateHistory for DefaultStorageState<S> {
    type Error = S::Error;

    fn set_block_context(
        &mut self,
        state_root: &B256,
        block_number: Option<U256>,
    ) -> Result<(), Self::Error> {
        self.ext.set_block_context(state_root, block_number)
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        self.ext.checkpoint()
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        self.ext.revert()
    }

    fn make_snapshot(&mut self) -> B256 {
        self.ext.make_snapshot()
    }

    fn remove_snapshot(&mut self, state_root: &B256) {
        self.ext.remove_snapshot(state_root)
    }
}
