use std::net::SocketAddr;

use secp256k1::SecretKey;

use rethnet_eth::{Address, U256, U64};

pub use crate::hardhat_methods::reset::{RpcForkConfig, RpcHardhatNetworkConfig};

pub struct Config {
    pub address: SocketAddr,
    pub rpc_hardhat_network_config: RpcHardhatNetworkConfig,
    pub accounts: Vec<AccountConfig>,
    pub chain_id: U64,
    pub coinbase: Address,
    pub network_id: U64,
}

/// configuration input for a single account
pub struct AccountConfig {
    /// the private key of the account
    pub private_key: SecretKey,
    /// the balance of the account
    pub balance: U256,
}
