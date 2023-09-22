use criterion::{criterion_group, criterion_main, Criterion};

mod util;
use util::{bench_sync_state_method, state_prep_no_op};

fn bench_clone(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "SyncState::clone",
        state_prep_no_op,
        |state, _number_of_accounts| {
            let _cloned = state.clone();
        },
        &[0],
    );
}

criterion_group!(state_clone_benches, bench_clone);
criterion_main!(state_clone_benches);
