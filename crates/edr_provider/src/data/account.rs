use edr_eth::{signature::public_key_to_address, Address};
use edr_evm::{Account, AccountInfo, AccountStatus, HashMap, KECCAK_EMPTY};
use indexmap::IndexMap;

use crate::{AccountConfig, ProviderConfig};

pub(super) struct InitialAccounts {
    pub local_accounts: IndexMap<Address, k256::SecretKey>,
    pub genesis_accounts: HashMap<Address, Account>,
}

pub(super) fn create_accounts(config: &ProviderConfig) -> InitialAccounts {
    let mut local_accounts = IndexMap::default();

    let genesis_accounts = config
        .accounts
        .iter()
        .map(
            |AccountConfig {
                 secret_key,
                 balance,
             }| {
                let address = public_key_to_address(secret_key.public_key());
                let genesis_account = AccountInfo {
                    balance: *balance,
                    nonce: 0,
                    code: None,
                    code_hash: KECCAK_EMPTY,
                };

                local_accounts.insert(address, secret_key.clone());

                (address, genesis_account)
            },
        )
        .chain(config.genesis_accounts.clone())
        .map(|(address, account_info)| {
            let account = Account {
                info: account_info,
                storage: HashMap::new(),
                status: AccountStatus::Created | AccountStatus::Touched,
            };

            (address, account)
        })
        .collect();

    InitialAccounts {
        local_accounts,
        genesis_accounts,
    }
}
