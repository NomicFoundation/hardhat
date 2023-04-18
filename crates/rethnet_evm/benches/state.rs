use criterion::{criterion_group, criterion_main, BatchSize, Criterion};
use revm::{db::StateRef, primitives::AccountInfo};
use std::{clone::Clone, str::FromStr};

use rethnet_eth::Address;
use rethnet_evm::state::{
    HybridState, LayeredState, RethnetLayer, StateDebug, StateError, SyncState,
};

#[derive(Default)]
struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    hybrid: HybridState<RethnetLayer>,
}

impl RethnetStates {
    fn fill(&mut self, number_of_accounts: u64, number_of_layers_per_account: u64) {
        let mut states: [&mut dyn SyncState<StateError>; 2] = [&mut self.layered, &mut self.hybrid];
        for state in states.iter_mut() {
            for i in 1..=number_of_accounts {
                state
                    .insert_account(
                        Address::from_str(&format!("0x{:0>40x}", i)).unwrap(),
                        AccountInfo::default(),
                    )
                    .unwrap();
                for _ in 1..=number_of_layers_per_account {
                    state.checkpoint().unwrap();
                }
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
const LAYER_SCALES: [u64; 4] = [1, 2, 4, 8];

fn bench_insert_account(c: &mut Criterion) {
    for number_of_accounts in ADDRESS_SCALES.iter() {
        for layers_per_account in LAYER_SCALES.iter() {
            let mut rethnet_states = RethnetStates::default();
            rethnet_states.fill(*number_of_accounts, *layers_per_account);

            for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
                c.benchmark_group(format!(
                    "StateRef::insert_account() with {} accounts with {} layer(s) per account",
                    *number_of_accounts, layers_per_account,
                ))
                .bench_function(label, |b| {
                    b.iter_batched(
                        || state_factory(),
                        |mut state| {
                            state.insert_account(
                                Address::from_str(&format!("0x{:0>40x}", number_of_accounts + 1))
                                    .unwrap(),
                                AccountInfo::default(),
                            )
                        },
                        BatchSize::LargeInput,
                    );
                });
            }
        }
    }
}

fn bench_checkpoint(c: &mut Criterion) {
    for number_of_accounts in ADDRESS_SCALES.iter() {
        for layers_per_account in LAYER_SCALES.iter() {
            let mut rethnet_states = RethnetStates::default();
            rethnet_states.fill(*number_of_accounts, *layers_per_account);

            for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
                c.benchmark_group(format!(
                    "StateDebug::checkpoint() with {} accounts with {} layer(s) per account",
                    *number_of_accounts, layers_per_account,
                ))
                .bench_function(label, |b| {
                    b.iter_batched(
                        || state_factory(),
                        |mut state| state.checkpoint(),
                        BatchSize::LargeInput,
                    );
                });
            }
        }
    }
}

fn bench_basic(c: &mut Criterion) {
    for number_of_accounts in ADDRESS_SCALES.iter() {
        let layers_per_account = 1;

        let mut rethnet_states = RethnetStates::default();
        rethnet_states.fill(*number_of_accounts, layers_per_account);

        for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
            c.benchmark_group(format!(
                "StateRef::basic() with {} accounts with {} layer(s) per account",
                *number_of_accounts, layers_per_account,
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
                    BatchSize::LargeInput,
                )
            });
        }
    }
}

criterion_group! {
    name = benches;
    config = Criterion::default().significance_level(0.1).sample_size(10);
    targets = bench_insert_account, bench_checkpoint, bench_basic
}
criterion_main!(benches);
