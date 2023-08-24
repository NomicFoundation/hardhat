use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::{Mutex, RwLock, RwLockUpgradableReadGuard};
use rethnet_eth::{
    remote::{BlockSpec, RpcClient},
    Address, B256, U256,
};
use revm::{
    db::components::{State, StateRef},
    primitives::{Account, AccountInfo, Bytecode, HashMap, HashSet},
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
    removed_remote_accounts: HashSet<Address>,
}

impl ForkState {
    /// Constructs a new instance.
    pub fn new(
        runtime: Arc<Runtime>,
        hash_generator: Arc<Mutex<RandomHashGenerator>>,
        url: &str,
        cache_dir: PathBuf,
        fork_block_number: U256,
        mut accounts: HashMap<Address, AccountInfo>,
    ) -> Self {
        let rpc_client = RpcClient::new(url, cache_dir);

        accounts.iter_mut().for_each(|(address, mut account_info)| {
            let nonce = tokio::task::block_in_place(|| {
                runtime.block_on(
                    rpc_client
                        .get_transaction_count(address, Some(BlockSpec::Number(fork_block_number))),
                )
            })
            .expect("failed to retrieve remote account info for local account initialization");

            account_info.nonce = nonce.to();
        });

        let remote_state = RemoteState::new(runtime, rpc_client, fork_block_number);

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
            removed_remote_accounts: HashSet::new(),
        }
    }

    fn update_removed_storage_slots(&mut self) {
        self.removed_storage_slots.clear();

        self.local_state
            .changes()
            .rev()
            .flat_map(RethnetLayer::accounts)
            .for_each(|(address, account)| {
                // We never need to remove zero entries as a "removed" entry means that the lookup for
                // a value in the hybrid state succeeded.
                if let Some(account) = account {
                    account.storage.iter().for_each(|(index, value)| {
                        if *value == U256::ZERO {
                            self.removed_storage_slots.insert((*address, *index));
                        }
                    });
                }
            });
    }
}

impl Clone for ForkState {
    fn clone(&self) -> Self {
        Self {
            local_state: self.local_state.clone(),
            remote_state: self.remote_state.clone(),
            removed_storage_slots: self.removed_storage_slots.clone(),
            fork_block_number: self.fork_block_number,
            state_root_to_state: RwLock::new(self.state_root_to_state.read().clone()),
            current_state: RwLock::new(*self.current_state.read()),
            initial_state_root: self.initial_state_root,
            hash_generator: self.hash_generator.clone(),
            removed_remote_accounts: self.removed_remote_accounts.clone(),
        }
    }
}

impl StateRef for ForkState {
    type Error = StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        if let Some(local) = self.local_state.basic(address)? {
            Ok(Some(local))
        } else if self.removed_remote_accounts.contains(&address) {
            Ok(None)
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
                // We never need to remove zero entries as a "removed" entry means that the lookup for
                // a value in the hybrid state succeeded.
                if value.present_value() == U256::ZERO {
                    self.removed_storage_slots.insert((*address, *index));
                }
            });
        });

        self.local_state.commit(changes);
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
        if let Some(account_info) = self.local_state.remove_account(address)? {
            Ok(Some(account_info))
        } else if self.removed_remote_accounts.contains(&address) {
            Ok(None)
        } else if let Some(account_info) = self.remote_state.lock().basic(address)? {
            self.removed_remote_accounts.insert(address);
            Ok(Some(account_info))
        } else {
            Ok(None)
        }
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
        // We never need to remove zero entries as a "removed" entry means that the lookup for
        // a value in the hybrid state succeeded.
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

        Ok(if local_root == current_state.1 {
            current_state.0
        } else {
            let next_state_root = self.hash_generator.lock().next_value();

            let mut state_root_to_state = RwLockUpgradableReadGuard::upgrade(state_root_to_state);
            state_root_to_state.insert(next_state_root, local_root);

            *RwLockUpgradableReadGuard::upgrade(current_state) = (next_state_root, local_root);

            next_state_root
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
                        is_fork: true,
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
                is_fork: true,
            });
        }

        self.update_removed_storage_slots();

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

