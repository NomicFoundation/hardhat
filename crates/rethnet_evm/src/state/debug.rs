use std::{fmt::Debug, ops::Deref};

use auto_impl::auto_impl;
use rethnet_eth::{Address, B256, U256};
use revm::primitives::{AccountInfo, Bytecode};

/// Debuggable function type for modifying account information.
pub struct AccountModifierFn {
    inner: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>,
}

impl AccountModifierFn {
    /// Constructs an [`AccountModifierDebuggableFn`] from the provided function.
    pub fn new(func: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>) -> Self {
        Self { inner: func }
    }
}

impl Debug for AccountModifierFn {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            std::any::type_name::<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>)>()
        )
    }
}

impl Deref for AccountModifierFn {
    type Target = dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>);

    fn deref(&self) -> &Self::Target {
        self.inner.as_ref()
    }
}

/// A trait for debug operation on a database.
#[auto_impl(Box)]
pub trait StateDebug {
    /// The database's error type.
    type Error;

    /// Retrieves the storage root of the account at the specified address.
    fn account_storage_root(&mut self, address: &Address) -> Result<Option<B256>, Self::Error>;

    /// Inserts the provided account at the specified address.
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error>;

    /// Modifies the account at the specified address using the provided function. If the address
    /// points to an empty account, that will be modified instead.
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
    ) -> Result<(), Self::Error>;

    /// Removes and returns the account at the specified address, if it exists.
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;

    /// Sets the storage slot at the specified address and index to the provided value.
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error>;

    /// Reverts the state to match the specified state root.
    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error>;

    /// Retrieves the storage root of the database.
    fn state_root(&mut self) -> Result<B256, Self::Error>;

    /// Creates a checkpoint that can be reverted to using [`revert`].
    fn checkpoint(&mut self) -> Result<(), Self::Error>;

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    fn revert(&mut self) -> Result<(), Self::Error>;

    /// Makes a snapshot of the database that's retained until [`remove_snapshot`] is called. Returns the snapshot's identifier and whether
    /// that snapshot already existed.
    fn make_snapshot(&mut self) -> (B256, bool);

    /// Removes the snapshot corresponding to the specified state root, if it exists. Returns whether a snapshot was removed.
    fn remove_snapshot(&mut self, state_root: &B256) -> bool;
}
