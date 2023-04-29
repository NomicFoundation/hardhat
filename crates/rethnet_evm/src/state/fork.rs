use std::sync::Arc;

use hashbrown::{HashMap, HashSet};
use parking_lot::{Mutex, RwLock, RwLockUpgradableReadGuard};
use rethnet_eth::{
    remote::{BlockSpec, RpcClient},
    Address, B256, U256,
};
use revm::{
    db::{State, StateRef},
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};
use tokio::runtime::Runtime;

use crate::random::RandomHashGenerator;

use super::{
    remote::CachedRemoteState, HybridState, RemoteState, RethnetLayer, StateDebug, StateError,
    StateHistory,
};

/// A database integrating the state from a remote node and the state from a local layered
/// database.
#[derive(Debug)]
pub struct ForkState {
    local_state: HybridState<RethnetLayer>,
    remote_state: Arc<Mutex<CachedRemoteState>>,
    removed_storage_slots: HashSet<(Address, U256)>,
    fork_block_number: U256,
    /// client-facing state root (pseudorandomly generated) mapped to internal (layered_state) state root
    state_root_to_state: RwLock<HashMap<B256, B256>>,
    /// A pair of the generated state root and local state root
    current_state: RwLock<(B256, B256)>,
    initial_state_root: B256,
    hash_generator: Arc<Mutex<RandomHashGenerator>>,
}

impl ForkState {
    /// instantiate a new ForkState
    pub fn new(
        runtime: Arc<Runtime>,
        hash_generator: Arc<Mutex<RandomHashGenerator>>,
        url: &str,
        fork_block_number: U256,
        mut accounts: HashMap<Address, AccountInfo>,
    ) -> Self {
        let rpc_client = RpcClient::new(url);

        let remote_state = RemoteState::new(runtime.clone(), url, fork_block_number);

        accounts.iter_mut().for_each(|(address, mut account_info)| {
            let nonce = runtime
                .block_on(
                    rpc_client.get_transaction_count(address, BlockSpec::Number(fork_block_number)),
                )
                .expect("failed to retrieve remote account info for local account initialization");

            account_info.nonce = nonce.to();
        });

        let mut local_state = HybridState::with_accounts(accounts);
        local_state.checkpoint().unwrap();

        let generated_state_root = hash_generator.lock().next_value();
        let mut state_root_to_state = HashMap::new();
        let local_root = local_state.state_root().unwrap();
        state_root_to_state.insert(generated_state_root, local_root);

        Self {
            local_state,
            remote_state: Arc::new(Mutex::new(CachedRemoteState::new(remote_state))),
            removed_storage_slots: HashSet::new(),
            fork_block_number,
            state_root_to_state: RwLock::new(state_root_to_state),
            current_state: RwLock::new((generated_state_root, local_root)),
            initial_state_root: generated_state_root,
            hash_generator,
        }
    }
}

impl StateRef for ForkState {
    type Error = StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        if let Some(local) = self.local_state.basic(address)? {
            Ok(Some(local))
        } else {
            self.remote_state.lock().basic(address)
        }
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        if let Ok(layered) = self.local_state.code_by_hash(code_hash) {
            Ok(layered)
        } else {
            self.remote_state.lock().code_by_hash(code_hash)
        }
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        let local = self.local_state.storage(address, index)?;
        if local != U256::ZERO || self.removed_storage_slots.contains(&(address, index)) {
            Ok(local)
        } else {
            self.remote_state.lock().storage(address, index)
        }
    }
}

impl DatabaseCommit for ForkState {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        changes.iter().for_each(|(address, account)| {
            account.storage.iter().for_each(|(index, value)| {
                if value.present_value() == U256::ZERO {
                    self.removed_storage_slots.insert((*address, *index));
                }
            });
        });

        self.local_state.commit(changes)
    }
}

