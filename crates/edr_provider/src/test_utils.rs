use std::{path::PathBuf, time::SystemTime};

use edr_eth::{
    block::BlobGas, signature::secret_key_from_str, trie::KECCAK_NULL_RLP, AccountInfo, Address,
    SpecId, U256,
};
use edr_evm::KECCAK_EMPTY;
use edr_test_utils::env::get_alchemy_url;
use rpc_hardhat::config::ForkConfig;

use super::*;
use crate::config::MiningConfig;

pub const TEST_SECRET_KEY: &str =
    "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/// Constructs a test config with a single account with 1 ether
pub fn create_test_config(cache_dir: PathBuf) -> ProviderConfig {
    create_test_config_with_impersonated_accounts_and_fork(cache_dir, vec![], false)
}

pub fn one_ether() -> U256 {
    U256::from(10).pow(U256::from(18))
}

pub fn create_test_config_with_impersonated_accounts_and_fork(
    cache_dir: PathBuf,
    impersonated_accounts: Vec<Address>,
    forked: bool,
) -> ProviderConfig {
    let genesis_accounts = impersonated_accounts
        .into_iter()
        .map(|address| {
            let account_info = AccountInfo {
                balance: one_ether(),
                nonce: 0,
                code: None,
                code_hash: KECCAK_EMPTY,
            };
            (address, account_info)
        })
        .collect();

    let mut fork = None;
    if forked {
        fork = Some(ForkConfig {
            json_rpc_url: get_alchemy_url(),
            // Random recent block for better cache consistency
            block_number: Some(18_725_000),
            http_headers: None,
        });
    }

    ProviderConfig {
        allow_blocks_with_same_timestamp: false,
        allow_unlimited_contract_size: false,
        bail_on_call_failure: false,
        bail_on_transaction_failure: false,
        fork,
        accounts: vec![AccountConfig {
            secret_key: secret_key_from_str(TEST_SECRET_KEY)
                .expect("should construct secret key from string"),
            balance: one_ether(),
        }],
        genesis_accounts,
        block_gas_limit: 30_000_000,
        chain_id: 1,
        coinbase: Address::from_low_u64_ne(1),
        hardfork: SpecId::LATEST,
        initial_base_fee_per_gas: Some(U256::from(1000000000)),
        initial_blob_gas: Some(BlobGas {
            gas_used: 0,
            excess_gas: 0,
        }),
        initial_date: Some(SystemTime::now()),
        initial_parent_beacon_block_root: Some(KECCAK_NULL_RLP),
        mining: MiningConfig::default(),
        network_id: 123,
        cache_dir,
    }
}
