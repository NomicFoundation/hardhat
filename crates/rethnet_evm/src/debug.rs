use auto_impl::auto_impl;
use rethnet_eth::{Address, H256, U256};
use revm::{AccountInfo, Bytecode};

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

    /// Inserts a block with the specified `block_number` and `block_hash`.
    fn insert_block(&mut self, block_number: U256, block_hash: H256) -> Result<(), Self::Error>;

    /// Modifies the account at the specified address using the provided function.
    fn modify_account(
        &mut self,
        address: Address,
        modifier: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>,
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
    fn set_state_root(&mut self, state_root: &H256) -> Result<(), Self::Error>;

    /// Retrieves the storage root of the database.
    fn state_root(&mut self) -> Result<H256, Self::Error>;

    /// Creates a checkpoint that can be reverted to using [`revert`].
    fn checkpoint(&mut self) -> Result<(), Self::Error>;

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    fn revert(&mut self) -> Result<(), Self::Error>;
}

// /// A trait for objects that support [`DatabaseDebug`].
// pub trait HasDatabaseDebug {
//     /// The database's error type.
//     type Error;

//     /// Retrieves the owned `DatabaseDebug`.
//     fn db_debug(&mut self) -> &mut dyn DatabaseDebug<Error = Self::Error>;
// }

// impl<T: HasDatabaseDebug> DatabaseDebug for T {
//     type Error = <T as HasDatabaseDebug>::Error;

//     fn insert_account(
//         &mut self,
//         address: Address,
//         account_info: AccountInfo,
//     ) -> Result<(), Self::Error> {
//         self.db_debug().insert_account(address, account_info)
//     }

//     fn insert_block(&mut self, block_number: U256, block_hash: H256) -> Result<(), Self::Error> {
//         self.db_debug().insert_block(block_number, block_hash)
//     }

//     fn modify_account(
//         &mut self,
//         address: Address,
//         modifier: fn(&mut AccountInfo),
//     ) -> Result<(), Self::Error> {
//         self.db_debug().modify_account(address, modifier)
//     }

//     fn storage_root(&mut self) -> Result<H256, Self::Error> {
//         self.db_debug().storage_root()
//     }

//     fn checkpoint(&mut self) -> Result<(), Self::Error> {
//         self.db_debug().checkpoint()
//     }

//     fn revert(&mut self) -> Result<(), Self::Error> {
//         self.db_debug().revert()
//     }
// }
