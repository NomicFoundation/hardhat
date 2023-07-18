use std::{fmt::Debug, ops::Deref};

use auto_impl::auto_impl;
use rethnet_eth::{Address, B256, U256};
use revm::primitives::{AccountInfo, Bytecode};

type BoxedAccountModifierFn = Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>;

/// Debuggable function type for modifying account information.
pub struct AccountModifierFn {
    inner: BoxedAccountModifierFn,
}

impl AccountModifierFn {
    /// Constructs an [`AccountModifierDebuggableFn`] from the provided function.
    pub fn new(func: BoxedAccountModifierFn) -> Self {
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
    /// The state's error type.
    type Error;

    /// Retrieves the storage root of the account at the specified address.
    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error>;

    /// Inserts the provided account at the specified address.
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error>;

    /// Modifies the account at the specified address using the provided function. If no account
    /// exists for the specified address, an account will be generated using the `default_account_fn`
    /// and modified.
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, Self::Error>,
    ) -> Result<(), Self::Error>;

    /// Removes and returns the account at the specified address, if it exists.
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;

    /// Serializes the state using ordering of addresses and storage indices.
    fn serialize(&self) -> String;

    /// Sets the storage slot at the specified address and index to the provided value.
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error>;

    /// Retrieves the storage root of the database.
    fn state_root(&self) -> Result<B256, Self::Error>;
}
