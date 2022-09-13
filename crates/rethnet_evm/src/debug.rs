use primitive_types::{H160, H256, U256};
use revm::AccountInfo;

/// A trait for debug operation on a database.
pub trait DatabaseDebug {
    /// Retrieves the storage root of the database.
    fn storage_root(&mut self) -> H256;

    /// Retrieves a mutable reference to the account with the specified address.
    fn account_info_mut(&mut self, address: &H160) -> &mut AccountInfo;

    /// Inserts an account with the specified `address`.
    fn insert_account(&mut self, address: &H160, account_info: AccountInfo);

    /// Inserts a block with the specified `block_number` and `block_hash`.
    fn insert_block(&mut self, block_number: U256, block_hash: H256);

    /// Set storage slot at the specified `address` and `index`.
    fn set_storage_slot_at_layer(&mut self, address: H160, index: U256, value: U256);
}
