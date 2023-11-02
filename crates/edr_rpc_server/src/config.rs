use std::{net::SocketAddr, path::PathBuf, time::SystemTime};

use edr_eth::{Address, SpecId, U256};
use edr_evm::{AccountInfo, HashMap, KECCAK_EMPTY};

pub use crate::hardhat_methods::reset::{RpcForkConfig, RpcHardhatNetworkConfig};

pub struct Config {
    pub allow_blocks_with_same_timestamp: bool,
    pub allow_unlimited_contract_size: bool,
    pub address: SocketAddr,
    pub rpc_hardhat_network_config: RpcHardhatNetworkConfig,
    pub accounts: Vec<AccountConfig>,
    // Genesis accounts in addition to accounts. Useful for adding impersonated accounts for tests.
    pub genesis_accounts: HashMap<Address, AccountInfo>,
    pub block_gas_limit: u64,
    pub chain_id: u64,
    pub coinbase: Address,
    pub gas: u64,
    pub hardfork: SpecId,
    pub initial_base_fee_per_gas: Option<U256>,
    pub initial_date: Option<SystemTime>,
    pub network_id: u64,
    pub cache_dir: PathBuf,
}

/// configuration input for a single account
pub struct AccountConfig {
    /// the secret key of the account
    pub secret_key: k256::SecretKey,
    /// the balance of the account
    pub balance: U256,
}

#[cfg(feature = "test-tools")]
pub mod test_tools {
    use std::net::{IpAddr, Ipv4Addr};

    use edr_eth::signature::secret_key_from_str;

    use super::*;

    pub const TEST_SECRET_KEY: &str =
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    pub fn create_test_config(cache_dir: PathBuf) -> Config {
        create_test_config_with_impersonated_accounts(cache_dir, vec![])
    }

    fn one_ether() -> U256 {
        U256::from(10).pow(U256::from(18))
    }

    pub fn create_test_config_with_impersonated_accounts(
        cache_dir: PathBuf,
        impersonated_accounts: Vec<Address>,
    ) -> Config {
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

        Config {
            address: SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0),
            allow_blocks_with_same_timestamp: false,
            allow_unlimited_contract_size: false,
            rpc_hardhat_network_config: RpcHardhatNetworkConfig { forking: None },
            accounts: vec![AccountConfig {
                secret_key: secret_key_from_str(TEST_SECRET_KEY)
                    .expect("should construct secret key from string"),
                balance: one_ether(),
            }],
            genesis_accounts,
            block_gas_limit: 30_000_000,
            chain_id: 1,
            coinbase: Address::from_low_u64_ne(1),
            gas: 30_000_000,
            hardfork: SpecId::LATEST,
            initial_base_fee_per_gas: Some(U256::from(1000000000)),
            initial_date: Some(SystemTime::now()),
            network_id: 123,
            cache_dir,
        }
    }
}
