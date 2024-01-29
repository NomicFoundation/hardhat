use std::sync::Arc;

use edr_eth::{remote::RpcClient, trie::KECCAK_NULL_RLP, Address, B256, U256};
use parking_lot::{Mutex, RwLock, RwLockUpgradableReadGuard};
use revm::{
    db::components::{State, StateRef},
    primitives::{Account, AccountInfo, Bytecode, HashMap, HashSet},
    DatabaseCommit,
};
use tokio::runtime;

use super::{remote::CachedRemoteState, RemoteState, StateDebug, StateError, TrieState};
use crate::random::RandomHashGenerator;

/// A database integrating the state from a remote node and the state from a
/// local layered database.
#[derive(Debug)]
pub struct ForkState {
    local_state: TrieState,
    remote_state: Arc<Mutex<CachedRemoteState>>,
    removed_storage_slots: HashSet<(Address, U256)>,
    /// A pair of the latest state root and local state root
    current_state: RwLock<(B256, B256)>,
    hash_generator: Arc<Mutex<RandomHashGenerator>>,
    removed_remote_accounts: HashSet<Address>,
}

impl ForkState {
    /// Constructs a new instance
    pub fn new(
        runtime: runtime::Handle,
        rpc_client: Arc<RpcClient>,
        hash_generator: Arc<Mutex<RandomHashGenerator>>,
        fork_block_number: u64,
        state_root: B256,
    ) -> Self {
        let remote_state = RemoteState::new(runtime, rpc_client, fork_block_number);
        let local_state = TrieState::default();

        let mut state_root_to_state = HashMap::new();
        let local_root = local_state.state_root().unwrap();
        state_root_to_state.insert(state_root, local_root);

        Self {
            local_state,
            remote_state: Arc::new(Mutex::new(CachedRemoteState::new(remote_state))),
            removed_storage_slots: HashSet::new(),
            current_state: RwLock::new((state_root, local_root)),
            hash_generator,
            removed_remote_accounts: HashSet::new(),
        }
    }

    /// Overrides the state root of the fork state.
    pub fn set_state_root(&mut self, state_root: B256) {
        let local_root = self.local_state.state_root().unwrap();

        *self.current_state.get_mut() = (state_root, local_root);
    }
}

impl Clone for ForkState {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn clone(&self) -> Self {
        Self {
            local_state: self.local_state.clone(),
            remote_state: self.remote_state.clone(),
            removed_storage_slots: self.removed_storage_slots.clone(),
            current_state: RwLock::new(*self.current_state.read()),
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
                // We never need to remove zero entries as a "removed" entry means that the
                // lookup for a value in the hybrid state succeeded.
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

    fn account_storage_root(&self, _address: &Address) -> Result<Option<B256>, Self::Error> {
        // HACK: Hardhat ignores the storage root, so we set it to the default value
        Ok(Some(KECCAK_NULL_RLP))
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
    ) -> Result<AccountInfo, Self::Error> {
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
        self.local_state.serialize()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<U256, Self::Error> {
        if value == U256::ZERO {
            self.removed_storage_slots.insert((address, index));
        }

        self.local_state
            .set_account_storage_slot(address, index, value)
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        let local_root = self.local_state.state_root().unwrap();

        let current_state = self.current_state.upgradable_read();

        Ok(if local_root == current_state.1 {
            current_state.0
        } else {
            let next_state_root = self.hash_generator.lock().next_value();

            *RwLockUpgradableReadGuard::upgrade(current_state) = (next_state_root, local_root);

            next_state_root
        })
    }
}

#[cfg(all(test, feature = "test-remote"))]
mod tests {
    use std::{
        ops::{Deref, DerefMut},
        str::FromStr,
    };

    use edr_eth::remote::PreEip1898BlockSpec;
    use edr_test_utils::env::get_alchemy_url;

    use super::*;

    const FORK_BLOCK: u64 = 16220843;

    struct TestForkState {
        fork_state: ForkState,
        // We need to keep it around as long as the fork state is alive
        _tempdir: tempfile::TempDir,
    }

    impl TestForkState {
        /// Constructs a fork state for testing purposes.
        ///
        /// # Panics
        ///
        /// If the function is called without a `tokio::Runtime` existing.
        async fn new() -> Self {
            let hash_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("seed")));

            let tempdir = tempfile::tempdir().expect("can create tempdir");

            let runtime = runtime::Handle::current();
            let rpc_client = RpcClient::new(&get_alchemy_url(), tempdir.path().to_path_buf(), None);

            let block = rpc_client
                .get_block_by_number(PreEip1898BlockSpec::Number(FORK_BLOCK))
                .await
                .expect("failed to retrieve block by number")
                .expect("block should exist");

            let fork_state = ForkState::new(
                runtime,
                Arc::new(rpc_client),
                hash_generator,
                FORK_BLOCK,
                block.state_root,
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

    #[tokio::test(flavor = "multi_thread")]
    async fn basic_success() {
        let fork_state = TestForkState::new().await;

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

    #[tokio::test(flavor = "multi_thread")]
    async fn remove_remote_account_success() {
        let mut fork_state = TestForkState::new().await;

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        fork_state.remove_account(dai_address).unwrap();

        assert_eq!(fork_state.basic(dai_address).unwrap(), None);
    }
}
