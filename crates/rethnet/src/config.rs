use std::net::SocketAddr;
use std::path::PathBuf;
use std::{str::FromStr, time::SystemTime};

use anyhow::anyhow;
use hex;
use rethnet_eth::{serde::ZeroXPrefixedBytes, Address, Bytes, SpecId, U256};
use rethnet_rpc_server::{
    AccountConfig as ServerAccountConfig, Config as ServerConfig, RpcForkConfig,
    RpcHardhatNetworkConfig,
};
use secp256k1::SecretKey;
use serde::{Deserialize, Serialize};

pub use super::NodeArgs;

mod number;
pub use number::{u256_number, u64_number, Number};

/// struct representing the deserialized conifguration file, eg hardhat.config.json
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigFile {
    // TODO: expand this per https://github.com/NomicFoundation/rethnet/issues/111
    pub accounts: Vec<AccountConfig>,
    pub allow_blocks_with_same_timestamp: bool,
    #[serde(deserialize_with = "u256_number")]
    pub block_gas_limit: Number,
    #[serde(deserialize_with = "u64_number")]
    pub chain_id: Number,
    pub coinbase: Address,
    #[serde(deserialize_with = "u256_number")]
    pub gas: Number,
    pub hardfork: SpecId,
    #[serde(deserialize_with = "u256_number")]
    pub initial_base_fee_per_gas: Number,
    pub initial_date: Option<SystemTime>,
    #[serde(deserialize_with = "u64_number")]
    pub network_id: Number,
    pub cache_dir: PathBuf,
}

impl ConfigFile {
    pub fn into_server_config(self, cli_args: NodeArgs) -> Result<ServerConfig, anyhow::Error> {
        Ok(ServerConfig {
            address: SocketAddr::new(cli_args.host, cli_args.port),
            allow_blocks_with_same_timestamp: cli_args.allow_blocks_with_same_timestamp
                || self.allow_blocks_with_same_timestamp,
            rpc_hardhat_network_config: RpcHardhatNetworkConfig {
                forking: if let Some(json_rpc_url) = cli_args.fork_url {
                    Some(RpcForkConfig {
                        json_rpc_url,
                        block_number: cli_args.fork_block_number,
                        http_headers: None,
                    })
                } else if cli_args.fork_block_number.is_some() {
                    Err(anyhow!(
                        "A fork block number can only be used if you also supply a fork URL"
                    ))?
                } else {
                    None
                },
            },
            accounts: self
                .accounts
                .into_iter()
                .map(ServerAccountConfig::try_from)
                .collect::<Result<Vec<_>, _>>()?,
            block_gas_limit: self.block_gas_limit.into(),
            chain_id: cli_args.chain_id.unwrap_or(self.chain_id.try_into()?),
            coinbase: cli_args.coinbase.unwrap_or(self.coinbase),
            gas: self.gas.into(),
            hardfork: self.hardfork,
            initial_base_fee_per_gas: Some(self.initial_base_fee_per_gas.into()),
            initial_date: self.initial_date,
            network_id: cli_args.network_id.unwrap_or(self.network_id.try_into()?),
            cache_dir: cli_args.cache_dir.unwrap_or(self.cache_dir),
        })
    }
}

impl Default for ConfigFile {
    fn default() -> Self {
        // default values taken from https://hardhat.org/hardhat-network/docs/reference
        let block_gas_limit = Number::U256(U256::from(30_000_000));
        let chain_id = Number::U64(31337);
        Self {
            allow_blocks_with_same_timestamp: false,
            accounts: rethnet_defaults::PRIVATE_KEYS
                .into_iter()
                .map(|s| AccountConfig {
                    private_key: Bytes::from_iter(
                        hex::decode(s)
                            .expect("should decode all default private keys from strings"),
                    )
                    .into(),
                    balance: Number::U256(U256::from(10000)),
                })
                .collect(),
            block_gas_limit: block_gas_limit.clone(),
            chain_id: chain_id.clone(),
            coinbase: Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e")
                .expect("default value should be known to succeed"),
            gas: block_gas_limit,
            hardfork: SpecId::LATEST,
            initial_base_fee_per_gas: Number::U256(U256::from(1000000000)),
            initial_date: None,
            network_id: chain_id,
            cache_dir: rethnet_defaults::CACHE_DIR.into(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub struct AccountConfig {
    pub private_key: ZeroXPrefixedBytes,
    #[serde(deserialize_with = "u256_number")]
    pub balance: Number,
}

impl TryFrom<AccountConfig> for ServerAccountConfig {
    type Error = secp256k1::Error;
    fn try_from(account_config: AccountConfig) -> Result<Self, Self::Error> {
        let bytes: Bytes = account_config.private_key.into();
        Ok(Self {
            private_key: SecretKey::from_slice(&bytes[..])?,
            balance: account_config.balance.into(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use toml;

    #[test]
    fn test_config_file_serde() {
        let config_file = ConfigFile::default();
        let serialized = toml::to_string(&config_file).unwrap();
        let deserialized: ConfigFile = toml::from_str(&serialized).unwrap();
        assert_eq!(config_file, deserialized);
    }

    /// test that specifying a non-default value for one field still allows the other fields to
    /// take their default values.
    #[test]
    fn test_config_file_mixed_defaults() {
        let original = "chain_id = 999";
        let deserialized: ConfigFile = toml::from_str(original).unwrap();
        assert_eq!(deserialized.chain_id, Number::U64(999));
        assert_eq!(
            deserialized.block_gas_limit,
            Number::U256(U256::from(30_000_000))
        );
    }
}
