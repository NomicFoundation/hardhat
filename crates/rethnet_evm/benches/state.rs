use criterion::{criterion_group, criterion_main, BatchSize, BenchmarkId, Criterion};
use revm::{db::StateRef, primitives::AccountInfo};
use std::{clone::Clone, str::FromStr};

use rethnet_eth::Address;
use rethnet_evm::state::{HybridState, LayeredState, RethnetLayer, StateError, SyncState};

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
            for _ in 0..=number_of_checkpoints {
                for i in 1..=number_of_accounts {
                    state
                        .insert_account(
                            Address::from_str(&format!("0x{:0>40x}", i)).unwrap(),
                            AccountInfo::default(),
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

const ADDRESS_SCALES: [u64; 4] = [100, 500, 1000, 2000];
const CHECKPOINT_SCALES: [u64; 4] = [1, 2, 4, 8];

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

fn bench_insert_account(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::insert_account()",
        |mut state, number_of_accounts| {
            state.insert_account(
                Address::from_str(&format!("0x{:0>40x}", number_of_accounts + 1)).unwrap(),
                AccountInfo::default(),
            )
        },
    );
}

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory::checkpoint()",
        |mut state, _number_of_accounts| state.checkpoint(),
    );
}

fn bench_basic(c: &mut Criterion) {
    for number_of_accounts in ADDRESS_SCALES.iter() {
        let accounts_per_checkpoint = 1;

        let mut rethnet_states = RethnetStates::default();
        rethnet_states.fill(*number_of_accounts, accounts_per_checkpoint);

        for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
            c.benchmark_group(format!(
                "SyncState::basic() with {} accounts and with {} accounts(s) per checkpoint",
                *number_of_accounts, accounts_per_checkpoint,
            ))
            .bench_function(label, |b| {
                b.iter_batched(
                    || state_factory(),
                    |state| {
                        for i in *number_of_accounts..=1 {
                            state
                                .basic(Address::from_str(&format!("0x{:0>40x}", i)).unwrap())
                                .unwrap();
                        }
                    },
                    BatchSize::SmallInput,
                )
            });
        }
    }
}

criterion_group!(benches, bench_insert_account, bench_checkpoint, bench_basic);
criterion_main!(benches);
