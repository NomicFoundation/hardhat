use edr_eth::{signature::public_key_to_address, Address};
use edr_evm::{AccountInfo, HashMap, KECCAK_EMPTY};
use indexmap::IndexMap;

use crate::{AccountConfig, Config};

pub(super) struct InitialAccounts {
    pub local_accounts: IndexMap<Address, k256::SecretKey>,
    pub genesis_accounts: HashMap<Address, AccountInfo>,
}

pub(super) fn create_accounts(config: &Config) -> InitialAccounts {
    let mut local_accounts = IndexMap::default();
    let mut genesis_accounts = HashMap::default();

    for account_config in &config.accounts {
        let AccountConfig {
            secret_key,
            balance,
        } = account_config;
        let address = public_key_to_address(secret_key.public_key());
        let genesis_account = AccountInfo {
            balance: *balance,
            nonce: 0,
            code: None,
            code_hash: KECCAK_EMPTY,
        };

        local_accounts.insert(address, secret_key.clone());
        genesis_accounts.insert(address, genesis_account);
    }

    InitialAccounts {
        local_accounts,
        genesis_accounts,
    }
}
