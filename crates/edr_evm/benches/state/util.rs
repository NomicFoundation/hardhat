use std::clone::Clone;
#[cfg(all(test, feature = "test-remote"))]
use std::sync::Arc;

use criterion::{BatchSize, BenchmarkId, Criterion};
#[cfg(all(test, feature = "test-remote"))]
use edr_eth::remote::PreEip1898BlockSpec;
use edr_eth::{Address, Bytes, U256};
#[cfg(all(test, feature = "test-remote"))]
use edr_evm::state::ForkState;
use edr_evm::{
    alloy_primitives::U160,
    state::{StateError, SyncState, TrieState},
};
use revm::primitives::{AccountInfo, Bytecode, KECCAK_EMPTY};
use tempfile::TempDir;
#[cfg(all(test, feature = "test-remote"))]
use tokio::runtime::Builder;

#[allow(dead_code)]
struct TestState<'t> {
    pub label: &'static str,
    pub state_factory: Box<dyn Fn() -> Box<dyn SyncState<StateError>> + 't>,
}

pub struct EdrStates {
    trie_state: TrieState,
    #[cfg(all(test, feature = "test-remote"))]
    _runtime: tokio::runtime::Runtime,
    #[cfg(all(test, feature = "test-remote"))]
    pub fork: ForkState,
    // We have to keep the cache dir around to prevent it from being deleted
    _cache_dir: TempDir,
}

impl EdrStates {
    pub fn new(#[cfg(all(test, feature = "test-remote"))] fork_block_number: u64) -> Self {
        let cache_dir = TempDir::new().expect("can create temp dir");

        #[cfg(all(test, feature = "test-remote"))]
        let runtime = Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .unwrap();

        #[cfg(all(test, feature = "test-remote"))]
        let fork = {
            use edr_eth::remote::RpcClient;
            use edr_evm::RandomHashGenerator;
            use parking_lot::Mutex;

            let rpc_client = Arc::new(RpcClient::new(
                &std::env::var_os("ALCHEMY_URL")
                    .expect("ALCHEMY_URL environment variable not defined")
                    .into_string()
                    .unwrap(),
                cache_dir.path().to_path_buf(),
            ));

            let block = runtime
                .block_on(
                    rpc_client.get_block_by_number(PreEip1898BlockSpec::Number(fork_block_number)),
                )
                .expect("failed to retrieve block by number")
                .expect("block should exist");

            ForkState::new(
                runtime.handle().clone(),
                rpc_client,
                Arc::new(Mutex::new(RandomHashGenerator::with_seed(
                    edr_defaults::STATE_ROOT_HASH_SEED,
                ))),
                fork_block_number,
                block.state_root,
            )
        };

        Self {
            trie_state: TrieState::default(),
            #[cfg(all(test, feature = "test-remote"))]
            _runtime: runtime,
            #[cfg(all(test, feature = "test-remote"))]
            fork,
            _cache_dir: cache_dir,
        }
    }

    pub fn fill(&mut self, number_of_accounts: u64, number_of_storage_slots_per_account: u64) {
        let mut states: Vec<&mut dyn SyncState<StateError>> = vec![
            &mut self.trie_state,
            #[cfg(all(test, feature = "test-remote"))]
            &mut self.fork,
        ];

        for state in states.iter_mut() {
            for account_number in 1..=number_of_accounts {
                let address = Address::from(U160::from(account_number));
                let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_slice()));
                let code_hash = code.hash_slow();

                state
                    .insert_account(
                        address,
                        AccountInfo::new(
                            U256::from(account_number),
                            account_number,
                            code_hash,
                            code,
                        ),
                    )
                    .unwrap();

                for storage_slot in 0..number_of_storage_slots_per_account {
                    state
                        .set_account_storage_slot(
                            address,
                            U256::from(storage_slot),
                            U256::from(account_number),
                        )
                        .unwrap();
                }
            }
        }
    }

    /// Returns a set of factories, each member of which produces a clone of one
    /// of the state objects in this struct.
    #[allow(dead_code)]
    fn make_state_refs(&self) -> Vec<TestState<'_>> {
        vec![
            TestState {
                label: "Trie",
                state_factory: Box::new(|| Box::new(self.trie_state.clone())),
            },
            #[cfg(all(test, feature = "test-remote"))]
            TestState {
                label: "Fork",
                state_factory: Box::new(|| Box::new(self.fork.clone())),
            },
        ]
    }
}

#[cfg(feature = "bench-once")]
pub mod permutations {
    pub const ACCOUNT_SCALES: [u64; 1] = [1];

    #[allow(dead_code)]
    pub const STORAGE_SCALES: [u64; 1] = [1];
}

#[cfg(not(feature = "bench-once"))]
pub mod permutations {
    pub const ACCOUNT_SCALES: [u64; 4] = [10, 100, 1000, 10000];

    #[allow(dead_code)]
    pub const STORAGE_SCALES: [u64; 4] = [1, 10, 100, 1000];
}

#[allow(dead_code)]
pub fn bench_sync_state_method<O, R, StatePrep>(
    c: &mut Criterion,
    method_name: &str,
    mut prep_state: StatePrep,
    method_invocation: R,
    storage_scales: &[u64],
) where
    R: FnMut(&mut Box<dyn SyncState<StateError>>, u64) -> O,
    StatePrep: FnMut(&mut dyn SyncState<StateError>, u64),
{
    let mut group = c.benchmark_group(method_name);
    let method_invocation = std::cell::RefCell::<R>::new(method_invocation);
    for number_of_accounts in permutations::ACCOUNT_SCALES {
        for storage_slots_per_account in storage_scales.iter() {
            let mut edr_states = EdrStates::new(
                #[cfg(all(test, feature = "test-remote"))]
                17274563,
            );
            edr_states.fill(number_of_accounts, *storage_slots_per_account);

            for TestState {
                label,
                state_factory,
            } in edr_states.make_state_refs()
            {
                group.bench_with_input(
                    BenchmarkId::new(
                        format!("{label} with {storage_slots_per_account} slots per account"),
                        number_of_accounts,
                    ),
                    &number_of_accounts,
                    |b, number_of_accounts| {
                        b.iter_batched(
                            || {
                                let mut state = state_factory();
                                // in order to prime any caches that the
                                // state object may be employing, run the
                                // method invocation here in the setup
                                // routine. note that we have to run prep
                                // before THIS invocation, and then AGAIN
                                // after it, for the "real" invocation.
                                prep_state(&mut state, *number_of_accounts);
                                method_invocation.borrow_mut()(&mut state, *number_of_accounts);
                                prep_state(&mut state, *number_of_accounts);
                                state
                            },
                            |mut state| {
                                method_invocation.borrow_mut()(&mut state, *number_of_accounts)
                            },
                            BatchSize::SmallInput,
                        );
                    },
                );
            }
        }
    }
}

#[allow(dead_code)]
pub fn state_prep_no_op(_state: &mut dyn SyncState<StateError>, _number_of_accounts: u64) {}

#[allow(dead_code)]
pub fn account_has_code(state: &dyn SyncState<StateError>, address: &Address) -> bool {
    let account_info = state
        .basic(*address)
        .expect("basic should succeed")
        .expect("account should exist");
    account_info.code_hash != KECCAK_EMPTY
        && !state
            .code_by_hash(account_info.code_hash)
            .expect("code_by_hash should succeed")
            .bytecode
            .is_empty()
}