impl StateDebug for ForkState {
    type Error = StateError;

    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        self.local_state.account_storage_root(address)
    }

    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.local_state.insert_account(address, account_info)
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: crate::state::AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, Self::Error>,
    ) -> Result<(), Self::Error> {
        #[allow(clippy::redundant_closure)]
        self.local_state.modify_account(address, modifier, &|| {
            self.remote_state
                .lock()
                .basic(address)?
                .map_or_else(|| default_account_fn(), Result::Ok)
        })
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.local_state.remove_account(address)
    }

    fn serialize(&self) -> String {
        // TODO: Do we want to print history?
        self.local_state.serialize()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        if value == U256::ZERO {
            self.removed_storage_slots.insert((address, index));
        }

        self.local_state
            .set_account_storage_slot(address, index, value)
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        let local_root = self.local_state.state_root().unwrap();

        let current_state = self.current_state.upgradable_read();
        let state_root_to_state = self.state_root_to_state.upgradable_read();

        Ok(if local_root != current_state.1 {
            let next_state_root = self.hash_generator.lock().next_value();

            let mut state_root_to_state = RwLockUpgradableReadGuard::upgrade(state_root_to_state);
            state_root_to_state.insert(next_state_root, local_root);

            *RwLockUpgradableReadGuard::upgrade(current_state) = (next_state_root, local_root);

            next_state_root
        } else {
            current_state.0
        })
    }
}

impl StateHistory for ForkState {
    type Error = StateError;

    fn set_block_context(
        &mut self,
        state_root: &B256,
        block_number: Option<U256>,
    ) -> Result<(), Self::Error> {
        if let Some(block_number) = block_number {
            if block_number < self.fork_block_number {
                self.remote_state.lock().set_block_number(&block_number);

                let local_root = self
                    .state_root_to_state
                    .get_mut()
                    .get(&self.initial_state_root)
                    .unwrap();

                self.local_state.set_block_context(local_root, None)?;

                *self.current_state.get_mut() = (self.initial_state_root, *local_root);
            } else {
                let state_root_to_state = self.state_root_to_state.get_mut();
                let local_root = state_root_to_state.get(state_root).or_else(|| {
                    if block_number == self.fork_block_number {
                        state_root_to_state.get(&self.initial_state_root)
                    } else {
                        None
                    }
                });

                if let Some(local_root) = local_root {
                    self.local_state
                        .set_block_context(local_root, Some(block_number))?;

                    let block_number = block_number.min(self.fork_block_number);
                    self.remote_state.lock().set_block_number(&block_number);

                    *self.current_state.get_mut() = (*state_root, *local_root);
                } else {
                    return Err(Self::Error::InvalidStateRoot {
                        state_root: *state_root,
                        fork_identifier: true,
                    });
                }
            }
        } else if let Some(local_root) = self.state_root_to_state.get_mut().get(state_root) {
            self.local_state.set_block_context(local_root, None)?;
            self.remote_state
                .lock()
                .set_block_number(&self.fork_block_number);

            *self.current_state.get_mut() = (*state_root, *local_root);
        } else {
            return Err(Self::Error::InvalidStateRoot {
                state_root: *state_root,
                fork_identifier: true,
            });
        }

        Ok(())
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        // Ensure a potential state root is generated
        self.state_root()?;

        self.local_state.checkpoint()
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        self.local_state.revert()
    }

    fn make_snapshot(&mut self) -> B256 {
        self.local_state.make_snapshot();

        self.state_root().expect("should have been able to generate a new state root after triggering a snapshot in the underlying state")
    }

    fn remove_snapshot(&mut self, state_root: &B256) {
        self.local_state.remove_snapshot(state_root);
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
        let runtime = Arc::new(
            Builder::new_multi_thread()
                .enable_io()
                .enable_time()
                .build()
                .expect("failed to construct async runtime"),
        );

        let hash_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("seed")));

        let fork_state = ForkState::new(
            runtime,
            hash_generator,
            &get_alchemy_url().expect("failed to get alchemy url"),
            U256::from(16220843),
            HashMap::default(),
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
