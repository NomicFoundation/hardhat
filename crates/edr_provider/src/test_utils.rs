use std::{path::PathBuf, time::SystemTime};

use edr_eth::{
    block::BlobGas, signature::secret_key_from_str, trie::KECCAK_NULL_RLP, AccountInfo, Address,
    HashMap, SpecId, U256,
};
use edr_evm::{alloy_primitives::U160, KECCAK_EMPTY};
use edr_test_utils::env::get_alchemy_url;

use super::*;
use crate::{config::MiningConfig, requests::hardhat::rpc_types::ForkConfig};

pub const TEST_SECRET_KEY: &str =
    "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Address 0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826
pub const TEST_SECRET_KEY_SIGN_TYPED_DATA_V4: &str =
    "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4";

pub const FORK_BLOCK_NUMBER: u64 = 18_725_000;

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

    let fork = if forked {
        Some(ForkConfig {
            json_rpc_url: get_alchemy_url(),
            // Random recent block for better cache consistency
            block_number: Some(FORK_BLOCK_NUMBER),
            http_headers: None,
        })
    } else {
        None
    };

    ProviderConfig {
        accounts: vec![
            AccountConfig {
                secret_key: secret_key_from_str(TEST_SECRET_KEY)
                    .expect("should construct secret key from string"),
                balance: one_ether(),
            },
            AccountConfig {
                secret_key: secret_key_from_str(TEST_SECRET_KEY_SIGN_TYPED_DATA_V4)
                    .expect("should construct secret key from string"),
                balance: one_ether(),
            },
        ],
        allow_blocks_with_same_timestamp: false,
        allow_unlimited_contract_size: false,
        bail_on_call_failure: false,
        bail_on_transaction_failure: false,
        block_gas_limit: 30_000_000,
        chain_id: 123,
        chains: HashMap::new(),
        coinbase: Address::from(U160::from(1)),
        fork,
        genesis_accounts,
        hardfork: SpecId::LATEST,
        initial_base_fee_per_gas: Some(U256::from(1000000000)),
        initial_blob_gas: Some(BlobGas {
            gas_used: 0,
            excess_gas: 0,
        }),
        initial_date: Some(SystemTime::now()),
        initial_parent_beacon_block_root: Some(KECCAK_NULL_RLP),
        min_gas_price: U256::ZERO,
        mining: MiningConfig::default(),
        network_id: 123,
        cache_dir,
    }
}
