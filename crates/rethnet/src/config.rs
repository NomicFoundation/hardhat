use std::net::SocketAddr;
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

/// the default private keys from which the local accounts will be derived.
pub const DEFAULT_PRIVATE_KEYS: [&str; 20] = [
    // these were taken from the standard output of a run of `hardhat node`
    "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
    "f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
    "701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
    "a267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
    "47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
    "c526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
    "8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
    "ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
    "689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
    "de9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
    "df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

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
            accounts: DEFAULT_PRIVATE_KEYS
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
