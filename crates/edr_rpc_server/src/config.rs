use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::SystemTime;

use edr_eth::{Address, SpecId, U256};

pub use crate::hardhat_methods::reset::{RpcForkConfig, RpcHardhatNetworkConfig};

pub struct Config {
    pub allow_blocks_with_same_timestamp: bool,
    pub allow_unlimited_contract_size: bool,
    pub address: SocketAddr,
    pub rpc_hardhat_network_config: RpcHardhatNetworkConfig,
    pub accounts: Vec<AccountConfig>,
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
