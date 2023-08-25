use std::clone::Clone;
#[cfg(all(test, feature = "test-remote"))]
use std::sync::Arc;

use criterion::{BatchSize, BenchmarkId, Criterion};
#[cfg(all(test, feature = "test-remote"))]
use parking_lot::Mutex;
use tempfile::TempDir;
#[cfg(all(test, feature = "test-remote"))]
use tokio::runtime::Builder;

use rethnet_eth::{Address, Bytes, B256, U256};
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};
#[cfg(all(test, feature = "test-remote"))]
use rethnet_evm::{state::ForkState, HashMap, RandomHashGenerator};
use revm::primitives::{AccountInfo, Bytecode, KECCAK_EMPTY};

#[allow(dead_code)]
struct TestState<'t> {
    pub label: &'static str,
    pub state_factory: Box<dyn Fn() -> Box<dyn SyncState<StateError>> + 't>,
    pub checkpoints: &'t Vec<B256>,
    pub snapshots: &'t Vec<B256>,
}

pub struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    layered_checkpoints: Vec<B256>,
    layered_snapshots: Vec<B256>,
    hybrid: HybridState<RethnetLayer>,
    hybrid_checkpoints: Vec<B256>,
    hybrid_snapshots: Vec<B256>,
    #[cfg(all(test, feature = "test-remote"))]
    pub fork: ForkState,
    #[allow(dead_code)]
    fork_checkpoints: Vec<B256>,
    #[allow(dead_code)]
    fork_snapshots: Vec<B256>,
    // We have to keep the cache dir around to prevent it from being deleted
    _cache_dir: TempDir,
}

impl RethnetStates {
    pub fn new(#[cfg(all(test, feature = "test-remote"))] fork_block_number: U256) -> Self {
        let cache_dir = TempDir::new().expect("can create temp dir");
        Self {
            layered: LayeredState::<RethnetLayer>::default(),
            layered_checkpoints: Vec::default(),
            layered_snapshots: Vec::default(),
            hybrid: HybridState::<RethnetLayer>::default(),
            hybrid_checkpoints: Vec::default(),
            hybrid_snapshots: Vec::default(),
            #[cfg(all(test, feature = "test-remote"))]
            fork: ForkState::new(
                Arc::new(
                    Builder::new_multi_thread()
                        .enable_io()
                        .enable_time()
                        .build()
                        .unwrap(),
                ),
                Arc::new(Mutex::new(RandomHashGenerator::with_seed("seed"))),
                &std::env::var_os("ALCHEMY_URL")
                    .expect("ALCHEMY_URL environment variable not defined")
                    .into_string()
                    .unwrap(),
                cache_dir.path().to_path_buf(),
                fork_block_number,
                HashMap::default(),
            ),
            fork_checkpoints: Vec::default(),
            fork_snapshots: Vec::default(),
            _cache_dir: cache_dir,
        }
    }

    pub fn fill(
        &mut self,
        number_of_accounts: u64,
        number_of_checkpoints: u64,
        number_of_snapshots: u64,
        number_of_storage_slots_per_account: u64,
    ) {
        type StateCheckpointsAndSnapshots<'a> = (
            &'a mut dyn SyncState<StateError>,
            &'a mut Vec<B256>,
            &'a mut Vec<B256>,
        );

