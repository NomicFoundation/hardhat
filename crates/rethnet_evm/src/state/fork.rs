use hashbrown::HashMap;
use revm::primitives::{Account, AccountInfo, Bytecode};
use tokio::runtime::Builder;

use rethnet_eth::{
    remote::{BlockSpec, RpcClient},
    Address, B256, U256,
};

use crate::state::{
    layered_state::{LayeredState, RethnetLayer},
    remote::RemoteDatabase,
};

/// A database integrating the state from a remote node and the state from a local layered
/// database.
pub struct ForkState {
    layered_db: LayeredState<RethnetLayer>,
    remote_db: RemoteDatabase,
    account_info_cache: HashMap<Address, AccountInfo>,
    code_by_hash_cache: HashMap<B256, Bytecode>,
    storage_cache: HashMap<(Address, U256), U256>,
    fork_block_number: u64,
    fork_block_state_root_cache: Option<B256>,
}

impl ForkState {
    /// instantiate a new ForkState
    pub fn new(
        url: &str,
        accounts: HashMap<Address, AccountInfo>,
        fork_block_number: Option<u64>,
    ) -> Self {
        let rpc_client = RpcClient::new(url);

        let async_runtime = Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .expect("failed to construct async runtime");

        let fork_block_number = fork_block_number
            .or(async_runtime
                .block_on(rpc_client.get_latest_block())
                .expect("failed to get latest block")
                .number)
            .unwrap();

        let remote_db = RemoteDatabase::new(url, fork_block_number);

        let mut initialized_accounts = accounts.clone();
        for (address, account_info) in accounts.iter() {
            let remote_account_info = async_runtime
                .block_on(
                    rpc_client.get_account_info(address, BlockSpec::Number(fork_block_number)),
                )
                .expect("failed to retrieve remote account info for local account initialization");
            initialized_accounts.insert(
                *address,
                AccountInfo {
                    nonce: remote_account_info.nonce,
                    ..account_info.clone()
                },
            );
        }

        let mut layered_db =
            LayeredState::with_layer(RethnetLayer::with_genesis_accounts(initialized_accounts));

        crate::state::StateDebug::checkpoint(&mut layered_db).unwrap();

        Self {
            layered_db,
            remote_db,
            account_info_cache: HashMap::new(),
            code_by_hash_cache: HashMap::new(),
            storage_cache: HashMap::new(),
            fork_block_number,
            fork_block_state_root_cache: None,
        }
    }
}

impl revm::db::State for ForkState {
    type Error = super::StateError;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        use revm::db::StateRef; // for basic()
        if let Some(layered) = self.layered_db.basic(address)? {
            Ok(Some(layered))
        } else if let Some(cached) = self.account_info_cache.get(&address) {
            Ok(Some(cached.clone()))
        } else if let Some(remote) = self.remote_db.basic(address).map_err(Self::Error::Remote)? {
            self.account_info_cache.insert(address, remote.clone());

            if remote.code.is_some() {
                self.code_by_hash_cache
                    .insert(remote.code_hash, remote.code.clone().unwrap());
            }

            Ok(Some(remote))
        } else {
            Ok(None)
        }
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        if let Ok(layered) = self.layered_db.code_by_hash(code_hash) {
            Ok(layered)
        } else if let Some(cached) = self.code_by_hash_cache.get(&code_hash) {
            Ok(cached.clone())
        } else {
            // remote_db doesn't support code_by_hash, so there's no delegation to it here.
            Err(Self::Error::InvalidCodeHash(code_hash))
        }
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        use revm::db::StateRef; // for storage()
        let layered = self.layered_db.storage(address, index)?;

        if layered != U256::from(0) {
            Ok(layered)
        } else if let Some(cached) = self.storage_cache.get(&(address, index)) {
            Ok(*cached)
        } else {
            let remote = self
                .remote_db
                .storage(address, index)
                .map_err(Self::Error::Remote)?;

            self.storage_cache.insert((address, index), remote);

            Ok(remote)
        }
    }
}

impl revm::DatabaseCommit for ForkState {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.layered_db.commit(changes)
    }
}

impl crate::state::debug::StateDebug for ForkState {
    type Error = super::StateError;

    fn account_storage_root(&mut self, address: &Address) -> Result<Option<B256>, Self::Error> {
        self.layered_db.account_storage_root(address)
    }

    /// Inserts an account with the specified address.
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.layered_db.insert_account(address, account_info)
    }

    /// Modifies the account at the specified address using the provided function.
    fn modify_account(
        &mut self,
        address: Address,
        modifier: crate::state::AccountModifierFn,
    ) -> Result<(), Self::Error> {
        use revm::db::{State, StateRef}; // for basic() (from both)

        if (self.layered_db.basic(address)?).is_none() {
            let account_info = if let Some(cached) = self.account_info_cache.get(&address) {
                Some(cached.clone())
            } else if let Some(remote) = self.remote_db.basic(address)? {
                self.account_info_cache.insert(address, remote.clone());

                if remote.code.is_some() {
                    self.code_by_hash_cache
                        .insert(remote.code_hash, remote.code.clone().unwrap());
                }

                Some(remote)
            } else {
                None
            };
            if let Some(account_info) = account_info {
                self.layered_db.insert_account(address, account_info)?
            }
        }
        self.layered_db.modify_account(address, modifier)
    }

    /// Removes and returns the account at the specified address, if it exists.
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        crate::state::StateDebug::remove_account(&mut self.layered_db, address)
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.layered_db
            .set_account_storage_slot(address, index, value)
    }

    /// Reverts the state to match the specified state root.
    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error> {
        self.layered_db.set_state_root(state_root)
    }

    /// Retrieves the storage root of the database.
    fn state_root(&mut self) -> Result<B256, Self::Error> {
        if self.layered_db.iter().next().is_some() {
            Ok(self.layered_db.state_root()?)
        } else if let Some(cached) = self.fork_block_state_root_cache {
            Ok(cached)
        } else {
            self.fork_block_state_root_cache =
                Some(self.remote_db.state_root(self.fork_block_number)?);
            Ok(self.fork_block_state_root_cache.unwrap())
        }
    }

    /// Creates a checkpoint that can be reverted to using [`revert`].
    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        self.layered_db.checkpoint()
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    fn revert(&mut self) -> Result<(), Self::Error> {
        self.layered_db.revert()
    }

    /// Makes a snapshot of the database that's retained until [`remove_snapshot`] is called. Returns the snapshot's identifier.
    fn make_snapshot(&mut self) -> B256 {
        self.layered_db.make_snapshot()
    }

    /// Removes the snapshot corresponding to the specified id, if it exists. Returns whether a snapshot was removed.
    fn remove_snapshot(&mut self, state_root: &B256) -> bool {
        self.layered_db.remove_snapshot(state_root)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::str::FromStr;

    fn get_alchemy_url() -> Result<String, String> {
        Ok(std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String"))
    }

    #[test_with::env(ALCHEMY_URL)]
    #[test]
    fn basic_success() {
        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");
        let mut fork_db = ForkState::new(
            &get_alchemy_url().expect("failed to get alchemy url"),
            HashMap::default(),
            Some(16220843),
        );
        let account_info =
            revm::db::State::basic(&mut fork_db, dai_address).expect("should have succeeded");

        assert!(account_info.is_some());
        let account_info = account_info.unwrap();
        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
        assert_eq!(
            account_info.code_hash,
            B256::from_str("0x4e36f96ee1667a663dfaac57c4d185a0e369a3a217e0079d49620f34f85d1ac7")
                .expect("failed to parse")
        );
    }
}
