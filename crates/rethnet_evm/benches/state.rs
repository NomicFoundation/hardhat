use std::{clone::Clone, str::FromStr};

use criterion::{criterion_group, criterion_main, BatchSize, BenchmarkId, Criterion};
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};

#[derive(Default)]
struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    hybrid: HybridState<RethnetLayer>,
}

impl RethnetStates {
    fn fill(&mut self, number_of_accounts: u64, number_of_accounts_per_checkpoint: u64) {
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
                    state
                        .set_account_storage_slot(
                            address,
                            U256::from(account_number),
                            U256::from(account_number),
                        )
                        .unwrap();
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
            ("LayeredState", Box::new(|| Box::new(self.layered.clone()))),
            ("HybridState", Box::new(|| Box::new(self.hybrid.clone()))),
        ]
    }
}

#[cfg(feature = "bench-once")]
mod config {
    pub const CHECKPOINT_SCALES: [u64; 1] = [1];
    pub const ADDRESS_SCALES: [u64; 1] = [1];
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
}

use config::*;

fn bench_sync_state_method<O, R>(c: &mut Criterion, method_name: &str, mut method_invocation: R)
where
    R: FnMut(Box<dyn SyncState<StateError>>, u64) -> O,
{
    let mut group = c.benchmark_group(method_name);
    for accounts_per_checkpoint in CHECKPOINT_SCALES.iter() {
        for number_of_accounts in ADDRESS_SCALES.iter() {
            let mut rethnet_states = RethnetStates::default();
            rethnet_states.fill(*number_of_accounts, *accounts_per_checkpoint);

            for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
                group.bench_with_input(
                    BenchmarkId::new(
                        format!(
                            "{},{} account(s) per checkpoint",
                            label, *accounts_per_checkpoint
                        ),
                        *number_of_accounts,
                    ),
                    number_of_accounts,
                    |b, number_of_accounts| {
                        b.iter_batched(
                            || state_factory(),
                            |state| method_invocation(state, *number_of_accounts),
                            BatchSize::SmallInput,
                        );
                    },
                );
            }
        }
    }
}

fn bench_insert_account_already_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::insert_account(), account already exists",
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.insert_account(address, AccountInfo::default());
            debug_assert!(result.is_ok())
            )
        },
    );
}

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory::checkpoint()",
        |mut state, _number_of_accounts| {
            let result = state.checkpoint();
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_basic(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::basic()", |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.basic(Address::from_str(&format!("0x{:0>40x}", i)).unwrap());
            debug_assert!(result.is_ok());
        }
    });
}

fn bench_code_by_hash(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::code_by_hash", |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.code_by_hash(
                Bytecode::new_raw(Bytes::copy_from_slice(
                    Address::from_low_u64_ne(i).as_bytes(),
                ))
                .hash(),
            );
            debug_assert!(result.is_ok());
        }
    });
}

fn bench_storage(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::storage", |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.storage(Address::from_low_u64_ne(i), U256::from(i));
            debug_assert!(result.is_ok());
        }
    });
}

criterion_group!(
    benches,
    bench_insert_account_already_exists,
    bench_checkpoint,
    bench_basic,
    bench_code_by_hash,
    bench_storage,
);
criterion_main!(benches);