        let mut states_and_checkpoints_and_snapshots: Vec<StateCheckpointsAndSnapshots<'_>> = vec![
            (
                &mut self.layered,
                &mut self.layered_checkpoints,
                &mut self.layered_snapshots,
            ),
            (
                &mut self.hybrid,
                &mut self.hybrid_checkpoints,
                &mut self.hybrid_snapshots,
            ),
            #[cfg(all(test, feature = "test-remote"))]
            (
                &mut self.fork,
                &mut self.fork_checkpoints,
                &mut self.fork_snapshots,
            ),
        ];
        for (state, checkpoints, snapshots) in states_and_checkpoints_and_snapshots.iter_mut() {
            let number_of_checkpoints_per_snapshot = number_of_checkpoints / number_of_snapshots;
            for snapshot_number in 0..number_of_snapshots {
                for checkpoint_number in 0..number_of_checkpoints_per_snapshot {
                    let checkpoint_number =
                        snapshot_number * number_of_checkpoints_per_snapshot + checkpoint_number;
                    let number_of_accounts_per_checkpoint =
                        number_of_accounts / number_of_checkpoints;
                    for account_number in 1..=number_of_accounts_per_checkpoint {
                        let account_number = (checkpoint_number
                            * number_of_accounts_per_checkpoint)
                            + account_number;
                        let address = Address::from_low_u64_ne(account_number);
                        let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_bytes()));
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
                    state.checkpoint().unwrap();
                    checkpoints.push(state.state_root().unwrap());
                }
                snapshots.push(state.make_snapshot());
            }
        }
    }

    /// Returns a set of factories, each member of which produces a clone of one of the state objects in this struct.
    #[allow(dead_code)]
    fn make_state_refs(&self) -> Vec<TestState<'_>> {
        vec![
            TestState {
                label: "Layered",
                state_factory: Box::new(|| Box::new(self.layered.clone())),
                checkpoints: &self.layered_checkpoints,
                snapshots: &self.layered_snapshots,
            },
            TestState {
                label: "Hybrid",
                state_factory: Box::new(|| Box::new(self.hybrid.clone())),
                checkpoints: &self.hybrid_checkpoints,
                snapshots: &self.hybrid_snapshots,
            },
            #[cfg(all(test, feature = "test-remote"))]
            TestState {
                label: "Fork",
                state_factory: Box::new(|| Box::new(self.fork.clone())),
                checkpoints: &self.fork_checkpoints,
                snapshots: &self.fork_snapshots,
            },
        ]
    }
}

pub struct Permutations;

#[cfg(feature = "bench-once")]
impl Permutations {
    const NUM_SCALES: usize = 1;
    const CHECKPOINT_SCALES: [u64; 1] = [1];
    const ADDRESS_SCALES: [u64; 1] = [1];
    #[allow(dead_code)]
    const STORAGE_SCALES: [u64; 1] = [1];
    const SNAPSHOT_SCALES: [u64; 1] = [1];
}

#[cfg(not(feature = "bench-once"))]
impl Permutations {
    const NUM_SCALES: usize = 4;

    const SNAPSHOT_SCALES: [u64; Self::NUM_SCALES] = [1, 5, 10, 20];
    const MAX_SNAPSHOT_SCALE: u64 = Self::SNAPSHOT_SCALES[Self::NUM_SCALES - 1];

    const CHECKPOINT_SCALES: [u64; Self::NUM_SCALES] = [
        Self::MAX_SNAPSHOT_SCALE,
        Self::MAX_SNAPSHOT_SCALE * 2,
        Self::MAX_SNAPSHOT_SCALE * 4,
        Self::MAX_SNAPSHOT_SCALE * 8,
    ];
    const MAX_CHECKPOINT_SCALE: u64 = Self::CHECKPOINT_SCALES[Self::NUM_SCALES - 1];

    const ADDRESS_SCALES: [u64; Self::NUM_SCALES] = [
        Self::MAX_CHECKPOINT_SCALE,
        Self::MAX_CHECKPOINT_SCALE * 5,
        Self::MAX_CHECKPOINT_SCALE * 25,
        Self::MAX_CHECKPOINT_SCALE * 50,
    ];

    const STORAGE_SCALES: [u64; 4] = [1, 10, 100, 1000];
}

