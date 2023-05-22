use std::clone::Clone;
#[cfg(all(test, feature = "test-remote"))]
use std::sync::Arc;

use criterion::{BatchSize, BenchmarkId, Criterion};
#[cfg(all(test, feature = "test-remote"))]
use parking_lot::Mutex;
#[cfg(all(test, feature = "test-remote"))]
use tokio::runtime::Builder;

use rethnet_eth::{Address, Bytes, B256, U256};
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};
#[cfg(all(test, feature = "test-remote"))]
use rethnet_evm::{state::ForkState, HashMap, RandomHashGenerator};
use revm::primitives::{AccountInfo, Bytecode, KECCAK_EMPTY};

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
}

impl RethnetStates {
    #[allow(unused_variables)]
    pub fn new(fork_block_number: U256) -> Self {
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
                fork_block_number,
                HashMap::default(),
            ),
            fork_checkpoints: Vec::default(),
            fork_snapshots: Vec::default(),
        }
    }

    pub fn fill(
        &mut self,
        number_of_accounts: u64,
        number_of_checkpoints: u64,
        number_of_snapshots: u64,
        number_of_storage_slots_per_account: u64,
    ) {
        let mut states_and_checkpoints_and_snapshots: Vec<(
            &mut dyn SyncState<StateError>,
            &mut Vec<B256>,
            &mut Vec<B256>,
        )> = vec![
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
                        state
                            .insert_account(
                                address,
                                AccountInfo::new(
                                    U256::from(account_number),
                                    account_number,
                                    Bytecode::new_raw(Bytes::copy_from_slice(address.as_bytes())),
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
    fn make_state_refs(
        &self,
    ) -> Vec<(
        &'static str, // label of the type of state produced by this factory
        Box<dyn Fn() -> Box<dyn SyncState<StateError>> + '_>,
        &Vec<B256>,
        &Vec<B256>,
    )> {
        vec![
            (
                "Layered",
                Box::new(|| Box::new(self.layered.clone())),
                &self.layered_checkpoints,
                &self.layered_snapshots,
            ),
            (
                "Hybrid",
                Box::new(|| Box::new(self.hybrid.clone())),
                &self.hybrid_checkpoints,
                &self.hybrid_snapshots,
            ),
            #[cfg(all(test, feature = "test-remote"))]
            (
                "Fork",
                Box::new(|| Box::new(self.fork.clone())),
                &self.fork_checkpoints,
                &self.fork_snapshots,
            ),
        ]
    }
}

#[cfg(feature = "bench-once")]
#[allow(dead_code)]
mod config {
    pub const CHECKPOINT_SCALES: [u64; 1] = [1];
    pub const ADDRESS_SCALES: [u64; 1] = [1];
    pub const STORAGE_SCALES: [u64; 1] = [1];
    pub const SNAPSHOT_SCALES: [u64; 1] = [1];
}

#[cfg(not(feature = "bench-once"))]
mod config {
    const NUM_SCALES: usize = 4;
    pub const CHECKPOINT_SCALES: [u64; NUM_SCALES] = [1, 5, 10, 20];

    const MAX_CHECKPOINT_SCALE: u64 = CHECKPOINT_SCALES[NUM_SCALES - 1];
    pub const ADDRESS_SCALES: [u64; NUM_SCALES] = [
        MAX_CHECKPOINT_SCALE * 5,
        MAX_CHECKPOINT_SCALE * 25,
        MAX_CHECKPOINT_SCALE * 50,
        MAX_CHECKPOINT_SCALE * 100,
    ];

    pub const STORAGE_SCALES: [u64; 4] = [1, 10, 100, 1000];

    pub const SNAPSHOT_SCALES: [u64; 4] = [1, 10, 100, 1000];
}

pub use config::{ADDRESS_SCALES, CHECKPOINT_SCALES, SNAPSHOT_SCALES, STORAGE_SCALES};

#[allow(dead_code)]
pub fn bench_sync_state_method<O, R, Prep>(
    c: &mut Criterion,
    method_name: &str,
    mut prep: Prep,
    method_invocation: R,
    storage_scales: &[u64],
    snapshot_scales: &[u64],
) where
    R: FnMut(&mut Box<dyn SyncState<StateError>>, u64, &Vec<B256>, &Vec<B256>) -> O,
    Prep: FnMut(&mut dyn SyncState<StateError>, u64),
{
    let mut group = c.benchmark_group(method_name);
    let method_invocation = std::cell::RefCell::<R>::new(method_invocation);
    for number_of_checkpoints in CHECKPOINT_SCALES.iter() {
        for number_of_accounts in ADDRESS_SCALES.iter() {
            for storage_slots_per_account in storage_scales.iter() {
                for number_of_snapshots in snapshot_scales.iter() {
                    let mut rethnet_states = RethnetStates::new(U256::from(17274563));
                    rethnet_states.fill(
                        *number_of_accounts,
                        *number_of_checkpoints,
                        *number_of_snapshots,
                        *storage_slots_per_account,
                    );

                    for (label, state_factory, checkpoints, snapshots) in
                        rethnet_states.make_state_refs().into_iter()
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
                                        prep(&mut state, *number_of_accounts);
                                        method_invocation.borrow_mut()(
                                            &mut state,
                                            *number_of_accounts,
                                            checkpoints,
                                            snapshots,
                                        );
                                        prep(&mut state, *number_of_accounts);
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
pub fn prep_no_op(_state: &mut dyn SyncState<StateError>, _number_of_accounts: u64) {}

#[allow(dead_code)]
pub fn account_has_code(state: &dyn SyncState<StateError>, address: &Address) -> bool {
    let account_info = state
        .basic(*address)
        .expect("basic should succeed")
        .expect("account should exist");
    account_info.code_hash != KECCAK_EMPTY
        && state
            .code_by_hash(account_info.code_hash)
            .expect("code_by_hash should succeed")
            .bytecode
            .len()
            > 0
}
