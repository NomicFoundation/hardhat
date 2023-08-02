use std::net::SocketAddr;
use std::time::SystemTime;

use secp256k1::SecretKey;

use rethnet_eth::{Address, SpecId, U256, U64};

pub use crate::hardhat_methods::reset::{RpcForkConfig, RpcHardhatNetworkConfig};

pub struct Config {
    pub allow_blocks_with_same_timestamp: bool,
    pub address: SocketAddr,
    pub rpc_hardhat_network_config: RpcHardhatNetworkConfig,
    pub accounts: Vec<AccountConfig>,
    pub block_gas_limit: U256,
    pub chain_id: U64,
    pub coinbase: Address,
    pub gas: U256,
    pub hardfork: SpecId,
    pub initial_base_fee_per_gas: Option<U256>,
    pub initial_date: Option<SystemTime>,
    pub network_id: U64,
}

/// configuration input for a single account
pub struct AccountConfig {
    /// the private key of the account
    pub private_key: SecretKey,
    /// the balance of the account
    pub balance: U256,
}
