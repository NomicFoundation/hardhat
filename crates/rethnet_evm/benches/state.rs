use std::str::FromStr;

use criterion::{criterion_group, criterion_main, Criterion};
use revm::{db::StateRef, primitives::Bytecode};

use rethnet_eth::{Address, Bytes, U256};

mod util;
use util::{bench_sync_state_method, prep_no_op, STORAGE_SCALES};

fn bench_basic(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateRef:basic",
        prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.basic(Address::from_str(&format!("0x{:0>40x}", i)).unwrap());
                debug_assert!(result.is_ok());
            }
        },
        &[0],
        &[1],
    );
}

fn bench_code_by_hash(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateRef:code_by_hash",
        prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.code_by_hash(
                    Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from_low_u64_ne(i).as_bytes(),
                    ))
                    .hash(),
                );
                debug_assert!(result.is_ok());
            }
        },
        &[0],
        &[1],
    );
}

fn bench_storage(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateRef:storage",
        prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.storage(Address::from_low_u64_ne(i), U256::from(i));
                debug_assert!(result.is_ok());
            }
        },
        &STORAGE_SCALES,
        &[1],
    );
}

criterion_group!(benches, bench_basic, bench_code_by_hash, bench_storage);
criterion_main!(benches);
