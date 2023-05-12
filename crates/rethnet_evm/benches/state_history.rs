use criterion::{criterion_group, criterion_main, Criterion};

mod util;
use util::{bench_sync_state_method, prep_no_op, SNAPSHOT_SCALES};

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory::checkpoint()",
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
        "StateHistory::make_snapshot",
        prep_no_op,
        |mut state, _number_of_accounts| {
            state.make_snapshot();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_revert(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory::revert",
        |state, _| {
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
    bench_revert
);
criterion_main!(state_history_benches);
