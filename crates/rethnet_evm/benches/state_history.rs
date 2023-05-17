use criterion::{criterion_group, criterion_main, BatchSize, BenchmarkId, Criterion};

use rethnet_eth::{B256, U256};

mod util;
use util::{
    bench_sync_state_method, prep_no_op, RethnetStates, ADDRESS_SCALES, CHECKPOINT_SCALES,
    SNAPSHOT_SCALES, STORAGE_SCALES,
};

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:checkpoint()",
        prep_no_op,
        |mut state, _number_of_accounts, _, _| {
            let result = state.checkpoint();
            debug_assert!(result.is_ok());
        },
        &STORAGE_SCALES,
        &[1],
    );
}

fn bench_make_snapshot(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:make_snapshot",
        prep_no_op,
        |mut state, _number_of_accounts, _, _| {
            state.make_snapshot();
        },
        &[0],
        &[1],
    );
}

fn bench_remove_snapshot(c: &mut Criterion) {
    let snapshot: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:remove_snapshot",
        |state, _| {
            snapshot
                .borrow_mut()
                .assign_from_slice(state.make_snapshot().as_bytes());
        },
        |mut state, _number_of_accounts, _, _| {
            state.remove_snapshot(&snapshot.borrow());
        },
        &[0],
        &[1],
    );
}

fn bench_set_block_context_to_latest_snapshot(c: &mut Criterion) {
    let snapshot: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:set_block,latest snapshot",
        |state, _| {
            snapshot
                .borrow_mut()
                .assign_from_slice(state.make_snapshot().as_bytes());
        },
        |mut state, _number_of_accounts, _, _| {
            let result = state.set_block_context(&snapshot.borrow(), None);
            debug_assert!(result.is_ok());
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}
fn bench_set_block_context_to_earliest_layer(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:set_block,earliest layer",
        prep_no_op,
        |mut state, _number_of_accounts, checkpoints, _| {
            state.set_block_context(&checkpoints[0], None).unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_set_block_context_to_latest_layer(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:set_block,latest layer",
        prep_no_op,
        |mut state, _number_of_accounts, checkpoints, _| {
            state
                .set_block_context(&checkpoints[checkpoints.len() - 1], None)
                .unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_set_block_context_to_middle_layer(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:set_block,middle layer",
        prep_no_op,
        |mut state, _number_of_accounts, checkpoints, _| {
            state
                .set_block_context(&checkpoints[checkpoints.len() / 2], None)
                .unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

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

fn bench_set_block_context_to_number_before_fork_block(c: &mut Criterion) {
    let fork_block_number = U256::from(17274563);
    bench_set_block_context_to_block_number(
        c,
        "StateHistory:set_block,num prior",
        fork_block_number,
        fork_block_number - U256::from(1),
    );
}

fn bench_set_block_context_to_number_after_fork_block(c: &mut Criterion) {
    let fork_block_number = U256::from(17274563);
    bench_set_block_context_to_block_number(
        c,
        "StateHistory:set_block,num later",
        fork_block_number,
        fork_block_number + U256::from(1),
    );
}

fn bench_revert(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:revert",
        |state, _| {
            state.checkpoint().unwrap();
        },
        |mut state, _number_of_accounts, _, _| {
            let result = state.revert();
            debug_assert!(result.is_ok());
        },
        &STORAGE_SCALES,
        &[1],
    );
}

criterion_group!(
    state_history_benches,
    bench_checkpoint,
    bench_make_snapshot,
    bench_remove_snapshot,
    bench_revert,
    bench_set_block_context_to_latest_snapshot,
    bench_set_block_context_to_earliest_layer,
    bench_set_block_context_to_latest_layer,
    bench_set_block_context_to_middle_layer,
    bench_set_block_context_to_number_before_fork_block,
    bench_set_block_context_to_number_after_fork_block,
);
criterion_main!(state_history_benches);
