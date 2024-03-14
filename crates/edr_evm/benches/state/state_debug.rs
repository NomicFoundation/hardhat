use criterion::{criterion_group, criterion_main, Criterion};
use edr_eth::{Address, Bytes, U256};
use edr_evm::{alloy_primitives::U160, state::AccountModifierFn};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};

mod util;
use util::{account_has_code, bench_sync_state_method, permutations, state_prep_no_op};

fn bench_account_storage_root_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:storage_root nonexist acct",
        |state, number_of_accounts| {
            // ensure account won't exist
            let address = Address::from(U160::from(number_of_accounts + 1));
            state.remove_account(address).unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts + 1));
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.account_storage_root(&address);
            debug_assert!(result.is_ok());
        },
        &permutations::STORAGE_SCALES,
    );
}

fn bench_account_storage_root_account_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:storage_root exist acct",
        state_prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.account_storage_root(&address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
        &permutations::STORAGE_SCALES,
    );
}

fn bench_insert_account_already_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:ins exist acct",
        state_prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(state.basic(address).unwrap().is_some());
            let result = state.insert_account(address, AccountInfo::default());
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_insert_account_doesnt_exist_without_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:ins nonexist acct w.out code",
        |state, number_of_accounts| {
            // ensure account won't exist
            let address = Address::from(U160::from(number_of_accounts + 1));
            state.remove_account(address).unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts + 1));
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.insert_account(address, AccountInfo::default());
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_insert_account_doesnt_exist_with_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:ins nonexist acct w.code",
        |state, number_of_accounts| {
            // ensure account won't exist
            let address = Address::from(U160::from(number_of_accounts + 1));
            state.remove_account(address).unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts + 1));
            debug_assert!(state.basic(address).unwrap().is_none());

            let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_slice()));
            let code_hash = code.hash_slow();
            let result = state.insert_account(
                address,
                AccountInfo {
                    code_hash,
                    code: Some(code),
                    ..AccountInfo::default()
                },
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod nonexist acct no code chg",
        |state, number_of_accounts| {
            // ensure account won't exist
            let address = Address::from(U160::from(number_of_accounts + 1));
            state.remove_account(address).unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts + 1));
            debug_assert!(state.basic(address).unwrap().is_none());
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|balance, nonce, _code| {
                    *balance += U256::from(1);
                    *nonce += 1;
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_exists_with_code_no_change(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod non-code change",
        state_prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(account_has_code(state, &address));
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|balance, nonce, _code| {
                    *balance += U256::from(1);
                    *nonce += 1;
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_exists_with_code_changed_to_empty(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod rm acct code",
        |state, number_of_accounts| {
            // ensure that the account really does exist and have code
            let address = Address::from(U160::from(number_of_accounts));
            let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_slice()));
            state
                .insert_account(
                    address,
                    AccountInfo {
                        code_hash: code.hash_slow(),
                        code: Some(code),
                        ..AccountInfo::default()
                    },
                )
                .unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(account_has_code(state, &address));
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                    code.take();
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_exists_with_code_changed(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod replace acct code",
        state_prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(account_has_code(state, &address));
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(move |_balance, _nonce, code| {
                    code.replace(Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from(U160::from(number_of_accounts + 1)).as_slice(),
                    )));
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_exists_without_code_code_changed(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod add code to acct w none",
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                )
                .unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(!account_has_code(state, &address));
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(move |_balance, _nonce, code| {
                    code.replace(Bytecode::new_raw(Bytes::copy_from_slice(
                        Address::from(U160::from(number_of_accounts + 1)).as_slice(),
                    )));
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_modify_account_exists_without_code_no_code_change(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:mod leave code unchanged",
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                )
                .unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(!account_has_code(state, &address));
            let result = state.modify_account(
                address,
                AccountModifierFn::new(Box::new(|balance, nonce, _code| {
                    *balance += U256::from(1);
                    *nonce += 1;
                })),
            );
            debug_assert!(result.is_ok());
        },
        &[0],
    );
}

fn bench_remove_account_with_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:rm exist acct w.code",
        |state, number_of_accounts| {
            // ensure that the account really does exist and have code
            let address = Address::from(U160::from(number_of_accounts));
            let code = Bytecode::new_raw(Bytes::copy_from_slice(address.as_slice()));
            state
                .insert_account(
                    address,
                    AccountInfo {
                        code_hash: code.hash_slow(),
                        code: Some(code),
                        ..AccountInfo::default()
                    },
                )
                .unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(account_has_code(state, &address));
            let result = state.remove_account(address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
        &[0],
    );
}

fn bench_remove_account_without_code(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:rm exist acct w.out code",
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(|_balance, _nonce, code| {
                        code.take();
                    })),
                )
                .unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(!account_has_code(state, &address));
            let result = state.remove_account(address);
            debug_assert!(result.is_ok());
            debug_assert!(result.unwrap().is_some());
        },
        &[0],
    );
}

fn bench_set_account_storage_slot_account_doesnt_exist(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:set_storage nonexist acct",
        |state, number_of_accounts| {
            // ensure account won't exist
            let address = Address::from(U160::from(number_of_accounts + 1));
            state.remove_account(address).unwrap();
        },
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts + 1));
            debug_assert!(state.basic(address).unwrap().is_none());
            let result =
                state.set_account_storage_slot(address, U256::from(1), U256::from(1), &|| {
                    Ok(AccountInfo {
                        code: None,
                        ..AccountInfo::default()
                    })
                });
            debug_assert!(result.is_ok());
        },
        &permutations::STORAGE_SCALES,
    );
}

fn bench_set_account_storage_slot_account_exists(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:set_storage exist acct",
        state_prep_no_op,
        |state, number_of_accounts| {
            let address = Address::from(U160::from(number_of_accounts));
            debug_assert!(state.basic(address).unwrap().is_some());
            let result =
                state.set_account_storage_slot(address, U256::from(1), U256::from(1), &|| {
                    Ok(AccountInfo {
                        code: None,
                        ..AccountInfo::default()
                    })
                });
            debug_assert!(result.is_ok());
        },
        &permutations::STORAGE_SCALES,
    );
}

fn bench_state_root(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateDebug:state_root",
        state_prep_no_op,
        |state, _number_of_accounts| {
            let result = state.state_root();
            debug_assert!(result.is_ok());
        },
        &permutations::STORAGE_SCALES,
    );
}

criterion_group!(
    state_debug_benches,
    bench_account_storage_root_account_doesnt_exist,
    bench_account_storage_root_account_exists,
    bench_insert_account_already_exists,
    bench_insert_account_doesnt_exist_with_code,
    bench_insert_account_doesnt_exist_without_code,
    bench_modify_account_doesnt_exist,
    bench_modify_account_exists_with_code_no_change,
    bench_modify_account_exists_with_code_changed_to_empty,
    bench_modify_account_exists_with_code_changed,
    bench_modify_account_exists_without_code_code_changed,
    bench_modify_account_exists_without_code_no_code_change,
    bench_remove_account_with_code,
    bench_remove_account_without_code,
    bench_set_account_storage_slot_account_doesnt_exist,
    bench_set_account_storage_slot_account_exists,
    bench_state_root,
);
criterion_main!(state_debug_benches);
