use std::{str::FromStr, time::SystemTime};

use hex;
use serde::{Deserialize, Serialize};

use rethnet_eth::{remote::ZeroXPrefixedBytes, Address, Bytes, SpecId, U256};

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
pub struct ConfigFile {
    // TODO: expand this per https://github.com/NomicFoundation/rethnet/issues/111
    pub allow_blocks_with_same_timestamp: Option<bool>,
    pub accounts: Option<Vec<AccountConfig>>,
    pub block_gas_limit: Option<U256>,
    pub chain_id: Option<u64>,
    pub coinbase: Option<Address>,
    pub gas: Option<U256>,
    pub initial_base_fee_per_gas: Option<U256>,
    pub initial_date: Option<SystemTime>,
    pub hardfork: Option<SpecId>,
    pub network_id: Option<u64>,
}

impl ConfigFile {
    pub fn resolve_none_values_to_defaults(partial: Self) -> Self {
        let default = Self::default();
        Self {
            allow_blocks_with_same_timestamp: Some(
                partial.allow_blocks_with_same_timestamp.unwrap_or(
                    default
                        .allow_blocks_with_same_timestamp
                        .expect("should have a default value"),
                ),
            ),
            accounts: Some(
                partial
                    .accounts
                    .unwrap_or(default.accounts.expect("should have a default value")),
            ),
            block_gas_limit: Some(
                partial.block_gas_limit.unwrap_or(
                    default
                        .block_gas_limit
                        .expect("should have a default value"),
                ),
            ),
            chain_id: Some(
                partial
                    .chain_id
                    .unwrap_or(default.chain_id.expect("should have a default value")),
            ),
            coinbase: Some(
                partial
                    .coinbase
                    .unwrap_or(default.coinbase.expect("should have a default value")),
            ),
            gas: Some(
                partial
                    .gas
                    .unwrap_or(default.gas.expect("should have a default value")),
            ),
            hardfork: Some(
                partial
                    .hardfork
                    .unwrap_or(default.hardfork.expect("should have a default value")),
            ),
            initial_base_fee_per_gas: Some(
                partial.initial_base_fee_per_gas.unwrap_or(
                    default
                        .initial_base_fee_per_gas
                        .expect("should have a default value"),
                ),
            ),
            initial_date: partial.initial_date.or(default.initial_date),
            network_id: Some(
                partial
                    .network_id
                    .unwrap_or(default.network_id.expect("should have a default value")),
            ),
        }
    }
}

impl Default for ConfigFile {
    fn default() -> Self {
        // default values taken from https://hardhat.org/hardhat-network/docs/reference
        let block_gas_limit = Some(U256::from(30_000_000));
        let chain_id = Some(31337);
        Self {
            allow_blocks_with_same_timestamp: Some(false),
            accounts: Some(
                DEFAULT_PRIVATE_KEYS
                    .into_iter()
                    .map(|s| AccountConfig {
                        private_key: Bytes::from_iter(
                            hex::decode(s)
                                .expect("should decode all default private keys from strings"),
                        )
                        .into(),
                        balance: U256::from(10000),
                    })
                    .collect(),
            ),
            block_gas_limit,
            chain_id,
            coinbase: Some(
                Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e")
                    .expect("default value should be known to succeed"),
            ),
            gas: block_gas_limit,
            hardfork: Some(SpecId::LATEST),
            initial_base_fee_per_gas: Some(U256::from(1000000000)),
            initial_date: None,
            network_id: chain_id,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub struct AccountConfig {
    pub private_key: ZeroXPrefixedBytes,
    pub balance: U256,
}

#[cfg(test)]
mod tests {
    use super::*;

    use toml;

    #[test]
    fn test_config_file_serde() {
        let config_file = ConfigFile::default();
        let serialized = toml::to_string(&config_file).unwrap();
        let deserialized = toml::from_str(&serialized).unwrap();
        assert_eq!(config_file, deserialized);
    }
}
