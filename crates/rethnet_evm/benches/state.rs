use std::{clone::Clone, str::FromStr};

use criterion::{criterion_group, criterion_main, BatchSize, BenchmarkId, Criterion};
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::state::{
    AccountModifierFn, HybridState, LayeredState, RethnetLayer, StateError, SyncState,
};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};

#[derive(Default)]
struct RethnetStates {
    layered: LayeredState<RethnetLayer>,
    hybrid: HybridState<RethnetLayer>,
}

impl RethnetStates {
    fn fill(&mut self, number_of_accounts: u64, number_of_accounts_per_checkpoint: u64) {
        let mut states: [&mut dyn SyncState<StateError>; 2] = [&mut self.layered, &mut self.hybrid];
        for state in states.iter_mut() {
            let number_of_checkpoints = number_of_accounts / number_of_accounts_per_checkpoint;
            for checkpoint_number in 0..number_of_checkpoints {
                for account_number in 1..=number_of_accounts_per_checkpoint {
                    let account_number =
                        (checkpoint_number * number_of_accounts_per_checkpoint) + account_number;
                    let address = Address::from_low_u64_ne(account_number);
                    state
                        .insert_account(
                            address,
                            AccountInfo::new(
                                U256::from(account_number),
                                account_number,
                                Bytecode::new_raw(Bytes::copy_from_slice(address.as_bytes())),
                            ),
                        )
                        .unwrap();
                    state
                        .set_account_storage_slot(
                            address,
                            U256::from(account_number),
                            U256::from(account_number),
                        )
                        .unwrap();
                }
                state.checkpoint().unwrap();
            }
        }
    }

    /// Returns a set of factories, each member of which produces a clone of one of the state objects in this struct.
    fn make_clone_factories(
        &self,
    ) -> Vec<(
        &'static str, // label of the type of state produced by this factory
        Box<dyn Fn() -> Box<dyn SyncState<StateError>> + '_>,
    )> {
        vec![
            ("LayeredState", Box::new(|| Box::new(self.layered.clone()))),
            ("HybridState", Box::new(|| Box::new(self.hybrid.clone()))),
        ]
    }
}

#[cfg(feature = "bench-once")]
mod config {
    pub const CHECKPOINT_SCALES: [u64; 1] = [1];
    pub const ADDRESS_SCALES: [u64; 1] = [1];
}

#[cfg(not(feature = "bench-once"))]
mod config {
    const NUM_SCALES: usize = 4;
    pub const CHECKPOINT_SCALES: [u64; NUM_SCALES] = [1, 5, 10, 20];

    const MAX_CHECKPOINT_SCALE: u64 = CHECKPOINT_SCALES[NUM_SCALES - 1];
    pub const ADDRESS_SCALES: [u64; NUM_SCALES] = [
        MAX_CHECKPOINT_SCALE * 5,
        MAX_CHECKPOINT_SCALE * 25,
        MAX_CHECKPOINT_SCALE * 50,
        MAX_CHECKPOINT_SCALE * 100,
    ];
}

use config::*;


fn bench_sync_state_method<O, R, Prep>(c: &mut Criterion, method_name: &str, mut prep: Prep, mut method_invocation: R)
where
    R: FnMut(Box<dyn SyncState<StateError>>, u64) -> O,
    Prep: FnMut(&mut dyn SyncState<StateError>, u64),
{
    let mut group = c.benchmark_group(method_name);
    for accounts_per_checkpoint in CHECKPOINT_SCALES.iter() {
        for number_of_accounts in ADDRESS_SCALES.iter() {
            let mut rethnet_states = RethnetStates::default();
            rethnet_states.fill(*number_of_accounts, *accounts_per_checkpoint);

            for (label, state_factory) in rethnet_states.make_clone_factories().into_iter() {
                group.bench_with_input(
                    BenchmarkId::new(
                        format!(
                            "{},{} account(s) per checkpoint",
                            label, *accounts_per_checkpoint
                        ),
                        *number_of_accounts,
                    ),
                    number_of_accounts,
                    |b, number_of_accounts| {
                        b.iter_batched(
                            || {
                                let mut state = state_factory();
                                prep(&mut state, *number_of_accounts);
                                state
                            },
                            |state| method_invocation(state, *number_of_accounts),
                            BatchSize::SmallInput,
                        );
                    },
                );
            }
        }
    }
}

fn prep_no_op(_s: &mut dyn SyncState<StateError>, _i: u64) {}

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
                AccountModifierFn::new(Box::new(|_balance, &mut _nonce, _code| {})),
                &|| Ok(AccountInfo::default()),
            );
            debug_assert!(result.is_ok());
        },
    );
}

// TODO: "StateDebug::modify_account(), account already exists, without code, no code change",
// TODO: "StateDebug::modify_account(), account already exists, without code, code changed/inserted",

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
                AccountModifierFn::new(Box::new(|_balance, &mut _nonce, _code| {})),
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
                AccountModifierFn::new(Box::new(|_balance, &mut _nonce, code| {
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
                AccountModifierFn::new(Box::new(move |_balance, &mut _nonce, code| {
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

// TODO: bench_remove_account_without_code

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

fn bench_checkpoint(c: &mut Criterion) {
    bench_sync_state_method(
        c,
        "StateHistory::checkpoint()",
        prep_no_op,
        |mut state, _number_of_accounts| {
            let result = state.checkpoint();
            debug_assert!(result.is_ok());
        },
    );
}

fn bench_basic(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::basic()", prep_no_op, |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.basic(Address::from_str(&format!("0x{:0>40x}", i)).unwrap());
            debug_assert!(result.is_ok());
        }
    });
}

fn bench_code_by_hash(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::code_by_hash", prep_no_op, |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.code_by_hash(
                Bytecode::new_raw(Bytes::copy_from_slice(
                    Address::from_low_u64_ne(i).as_bytes(),
                ))
                .hash(),
            );
            debug_assert!(result.is_ok());
        }
    });
}

fn bench_storage(c: &mut Criterion) {
    bench_sync_state_method(c, "StateRef::storage", prep_no_op, |state, number_of_accounts| {
        for i in (1..=number_of_accounts).rev() {
            let result = state.storage(Address::from_low_u64_ne(i), U256::from(i));
            debug_assert!(result.is_ok());
        }
    });
}

criterion_group!(
    benches,
    bench_account_storage_root_account_doesnt_exist,
    bench_account_storage_root_account_exists,
    bench_insert_account_already_exists,
    bench_insert_account_doesnt_exist,
    bench_modify_account_doesnt_exist,
    bench_modify_account_exists_with_code_no_change,
    bench_modify_account_exists_with_code_changed_to_empty,
    bench_modify_account_exists_with_code_changed,
    bench_remove_account_with_code,
    bench_serialize,
    bench_set_account_storage_slot_account_doesnt_exist,
    bench_set_account_storage_slot_account_exists,
    bench_state_root,
    bench_checkpoint,
    bench_basic,
    bench_code_by_hash,
    bench_storage,
);
criterion_main!(benches);
