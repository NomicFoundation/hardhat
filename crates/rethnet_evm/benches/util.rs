use std::clone::Clone;

use criterion::{BatchSize, BenchmarkId, Criterion};
use rethnet_eth::{Address, Bytes, B256, U256};
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};
use revm::primitives::{AccountInfo, Bytecode, KECCAK_EMPTY};

#[derive(Default)]
struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    layered_checkpoints: Vec<B256>,
    layered_snapshots: Vec<B256>,
    hybrid: HybridState<RethnetLayer>,
    hybrid_checkpoints: Vec<B256>,
    hybrid_snapshots: Vec<B256>,
}

impl RethnetStates {
    fn fill(
        &mut self,
        number_of_accounts: u64,
        number_of_checkpoints: u64,
        number_of_snapshots: u64,
        number_of_storage_slots_per_account: u64,
    ) {
        let mut states_and_checkpoints_and_snapshots: [(
            &mut dyn SyncState<StateError>,
            &mut Vec<B256>,
            &mut Vec<B256>,
        ); 2] = [
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
        ]
    }
}

pub struct Permutations;

#[cfg(feature = "bench-once")]
impl Permutations {
    const NUM_SCALES: usize = 1;
    const CHECKPOINT_SCALES: [u64; 1] = [1];
    const ADDRESS_SCALES: [u64; 1] = [1];
    const STORAGE_SCALES: [u64; 1] = [1];
    const SNAPSHOT_SCALES: [u64; 1] = [1];
}

#[cfg(not(feature = "bench-once"))]
impl Permutations {
    const NUM_SCALES: usize = 4;

    const SNAPSHOT_SCALES: [u64; NUM_SCALES] = [1, 5, 10, 20];
    const MAX_SNAPSHOT_SCALE: u64 = SNAPSHOT_SCALES[NUM_SCALES - 1];

    const CHECKPOINT_SCALES: [u64; NUM_SCALES] = [
        MAX_SNAPSHOT_SCALE,
        MAX_SNAPSHOT_SCALE * 2,
        MAX_SNAPSHOT_SCALE * 4,
        MAX_SNAPSHOT_SCALE * 8,
    ];
    const MAX_CHECKPOINT_SCALE: u64 = CHECKPOINT_SCALES[NUM_SCALES - 1];

    const ADDRESS_SCALES: [u64; NUM_SCALES] = [
        MAX_CHECKPOINT_SCALE,
        MAX_CHECKPOINT_SCALE * 5,
        MAX_CHECKPOINT_SCALE * 25,
        MAX_CHECKPOINT_SCALE * 50,
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

    pub fn storage_scales() -> [u64; Self::NUM_SCALES] {
        Self::assert_scale_divisibility();
        Self::STORAGE_SCALES
    }
}

pub fn bench_sync_state_method<O, R, Prep>(
    c: &mut Criterion,
    method_name: &str,
    mut prep: Prep,
    mut method_invocation: R,
    storage_scales: &[u64],
    snapshot_scales: &[u64],
) where
    R: FnMut(Box<dyn SyncState<StateError>>, u64, &Vec<B256>, &Vec<B256>) -> O,
    Prep: FnMut(&mut dyn SyncState<StateError>, u64),
{
    let mut group = c.benchmark_group(method_name);
    for number_of_checkpoints in Permutations::checkpoint_scales().iter() {
        for number_of_accounts in Permutations::address_scales().iter() {
            for storage_slots_per_account in storage_scales.iter() {
                for number_of_snapshots in snapshot_scales.iter() {
                    let mut rethnet_states = RethnetStates::default();
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
                                        prep(&mut state, *number_of_accounts);
                                        state
                                    },
                                    |state| {
                                        method_invocation(
                                            state,
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
