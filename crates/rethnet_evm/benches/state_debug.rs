use criterion::{criterion_group, criterion_main, Criterion};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};

use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::state::AccountModifierFn;

mod util;
use util::{bench_sync_state_method, prep_no_op};

fn bench_account_storage_root_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::account_storage_root(), account doesn't exist",
        prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts + 1);
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.account_storage_root(&address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_none());
        },
    );
}

fn bench_account_storage_root_account_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::account_storage_root(), account exists",
        prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.account_storage_root(&address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
    );
}

fn bench_insert_account_already_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::insert_account(), account already exists",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.insert_account(address, AccountInfo::default());
            debug_assert!(result.is_ok())
        },
    );
}

fn bench_insert_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::insert_account(), account doesn't yet exist",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts + 1);
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.insert_account(address, AccountInfo::default());
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account doesn't exist",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts + 1);
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|_balance, _nonce, _code| {})),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_exists_with_code_no_change(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account already exists, with code, no code change",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            // TODO: figure out why the following assert is failing
            //debug_assert!(state.basic(address).unwrap().unwrap().code.is_some());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|_balance, _nonce, _code| {})),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_exists_with_code_changed_to_empty(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account already exists, with code, code changed to empty",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            // TODO: figure out why the following assert is failing
            //debug_assert!(state.basic(address).unwrap().unwrap().code.is_some());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                    code.take();
                })),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_exists_with_code_changed(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account already exists, with code, code changed/inserted",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            // TODO: figure out why the following assert is failing
            //debug_assert!(state.basic(address).unwrap().unwrap().code.is_some());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(move |_balance, _nonce, code| {
                    code.replace(Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from_low_u64_ne(number_of_accounts + 1).as_bytes(),
                    )));
                })),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_exists_without_code_code_changed(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account already exists, without code, code changed/inserted",
        |state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                    &|| Ok(AccountInfo::default()),
                )
                .unwrap();
        },
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(move |_balance, _nonce, code| {
                    code.replace(Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from_low_u64_ne(number_of_accounts + 1).as_bytes(),
                    )));
                })),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_modify_account_exists_without_code_no_code_change(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::modify_account(), account already exists, without code, no code change",
        |state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                    &|| Ok(AccountInfo::default()),
                )
                .unwrap();
        },
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|_balance, _nonce, _code| {})),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_remove_account_with_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::remove_account() existing account with code",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            // TODO: figure out why the following assert is failing
            //debug_assert!(state.basic(address).unwrap().unwrap().code.is_some());
            let result = state.remove_account(address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
    );
}

fn bench_remove_account_without_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::remove_account() existing account without code",
        |state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                    &|| Ok(AccountInfo::default()),
                )
                .unwrap();
        },
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().unwrap().code.is_none());
            let result = state.remove_account(address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
    );
}

fn bench_serialize(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::serialize()",
        prep_no_op,
        |state, _number_of_accounts| {
            state.serialize();
        },
    );
}

fn bench_set_account_storage_slot_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::set_account_storage_slot(), account doesn't exist",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts + 1);
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.set_account_storage_slot(address, U256::from(1), U256::from(1));
            debug_assert!(result.is_ok())
        },
    );
}

fn bench_set_account_storage_slot_account_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::set_account_storage_slot(), account exists",
        prep_no_op,
        |mut state, number_of_accounts| {
            let address = Address::from_low_u64_ne(number_of_accounts);
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.set_account_storage_slot(address, U256::from(1), U256::from(1));
            debug_assert!(result.is_ok())
        },
    );
}

fn bench_state_root(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug::state_root()",
        prep_no_op,
        |state, _number_of_accounts| {
            let result = state.state_root();
            debug_assert!(result.is_ok());
        },
    );
}

criterion_group!(
    state_debug_benches,
    bench_account_storage_root_account_doesnt_exist,
    bench_account_storage_root_account_exists,
    bench_insert_account_already_exists,
    bench_insert_account_doesnt_exist,
    bench_modify_account_doesnt_exist,
    bench_modify_account_exists_with_code_no_change,
    bench_modify_account_exists_with_code_changed_to_empty,
    bench_modify_account_exists_with_code_changed,
    bench_modify_account_exists_without_code_code_changed,
    bench_modify_account_exists_without_code_no_code_change,
    bench_remove_account_with_code,
    bench_remove_account_without_code,
    bench_serialize,
    bench_set_account_storage_slot_account_doesnt_exist,
    bench_set_account_storage_slot_account_exists,
    bench_state_root,
);
criterion_main!(state_debug_benches);