impl Permutations {
    fn assert_scale_divisibility() {
        // CHECKPOINT_SCALES needs to be divisble (without remainder) by every scale of
        // SNAPSHOT_SCALES or the benchmark will end up having fluctuations in number
        // of accounts, etc. due to rounding. The same applies for ADDRESS_SCALES
        // needing to be divisible (without remainder) by every scale of
        // CHECKPOINT_SCALES.

        for address_scale in Self::ADDRESS_SCALES {
            for checkpoint_scale in Self::CHECKPOINT_SCALES {
                assert!(address_scale % checkpoint_scale == 0, "all address scales must be evenly divisible by all checkpoint scales, but address scale {address_scale} is not evenly divisible by checkpoint scale {checkpoint_scale}");
            }
        }
        for checkpoint_scale in Self::CHECKPOINT_SCALES {
            for snapshot_scale in Self::SNAPSHOT_SCALES {
                assert!(checkpoint_scale % snapshot_scale == 0, "all checkpoint scales must be evenly divisible by all snapshots scales, but checkpoint scale {checkpoint_scale} is not evenly divisible by snapshot scale {snapshot_scale}");
            }
        }
    }

    pub fn address_scales() -> [u64; Self::NUM_SCALES] {
        Self::assert_scale_divisibility();
        Self::ADDRESS_SCALES
    }

    pub fn checkpoint_scales() -> [u64; Self::NUM_SCALES] {
        Self::assert_scale_divisibility();
        Self::CHECKPOINT_SCALES
    }

    #[allow(dead_code)]
    pub fn snapshot_scales() -> [u64; Self::NUM_SCALES] {
        Self::assert_scale_divisibility();
        Self::SNAPSHOT_SCALES
    }

    #[allow(dead_code)]
    pub fn storage_scales() -> [u64; Self::NUM_SCALES] {
        Self::assert_scale_divisibility();
        Self::STORAGE_SCALES
    }
}

#[allow(dead_code)]
pub fn bench_sync_state_method<O, R, StatePrep>(
    c: &mut Criterion,
    method_name: &str,
    mut prep_state: StatePrep,
    method_invocation: R,
    storage_scales: &[u64],
    snapshot_scales: &[u64],
) where
    R: FnMut(&mut Box<dyn SyncState<StateError>>, u64, &Vec<B256>, &Vec<B256>) -> O,
    StatePrep: FnMut(&mut dyn SyncState<StateError>, u64),
{
    let mut group = c.benchmark_group(method_name);
    let method_invocation = std::cell::RefCell::<R>::new(method_invocation);
    for number_of_checkpoints in Permutations::checkpoint_scales().iter() {
        for number_of_accounts in Permutations::address_scales().iter() {
            for storage_slots_per_account in storage_scales.iter() {
                for number_of_snapshots in snapshot_scales.iter() {
                    let mut rethnet_states = RethnetStates::new(
                        #[cfg(all(test, feature = "test-remote"))]
                        U256::from(17274563),
                    );
                    rethnet_states.fill(
                        *number_of_accounts,
                        *number_of_checkpoints,
                        *number_of_snapshots,
                        *storage_slots_per_account,
                    );

                    for TestState {
                        label,
                        state_factory,
                        checkpoints,
                        snapshots,
                    } in rethnet_states.make_state_refs()
                    {
                        group.bench_with_input(
                            BenchmarkId::new(
                                format!(
                                    "{},{} chkpts,{} slots per acct,{} snapshots",
                                    label,
                                    number_of_checkpoints,
                                    *storage_slots_per_account,
                                    *number_of_snapshots
                                ),
                                *number_of_accounts,
                            ),
                            number_of_accounts,
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
                                        method_invocation.borrow_mut()(
                                            &mut state,
                                            *number_of_accounts,
                                            checkpoints,
                                            snapshots,
                                        );
                                        prep_state(&mut state, *number_of_accounts);
                                        state
                                    },
                                    |mut state| {
                                        method_invocation.borrow_mut()(
                                            &mut state,
                                            *number_of_accounts,
                                            checkpoints,
                                            snapshots,
                                        )
                                    },
                                    BatchSize::SmallInput,
                                );
                            },
                        );
                    }
                }
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
