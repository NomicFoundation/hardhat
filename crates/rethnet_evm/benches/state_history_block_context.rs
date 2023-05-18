use criterion::{criterion_group, criterion_main, Criterion};
#[cfg(all(test, feature = "test-remote"))]
use criterion::{BatchSize, BenchmarkId};

#[cfg(all(test, feature = "test-remote"))]
use rethnet_eth::U256;

#[cfg(all(test, feature = "test-remote"))]
mod util;
#[cfg(all(test, feature = "test-remote"))]
use util::{RethnetStates, ADDRESS_SCALES, CHECKPOINT_SCALES, SNAPSHOT_SCALES};

#[cfg(all(test, feature = "test-remote"))]
fn bench_set_block_context_to_block_number(
    c: &mut Criterion,
    group_name: &str,
    fork_block_number: U256,
    context_block_number: U256,
) {
    let mut group = c.benchmark_group(group_name);
    for number_of_checkpoints in CHECKPOINT_SCALES.iter() {
        for number_of_accounts in ADDRESS_SCALES.iter() {
            for number_of_snapshots in SNAPSHOT_SCALES.iter() {
                let mut rethnet_states = RethnetStates::new(fork_block_number);
                rethnet_states.fill(
                    *number_of_accounts,
                    *number_of_checkpoints,
                    *number_of_snapshots,
                    0,
                );
                group.bench_with_input(
                    BenchmarkId::new(
                        format!(
                            "Fork,{} chkpts,{} snapshots",
                            *number_of_checkpoints, *number_of_snapshots
                        ),
                        *number_of_accounts,
                    ),
                    number_of_accounts,
                    |b, _| {
                        use rethnet_evm::state::{StateDebug, StateHistory};
                        b.iter_batched(
                            || rethnet_states.fork.clone(),
                            |mut state| {
                                state.set_block_context(
                                    &rethnet_states.fork.state_root().unwrap(),
                                    Some(context_block_number),
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

#[cfg(all(test, feature = "test-remote"))]
fn bench_set_block_context_to_number_before_fork_block(c: &mut Criterion) {
    let fork_block_number = U256::from(17274563);
    bench_set_block_context_to_block_number(
        c,
        "StateHistory:set_block,num prior",
        fork_block_number,
        fork_block_number - U256::from(1),
    );
}

#[cfg(all(test, feature = "test-remote"))]
fn bench_set_block_context_to_number_after_fork_block(c: &mut Criterion) {
    let fork_block_number = U256::from(17274563);
    bench_set_block_context_to_block_number(
        c,
        "StateHistory:set_block,num later",
        fork_block_number,
        fork_block_number + U256::from(1),
    );
}

#[cfg(all(test, not(feature = "test-remote")))]
fn benchmark_nothing(_: &mut Criterion) {}

#[cfg(all(test, feature = "test-remote"))]
criterion_group!(
    state_history_block_context_benches,
    bench_set_block_context_to_number_before_fork_block,
    bench_set_block_context_to_number_after_fork_block,
);

#[cfg(all(test, not(feature = "test-remote")))]
criterion_group!(state_history_block_context_benches, benchmark_nothing);

criterion_main!(state_history_block_context_benches);
