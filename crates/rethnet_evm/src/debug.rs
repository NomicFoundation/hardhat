use auto_impl::auto_impl;
use rethnet_eth::{Address, B256, U256};
use revm::{AccountInfo, Bytecode};

pub type ModifierFn = Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>;

/// A trait for debug operation on a database.
#[auto_impl(Box)]
pub trait DatabaseDebug {
    /// The database's error type.
    type Error;

    /// Inserts an account with the specified `address`.
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error>;

    /// Modifies the account at the specified address using the provided function.
    fn modify_account(&mut self, address: Address, modifier: ModifierFn)
        -> Result<(), Self::Error>;

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

    /// Makes a snapshot of the database that's retained until [`remove_snapshot`] is called. Returns the snapshot's identifier.
    fn make_snapshot(&mut self) -> B256;

    /// Removes the snapshot corresponding to the specified id, if it exists. Returns whether a snapshot was removed.
    fn remove_snapshot(&mut self, state_root: &B256) -> bool;
}
