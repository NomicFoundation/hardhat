use std::clone::Clone;

use criterion::{BatchSize, BenchmarkId, Criterion};
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};
use revm::primitives::{AccountInfo, Bytecode, KECCAK_EMPTY};

#[derive(Default)]
struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    hybrid: HybridState<RethnetLayer>,
}

impl RethnetStates {
    fn fill(
        &mut self,
        number_of_accounts: u64,
        number_of_accounts_per_checkpoint: u64,
        number_of_storage_slots_per_account: u64,
    ) {
        let mut states: [&mut dyn SyncState<StateError>; 2] = [&mut self.layered, &mut self.hybrid];
        for state in states.iter_mut() {
            let number_of_checkpoints = number_of_accounts / number_of_accounts_per_checkpoint;
            for checkpoint_number in 0..number_of_checkpoints {
                for account_number in 1..=number_of_accounts_per_checkpoint {
                    let account_number =
                        (checkpoint_number * number_of_accounts_per_checkpoint) + account_number;
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
            }
        }
    }

    /// Returns a set of factories, each member of which produces a clone of one of the state objects in this struct.
    fn make_clone_factories(
        &self,
    ) -> Vec<(
        &'static str, // label of the type of state produced by this factory
        Box<dyn Fn() -> Box<dyn SyncState<StateError>> + '_>,
    )> {
        vec![
            ("Layered", Box::new(|| Box::new(self.layered.clone()))),
            ("Hybrid", Box::new(|| Box::new(self.hybrid.clone()))),
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

use config::*;
pub use config::{SNAPSHOT_SCALES, STORAGE_SCALES};

pub fn bench_sync_state_method<O, R, Prep>(
    c: &mut Criterion,
    method_name: &str,
    mut prep: Prep,
    mut method_invocation: R,
    storage_scales: &[u64],
    snapshot_scales: &[u64],
) where
    R: FnMut(Box<dyn SyncState<StateError>>, u64) -> O,
    Prep: FnMut(&mut dyn SyncState<StateError>, u64, u64),
{
    let mut group = c.benchmark_group(method_name);
    for accounts_per_checkpoint in CHECKPOINT_SCALES.iter() {
        for number_of_accounts in ADDRESS_SCALES.iter() {
            for storage_slots_per_account in storage_scales.iter() {
                for number_of_snapshots in snapshot_scales.iter() {
                    let mut rethnet_states = RethnetStates::default();
                    rethnet_states.fill(
                        *number_of_accounts,
                        *accounts_per_checkpoint,
                        *storage_slots_per_account,
                    );

                    for (label, state_factory) in rethnet_states.make_clone_factories().into_iter()
                    {
                        group.bench_with_input(
                            BenchmarkId::new(
                                format!(
                                    "{},{} accts per chkpt,{} slots per acct,{} snapshots",
                                    label,
                                    *accounts_per_checkpoint,
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
                                        prep(&mut state, *number_of_accounts, *number_of_snapshots);
                                        state
                                    },
                                    |state| method_invocation(state, *number_of_accounts),
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

pub fn prep_no_op(_s: &mut dyn SyncState<StateError>, _i: u64, _j: u64) {}

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