#[cfg(all(test, feature = "test-remote"))]
mod tests {
    use std::ops::{Deref, DerefMut};
    use std::str::FromStr;

    use rethnet_test_utils::env::get_alchemy_url;
    use tokio::runtime::Builder;

    use super::*;

    const FORK_BLOCK: u64 = 16220843;

    struct TestForkState {
        fork_state: ForkState,
        // We need to keep it around as long as the fork state is alive
        _tempdir: tempfile::TempDir,
    }

    impl TestForkState {
        fn new() -> Self {
            let runtime = Arc::new(
                Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("failed to construct async runtime"),
            );

            let hash_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("seed")));

            let tempdir = tempfile::tempdir().expect("can create tempdir");

            let fork_state = ForkState::new(
                runtime,
                hash_generator,
                &get_alchemy_url(),
                tempdir.path().to_path_buf(),
                U256::from(FORK_BLOCK),
                HashMap::default(),
            );
            Self {
                fork_state,
                _tempdir: tempdir,
            }
        }
    }

    impl Deref for TestForkState {
        type Target = ForkState;

        fn deref(&self) -> &Self::Target {
            &self.fork_state
        }
    }

    impl DerefMut for TestForkState {
        fn deref_mut(&mut self) -> &mut Self::Target {
            &mut self.fork_state
        }
    }

    #[test]
    fn basic_success() {
        let fork_state = TestForkState::new();

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

    #[test]
    fn set_block_context_with_zeroed_storage_slots() {
        const STORAGE_SLOT_INDEX: u64 = 1;
        const DUMMY_STORAGE_VALUE: u64 = 1000;

        let mut fork_state = TestForkState::new();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let storage_slot_index = U256::from(STORAGE_SLOT_INDEX);
        let dummy_storage_value = U256::from(DUMMY_STORAGE_VALUE);
        let initial_state_root = fork_state.initial_state_root;

        let remote_value =
            U256::from_str("0x000000000000000000000000000000000000000010a596ae049e066d4991945c")
                .unwrap();

        // Validate remote storage slot value
        assert_eq!(
            fork_state.storage(dai_address, storage_slot_index).unwrap(),
            remote_value
        );

        // Set storage slot to zero
        fork_state
            .set_account_storage_slot(dai_address, storage_slot_index, U256::ZERO)
            .unwrap();

        // Validate storage slot equals zero
        let fork_storage_slot = fork_state.storage(dai_address, storage_slot_index).unwrap();
        assert_eq!(fork_storage_slot, U256::ZERO);

        // Retrieve the state root that we want to revert to later on
        let zeroed_state_root = fork_state.state_root().unwrap();

        // Create layers with modified storage slot values that will be reverted
        fork_state.checkpoint().unwrap();

        fork_state
            .set_account_storage_slot(dai_address, storage_slot_index, dummy_storage_value)
            .unwrap();

        fork_state.checkpoint().unwrap();

        let dummy_storage_state_root = fork_state.make_snapshot();

        // Validate storage slot equals zero after reverting to zeroed storage slot state
        fork_state
            .set_block_context(&zeroed_state_root, None)
            .unwrap();

        let fork_storage_slot = fork_state.storage(dai_address, storage_slot_index).unwrap();
        assert_eq!(fork_storage_slot, U256::ZERO);

        // Validate remote storage slot value after reverting to initial state
        fork_state
            .set_block_context(&initial_state_root, None)
            .unwrap();

        assert_eq!(
            fork_state.storage(dai_address, storage_slot_index).unwrap(),
            remote_value
        );

        // Validate that the dummy value is returned after fast-forward to that state
        fork_state
            .set_block_context(&dummy_storage_state_root, None)
            .unwrap();

        let fork_storage_slot = fork_state.storage(dai_address, storage_slot_index).unwrap();
        assert_eq!(fork_storage_slot, dummy_storage_value);
    }

    #[test]
    fn remove_remote_account_success() {
        let mut fork_state = TestForkState::new();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        fork_state.remove_account(dai_address).unwrap();

        assert_eq!(fork_state.basic(dai_address).unwrap(), None);
    }
}
