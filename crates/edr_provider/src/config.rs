use std::{path::PathBuf, time::SystemTime};

use edr_eth::{AccountInfo, Address, HashMap, SpecId, U256};
use rpc_hardhat::config::ForkConfig;

/// Configuration for the provider
pub struct ProviderConfig {
    pub allow_blocks_with_same_timestamp: bool,
    pub allow_unlimited_contract_size: bool,
    pub accounts: Vec<AccountConfig>,
    pub block_gas_limit: u64,
    pub cache_dir: PathBuf,
    pub chain_id: u64,
    pub coinbase: Address,
    pub fork: Option<ForkConfig>,
    // Genesis accounts in addition to accounts. Useful for adding impersonated accounts for tests.
    pub genesis_accounts: HashMap<Address, AccountInfo>,
    pub gas: u64,
    pub hardfork: SpecId,
    pub initial_base_fee_per_gas: Option<U256>,
    pub initial_date: Option<SystemTime>,
    pub network_id: u64,
}

/// Configuration input for a single account
pub struct AccountConfig {
    /// the secret key of the account
    pub secret_key: k256::SecretKey,
    /// the balance of the account
    pub balance: U256,
}
