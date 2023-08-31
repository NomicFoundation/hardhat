use rethnet_eth::{Address, B256, U256};
use revm::{
    db::components::{State, StateRef},
    primitives::{hash_map::Entry, AccountInfo, Bytecode, HashMap},
};

use crate::state::{account::RethnetAccount, StateError};

use super::RemoteState;

/// A cached version of [`RemoteState`].
#[derive(Debug)]
pub struct CachedRemoteState {
    remote: RemoteState,
    /// Mapping of block numbers to cached accounts
    account_cache: HashMap<U256, HashMap<Address, RethnetAccount>>,
    /// Mapping of block numbers to cached code
    code_cache: HashMap<U256, HashMap<B256, Bytecode>>,
}

impl CachedRemoteState {
    /// Constructs a new [`CachedRemoteState`].
    pub fn new(remote: RemoteState) -> Self {
        Self {
            remote,
            account_cache: HashMap::new(),
            code_cache: HashMap::new(),
        }
    }

    /// Sets the block number used for calls to the remote Ethereum node.
    pub fn set_block_number(&mut self, block_number: &U256) {
        self.remote.set_block_number(block_number);
    }
}

impl State for CachedRemoteState {
    type Error = StateError;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let block_accounts = self
            .account_cache
            .entry(*self.remote.block_number())
            .or_default();

        if let Some(account) = block_accounts.get(&address) {
            return Ok(Some(account.info.clone()));
        }

        if let Some(mut account_info) = self.remote.basic(address)? {
            // Split code and store separately
            if let Some(code) = account_info.code.take() {
                let block_code = self
                    .code_cache
                    .entry(*self.remote.block_number())
                    .or_default();

                block_code.entry(account_info.code_hash).or_insert(code);
            }

            block_accounts.insert(address, account_info.clone().into());

            return Ok(Some(account_info));
        }

        Ok(None)
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        let block_code = self
            .code_cache
            .entry(*self.remote.block_number())
            .or_default();

        block_code
            .get(&code_hash)
            .cloned()
            .ok_or(StateError::InvalidCodeHash(code_hash))
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        let block_accounts = self
            .account_cache
            .entry(*self.remote.block_number())
            .or_default();

        Ok(match block_accounts.entry(address) {
            Entry::Occupied(mut account_entry) => {
                match account_entry.get_mut().storage.entry(index) {
                    Entry::Occupied(entry) => *entry.get(),
                    Entry::Vacant(entry) => *entry.insert(self.remote.storage(address, index)?),
                }
            }
            Entry::Vacant(account_entry) => {
                // account needs to be loaded for us to access slots.
                let mut account = self
                    .remote
                    .basic(address)?
                    .map_or_else(RethnetAccount::default, RethnetAccount::from);

                let value = self.remote.storage(address, index)?;
                account.storage.insert(index, value);

                account_entry.insert(account);
                value
            }
        })
    }
}
