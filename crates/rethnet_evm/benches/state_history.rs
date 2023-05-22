use criterion::{criterion_group, criterion_main, Criterion};

use rethnet_eth::B256;

mod util;
use util::{bench_sync_state_method, prep_no_op, SNAPSHOT_SCALES, STORAGE_SCALES};

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:checkpoint()",
        prep_no_op,
        |state, _number_of_accounts, _, _| {
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
        |state, _number_of_accounts, _, _| {
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
        |state, _number_of_accounts, _, _| {
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
        |state, _number_of_accounts, _, _| {
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
        |state, _number_of_accounts, checkpoints, _| {
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
        |state, _number_of_accounts, checkpoints, _| {
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
        |state, _number_of_accounts, checkpoints, _| {
            state
                .set_block_context(&checkpoints[checkpoints.len() / 2], None)
                .unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_revert(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:revert",
        |state, _| {
            state.checkpoint().unwrap();
        },
        |state, _number_of_accounts, _, _| {
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
);
criterion_main!(state_history_benches);
