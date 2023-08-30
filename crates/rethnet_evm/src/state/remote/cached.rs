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
            if self.remote.is_cacheable()? {
                // Split code and store separately
                if let Some(code) = account_info.code.take() {
                    let block_code = self
                        .code_cache
                        .entry(*self.remote.block_number())
                        .or_default();

                    block_code.entry(account_info.code_hash).or_insert(code);
                }

                block_accounts.insert(address, account_info.clone().into());
            }
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
                    Entry::Vacant(entry) => {
                        let value = self.remote.storage(address, index)?;
                        if self.remote.is_cacheable()? {
                            *entry.insert(value)
                        } else {
                            value
                        }
                    }
                }
            }
            Entry::Vacant(account_entry) => {
                // account needs to be loaded for us to access slots.
                let mut account = self
                    .remote
                    .basic(address)?
                    .map_or_else(RethnetAccount::default, RethnetAccount::from);

                let value = self.remote.storage(address, index)?;

                if self.remote.is_cacheable()? {
                    account.storage.insert(index, value);
                    account_entry.insert(account);
                }

                value
            }
        })
    }
}

#[cfg(all(test, feature = "test-remote"))]
mod tests {
    use std::str::FromStr;
    use std::sync::Arc;

    use rethnet_eth::remote::RpcClient;
    use rethnet_test_utils::env::get_alchemy_url;
    use tokio::runtime::Builder;

    use super::*;

    #[test]
    fn no_cache_for_unsafe_block_number() {
        let runtime = Arc::new(
            Builder::new_multi_thread()
                .enable_io()
                .enable_time()
                .build()
                .expect("failed to construct async runtime"),
        );

        let tempdir = tempfile::tempdir().expect("can create tempdir");

        let rpc_client = RpcClient::new(&get_alchemy_url(), tempdir.path().to_path_buf());

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        // Latest block number is always unsafe
        let block_number = runtime.block_on(rpc_client.block_number()).unwrap();

        let remote = RemoteState::new(runtime, rpc_client, block_number);
        let mut cached = CachedRemoteState::new(remote);

        cached.basic(dai_address).expect("should succeed").unwrap();

        cached
            .storage(dai_address, U256::from(0))
            .expect("should succeed");

        for entry in cached.account_cache.values() {
            assert!(entry.is_empty());
        }

        for entry in cached.code_cache.values() {
            assert!(entry.is_empty());
        }
    }
}
