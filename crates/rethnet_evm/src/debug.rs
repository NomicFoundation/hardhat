use primitive_types::{H160, H256, U256};
use revm::{AccountInfo, Bytecode};

/// A trait for debug operation on a database.
pub trait DatabaseDebug {
    type Error;

    /// Inserts an account with the specified `address`.
    fn insert_account(
        &mut self,
        address: H160,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error>;

    /// Inserts a block with the specified `block_number` and `block_hash`.
    fn insert_block(&mut self, block_number: U256, block_hash: H256) -> Result<(), Self::Error>;

    /// Sets the account balance at the specified address to the provided value.
    fn set_account_balance(&mut self, address: H160, balance: U256) -> Result<(), Self::Error>;

    /// Sets the account code at the specified address to the provided value.
    fn set_account_code(&mut self, address: H160, code: Bytecode) -> Result<(), Self::Error>;

    /// Sets the account nonce at the specified address to the provided value.
    fn set_account_nonce(&mut self, address: H160, nonce: u64) -> Result<(), Self::Error>;

    /// Sets the storage slot at the specified address and index to the provided value.
    fn set_account_storage_slot(
        &mut self,
        address: H160,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error>;

    /// Retrieves the storage root of the database.
    fn storage_root(&mut self) -> Result<H256, Self::Error>;
}
