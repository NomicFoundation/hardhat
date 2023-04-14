use hashbrown::HashMap;
use once_cell::sync::Lazy;
use parking_lot::{Mutex, RwLock, RwLockUpgradableReadGuard};
use rethnet_eth::{
    remote::{BlockSpec, RpcClient},
    Address, B256, U256,
};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};
use tokio::runtime::Runtime;

use crate::random::RandomHashGenerator;

use super::{LayeredState, RemoteState, RethnetLayer, StateDebug, StateError, StateHistory};

static RANDOM_HASH_GENERATOR: Lazy<Mutex<RandomHashGenerator>> =
    Lazy::new(|| Mutex::new(RandomHashGenerator::with_seed("seed")));

/// A database integrating the state from a remote node and the state from a local layered
/// database.
#[derive(Debug)]
pub struct ForkState {
    layered_state: LayeredState<RethnetLayer>,
    remote_state: RemoteState,
    /// mapping of (address, block_number) to AccountInfo
    account_info_cache: RwLock<HashMap<(Address, U256), AccountInfo>>,
    code_by_hash_cache: RwLock<HashMap<B256, Bytecode>>,
    storage_cache: RwLock<HashMap<(Address, U256), U256>>,
    fork_block_number: U256,
    /// client-facing state root (pseudorandomly generated) mapped to internal (layered_state) state root
    state_root_to_state: RwLock<HashMap<B256, B256>>,
    /// for mapping historical blocks to their state roots
    state_root_to_block_number: HashMap<B256, U256>,
    latest_state_root: RwLock<B256>,
}

impl ForkState {
    /// instantiate a new ForkState
    pub fn new(
        runtime: &Runtime,
        url: &str,
        accounts: HashMap<Address, AccountInfo>,
        fork_block_number: Option<U256>,
    ) -> Self {
        let rpc_client = RpcClient::new(url);

        let fork_block_number = fork_block_number
            .or_else(|| {
                runtime
                    .block_on(rpc_client.get_latest_block())
                    .expect("failed to get latest block")
                    .number
                    .map(U256::from)
            })
            .unwrap();

        let remote_state = RemoteState::new(url, fork_block_number);

        let mut initialized_accounts = accounts.clone();
        for (address, account_info) in accounts.iter() {
            let remote_account_info = runtime
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

        let layered_state = LayeredState::with_accounts(initialized_accounts);
        let generated_state_root = RANDOM_HASH_GENERATOR.lock().next();

        Self {
            layered_state,
            remote_state,
            account_info_cache: RwLock::new(HashMap::new()),
            code_by_hash_cache: RwLock::new(HashMap::new()),
            storage_cache: RwLock::new(HashMap::new()),
            fork_block_number,
            state_root_to_state: RwLock::new(HashMap::new()),
            latest_state_root: RwLock::new(generated_state_root),
            state_root_to_block_number: HashMap::new(),
        }
    }

    /// if not already cached, fetches from remote then caches; then returns cached
    fn get_remote_account_info(
        &self,
        address: &Address,
        block_number: U256,
    ) -> Result<Option<AccountInfo>, super::StateError> {
        let account_info_cache = self.account_info_cache.upgradable_read();
        if let Some(cached) = account_info_cache.get(&(*address, block_number)) {
            Ok(Some(cached.clone()))
        } else if let Some(mut remote_account) = self.remote_state.basic(*address)? {
            let mut account_info_cache = RwLockUpgradableReadGuard::upgrade(account_info_cache);
            account_info_cache.insert((*address, block_number), remote_account.clone());

            if let Some(code) = remote_account.code.take() {
                let mut code_by_hash_cache = self.code_by_hash_cache.write();
                code_by_hash_cache.insert(remote_account.code_hash, code);
            }

            Ok(Some(remote_account))
        } else {
            Ok(None)
        }
    }
}

impl StateRef for ForkState {
    type Error = super::StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let latest_state_root = *self.latest_state_root.read();

        let block_number = self
            .state_root_to_block_number
            .get(&latest_state_root)
            .unwrap_or(&self.fork_block_number);

        if block_number < &self.fork_block_number {
            self.get_remote_account_info(&address, *block_number)
        } else if let Some(layered) = self.layered_state.basic(address)? {
            Ok(Some(layered))
        } else if let Some(remote) = self.get_remote_account_info(&address, *block_number)? {
            Ok(Some(remote))
        } else {
            Ok(None)
        }
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        if let Ok(layered) = self.layered_state.code_by_hash(code_hash) {
            Ok(layered)
        } else if let Some(cached) = self.code_by_hash_cache.read().get(&code_hash).cloned() {
            Ok(cached)
        } else {
            // remote_state doesn't support code_by_hash, so there's no delegation to it here.
            Err(Self::Error::InvalidCodeHash(code_hash))
        }
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        let layered = self.layered_state.storage(address, index)?;

