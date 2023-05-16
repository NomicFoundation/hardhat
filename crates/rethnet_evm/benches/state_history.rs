use criterion::{criterion_group, criterion_main, Criterion};

use rethnet_eth::B256;

mod util;
use util::{bench_sync_state_method, prep_no_op, SNAPSHOT_SCALES};

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:checkpoint()",
        prep_no_op,
        |mut state, _number_of_accounts| {
            let result = state.checkpoint();
            debug_assert!(result.is_ok());
        },
        &[0],
        &[0],
    );
}

fn bench_make_snapshot(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:make_snapshot",
        prep_no_op,
        |mut state, _number_of_accounts| {
            state.make_snapshot();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_remove_snapshot(c: &mut Criterion) {
    let snapshot: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:remove_snapshot",
        |state, _, _| {
            snapshot
                .borrow_mut()
                .assign_from_slice(state.make_snapshot().as_bytes());
        },
        |mut state, _number_of_accounts| {
            state.remove_snapshot(&snapshot.borrow());
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_set_block_context_to_latest_snapshot(c: &mut Criterion) {
    let snapshot: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:set_block,latest snapshot",
        |state, _, _| {
            snapshot
                .borrow_mut()
                .assign_from_slice(state.make_snapshot().as_bytes());
        },
        |mut state, _number_of_accounts| {
            let result = state.set_block_context(&snapshot.borrow(), None);
            debug_assert!(result.is_ok());
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

// TODO: consider whether we should have an additional benchmark of set_block_context that restores
// to an older layer rather than a very recent one, and further, whether that additional benchmark
// should also vary the age/depth of the older layer being reverted to.

fn bench_revert(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:revert",
        |state, _, _| {
            state.checkpoint().unwrap();
        },
        |mut state, _number_of_accounts| {
            let result = state.revert();
            debug_assert!(result.is_ok());
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

criterion_group!(
    state_history_benches,
    bench_checkpoint,
    bench_make_snapshot,
    bench_remove_snapshot,
    bench_revert,
    bench_set_block_context_to_latest_snapshot,
);
criterion_main!(state_history_benches);
