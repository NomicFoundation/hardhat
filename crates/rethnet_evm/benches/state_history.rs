use criterion::{criterion_group, criterion_main, Criterion};

mod util;
use util::{bench_sync_state_method, prep_no_op};

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

criterion_group!(state_history_benches, bench_checkpoint);
criterion_main!(state_history_benches);