        if layered != U256::from(0) {
            Ok(layered)
        } else if let Some(cached) = self.storage_cache.read().get(&(address, index)).cloned() {
            Ok(cached)
        } else {
            let remote = self.remote_state.storage(address, index)?;

            self.storage_cache.write().insert((address, index), remote);

            Ok(remote)
        }
    }
}

impl DatabaseCommit for ForkState {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.layered_state.commit(changes)
    }
}

impl StateDebug for ForkState {
    type Error = super::StateError;

    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        self.layered_state.account_storage_root(address)
    }

    /// Inserts an account with the specified address.
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.layered_state.insert_account(address, account_info)
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: crate::state::AccountModifierFn,
    ) -> Result<(), Self::Error> {
        if (self.layered_state.basic(address)?).is_none() {
            if let Some(remote_account_info) =
                self.get_remote_account_info(&address, self.fork_block_number)?
            {
                self.layered_state
                    .insert_account(address, remote_account_info)?
            }
        }

        self.layered_state.modify_account(address, modifier)?;

        Ok(())
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.layered_state.remove_account(address)
    }

    fn serialize(&self) -> String {
        // TODO: Do we want to print history?
        self.layered_state.serialize()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        self.layered_state
            .set_account_storage_slot(address, index, value)
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        let state_root = self.layered_state.state_root().unwrap();

        let latest_state_root = self.latest_state_root.upgradable_read();

        let state_root_to_state = self.state_root_to_state.upgradable_read();
        Ok(
            if let Some(mapped_state) = state_root_to_state.get(&*latest_state_root) {
                if state_root != *mapped_state {
                    let next_state_root = RANDOM_HASH_GENERATOR.lock().next();

                    let mut state_root_to_state =
                        RwLockUpgradableReadGuard::upgrade(state_root_to_state);
                    state_root_to_state.insert(next_state_root, state_root);

                    let mut latest_state_root =
                        RwLockUpgradableReadGuard::upgrade(latest_state_root);
                    *latest_state_root = next_state_root;

                    next_state_root
                } else {
                    *latest_state_root
                }
            } else {
                let mut state_root_to_state =
                    RwLockUpgradableReadGuard::upgrade(state_root_to_state);
                state_root_to_state.insert(*latest_state_root, state_root);

                *latest_state_root
            },
        )
    }
}

impl StateHistory for ForkState {
    type Error = StateError;

    fn set_block_context(
        &mut self,
        state_root: &B256,
        block_number: Option<U256>,
    ) -> Result<(), Self::Error> {
        if let Some(block_number) = &block_number {
            self.state_root_to_block_number
                .insert(*state_root, *block_number);
        }

        let state_root_to_state = self.state_root_to_state.read();
        if let Some(state) = state_root_to_state.get(state_root) {
            self.layered_state.set_block_context(state, block_number)?;

            let mut latest_state_root = self.latest_state_root.write();
            *latest_state_root = *state_root;

            Ok(())
        } else if self.state_root_to_block_number.get(state_root).is_some() {
            let mut latest_state_root = self.latest_state_root.write();
            *latest_state_root = *state_root;

            Ok(())
        } else {
            Err(Self::Error::InvalidStateRoot(*state_root))
        }
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        self.layered_state.checkpoint()?;
        let my_state_root = RANDOM_HASH_GENERATOR.lock().next();
        let state = self.layered_state.state_root()?;

        {
            let mut state_root_to_state = self.state_root_to_state.write();
            state_root_to_state.insert(my_state_root, state);
        }

        {
            let mut latest_state_root = self.latest_state_root.write();
            *latest_state_root = my_state_root;
        }

        Ok(())
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        self.layered_state.revert()
    }

    fn make_snapshot(&mut self) -> B256 {
        self.layered_state.make_snapshot();
        self.state_root().expect("should have been able to generate a new state root after triggering a snapshot in the underlying state")
    }

    fn remove_snapshot(&mut self, state_root: &B256) {
        self.layered_state.remove_snapshot(state_root);
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use tokio::runtime::Builder;

    use super::*;

    fn get_alchemy_url() -> Result<String, String> {
        match std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String")
        {
            url if url.is_empty() => panic!("ALCHEMY_URL environment variable is empty"),
            url => Ok(url),
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[test]
    fn basic_success() {
        let runtime = Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .expect("failed to construct async runtime");

        let fork_state = ForkState::new(
            &runtime,
            &get_alchemy_url().expect("failed to get alchemy url"),
            HashMap::default(),
            Some(U256::from(16220843)),
        );

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_info = fork_state
            .basic(dai_address)
            .expect("should have succeeded");
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
