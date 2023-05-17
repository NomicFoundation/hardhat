use criterion::{criterion_group, criterion_main, Criterion};

use rethnet_eth::{Address, B256, U256};
use rethnet_evm::{
    state::{AccountModifierFn, StateError, SyncState},
    AccountInfo,
};

mod util;
use util::{bench_sync_state_method, prep_no_op, SNAPSHOT_SCALES, STORAGE_SCALES};

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory:checkpoint()",
        prep_no_op,
        |mut state, _number_of_accounts| {
            let result = state.checkpoint();
            debug_assert!(result.is_ok());
        },
        &STORAGE_SCALES,
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
        &[0],
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
        &[0],
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

fn prep_snapshots(
    state: &mut dyn SyncState<StateError>,
    number_of_snapshots: u64,
    account_to_modify: &Address,
    snapshot_number_to_capture: u64,
) -> B256 {
    let mut return_value: B256 = Default::default();
    for i in 0..number_of_snapshots {
        // modify an arbitrary account
        state
            .modify_account(
                *account_to_modify,
                AccountModifierFn::new(Box::new(|balance, _nonce, _code| {
                    *balance = *balance + U256::from(1);
                })),
                &|| Ok(AccountInfo::default()),
            )
            .unwrap();
        if i == snapshot_number_to_capture {
            return_value.assign_from_slice(state.state_root().unwrap().as_bytes());
        }
        state.checkpoint().unwrap();
    }
    return_value
}

fn bench_set_block_context_to_earliest_layer(c: &mut Criterion) {
    let earliest_state_root: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:set_block,earliest layer",
        |state, number_of_accounts, number_of_snapshots| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            earliest_state_root.borrow_mut().assign_from_slice(
                prep_snapshots(state, number_of_snapshots, &address, 0).as_bytes(),
            );
        },
        |mut state, _number_of_accounts| {
            state
                .set_block_context(&earliest_state_root.borrow(), None)
                .unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_set_block_context_to_latest_layer(c: &mut Criterion) {
    let latest_state_root: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:set_block,latest layer",
        |state, number_of_accounts, number_of_snapshots| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            latest_state_root.borrow_mut().assign_from_slice(
                prep_snapshots(
                    state,
                    number_of_snapshots,
                    &address,
                    number_of_snapshots - 1,
                )
                .as_bytes(),
            );
        },
        |mut state, _number_of_accounts| {
            state
                .set_block_context(&latest_state_root.borrow(), None)
                .unwrap();
        },
        &[0],
        &SNAPSHOT_SCALES,
    );
}

fn bench_set_block_context_to_middle_layer(c: &mut Criterion) {
    let middle_state_root: std::cell::RefCell<B256> = Default::default();
    bench_sync_state_method(
        c,
        "StateHistory:set_block,middle layer",
        |state, number_of_accounts, number_of_snapshots| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            middle_state_root.borrow_mut().assign_from_slice(
                prep_snapshots(
                    state,
                    number_of_snapshots,
                    &address,
                    number_of_snapshots / 2,
                )
                .as_bytes(),
            );
        },
        |mut state, _number_of_accounts| {
            state
                .set_block_context(&middle_state_root.borrow(), None)
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
        |state, _, _| {
            state.checkpoint().unwrap();
        },
        |mut state, _number_of_accounts| {
            let result = state.revert();
            debug_assert!(result.is_ok());
        },
        &[0],
        &[0],
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
