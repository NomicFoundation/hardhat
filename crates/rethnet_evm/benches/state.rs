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
        state_prep_no_op,
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

fn bench_database_commit(c: &mut Criterion) {
    use hashbrown::HashMap;
    use revm::primitives::KECCAK_EMPTY;

    use rethnet_eth::remote::serde_with_helpers::optional_u64_from_hex;
    use rethnet_evm::{Account, AccountInfo, StorageSlot};

    #[derive(Debug, serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct AccountState {
        #[serde(deserialize_with = "optional_u64_from_hex")]
        nonce: Option<u64>,
        balance: Option<U256>,
        storage: HashMap<U256, Option<U256>>,
        code: Option<Bytes>,
        storage_cleared: bool,
    }

    let mut accounts_to_commit: HashMap<Address, Account> = HashMap::new();
    let json_accounts: HashMap<Address, AccountState> = serde_json::from_str(
        &std::fs::read_to_string(
            "benches/fixtures/accounts_changed_in_mainnet_block_17295357.json",
        )
        .unwrap(),
        /* a fresh set of account updates can be retrieved via, eg:
            BLOCK=17295357 \
                HARDHAT_EXPERIMENTAL_VM_MODE=ethereumjs \
                HARDHAT_RUN_FULL_BLOCK_DUMP_STATE_TO_FILE=../../crates/rethnet_evm/benches/fixtures/accounts_changed_in_mainnet_block_${BLOCK}.json \
                sh -c 'yarn ts-node scripts/test-run-forked-block.ts $ALCHEMY_URL $BLOCK'
            note that this should be done from the packages/hardhat-core directory.
        */
    )
    .unwrap();
    for (address, account_state) in json_accounts.iter() {
        let mut storage: HashMap<U256, StorageSlot> = HashMap::new();
        for (location, value) in account_state.storage.clone() {
            storage.insert(
                location,
                StorageSlot {
                    original_value: U256::ZERO, // TODO: something better?
                    present_value: value.unwrap_or(U256::ZERO),
                },
            );
        }
        let code = account_state
            .code
            .clone()
            .map(|bytes| Bytecode::new_raw(bytes));
        accounts_to_commit.insert(
            *address,
            Account {
                info: AccountInfo {
                    balance: account_state.balance.unwrap(),
                    nonce: account_state.nonce.unwrap(),
                    code: code.clone(),
                    code_hash: code.map_or(KECCAK_EMPTY, |code| code.hash()),
                },
                storage,
                storage_cleared: account_state.storage_cleared,
                is_destroyed: false,
                is_touched: false,
                is_not_existing: false,
            },
        );
    }

    bench_sync_state_method(
        c,
        "DatabaseCommit:commit",
        state_prep_no_op,
        |state, _number_of_accounts, _, _| {
            state.commit(accounts_to_commit.clone());

            debug_assert!(json_accounts.iter().all(|(address, json)| {
                if let Some(committed) = state.basic(*address).unwrap() {
                    debug_assert!(committed.balance == json.balance.unwrap());
                    debug_assert!(committed.nonce == json.nonce.unwrap());
                    if let Some(json_code) = json.code.clone().map(|c| Bytecode::new_raw(c)) {
                        debug_assert!(
                            state.code_by_hash(committed.code_hash).unwrap() == json_code
                        );
                    } else {
                        debug_assert!(committed.code.is_none());
                    }
                } else {
                    debug_assert!(false);
                }
                true
            }));
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

criterion_group!(
    benches,
    bench_basic,
    bench_code_by_hash,
    bench_storage,
    bench_database_commit
);
criterion_main!(benches);
