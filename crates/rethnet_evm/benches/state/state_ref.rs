use std::str::FromStr;

use criterion::{criterion_group, criterion_main, Criterion};
use revm::{db::StateRef, primitives::Bytecode};

use rethnet_eth::{Address, Bytes, U256};

mod util;
use util::{bench_sync_state_method, state_prep_no_op, Permutations};

fn bench_basic(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateRef:basic",
        state_prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.basic(Address::from_str(&format!("0x{i:0>40x}")).unwrap());
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
        state_prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.code_by_hash(
                    Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from_low_u64_ne(i).as_bytes(),
                    ))
                    .hash_slow(),
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
        state_prep_no_op,
        |state, number_of_accounts, _, _| {
            for i in (1..=number_of_accounts).rev() {
                let result = state.storage(Address::from_low_u64_ne(i), U256::from(i));
                debug_assert!(result.is_ok());
            }
        },
        &Permutations::storage_scales(),
        &[1],
    );
}

criterion_group!(benches, bench_basic, bench_code_by_hash, bench_storage,);
criterion_main!(benches);
