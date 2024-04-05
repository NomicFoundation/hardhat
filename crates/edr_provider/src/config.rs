use std::{num::NonZeroU64, path::PathBuf, time::SystemTime};

use edr_eth::{
    block::BlobGas, spec::HardforkActivations, AccountInfo, Address, HashMap, SpecId, B256, U256,
};
use edr_evm::{alloy_primitives::ChainId, MineOrdering};
use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::requests::{hardhat::rpc_types::ForkConfig, IntervalConfig as IntervalConfigRequest};

/// Configuration for interval mining.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum IntervalConfig {
    Fixed(NonZeroU64),
    Range { min: u64, max: u64 },
}

impl IntervalConfig {
    /// Generates a (random) interval based on the configuration.
    pub fn generate_interval(&self) -> u64 {
        match self {
            IntervalConfig::Fixed(interval) => interval.get(),
            IntervalConfig::Range { min, max } => rand::thread_rng().gen_range(*min..=*max),
        }
    }
}

/// An error that occurs when trying to convert [`IntervalConfigRequest`] to an
/// `Option<IntervalConfig>`.
#[derive(Debug, thiserror::Error)]
pub enum IntervalConfigConversionError {
    /// The minimum value in the range is greater than the maximum value.
    #[error("Minimum value in range is greater than maximum value")]
    MinGreaterThanMax,
}

impl TryInto<Option<IntervalConfig>> for IntervalConfigRequest {
    type Error = IntervalConfigConversionError;

    fn try_into(self) -> Result<Option<IntervalConfig>, Self::Error> {
        match self {
            Self::FixedOrDisabled(0) => Ok(None),
            Self::FixedOrDisabled(value) => {
                // Zero implies disabled
                Ok(NonZeroU64::new(value).map(IntervalConfig::Fixed))
            }
            Self::Range([min, max]) => {
                if max >= min {
                    Ok(Some(IntervalConfig::Range { min, max }))
                } else {
                    Err(IntervalConfigConversionError::MinGreaterThanMax)
                }
            }
        }
    }
}

/// Configuration for the provider's mempool.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct MemPoolConfig {
    pub order: MineOrdering,
}

/// Configuration for the provider's miner.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MiningConfig {
    pub auto_mine: bool,
    pub interval: Option<IntervalConfig>,
    pub mem_pool: MemPoolConfig,
}

/// Configuration for the provider
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProviderConfig {
    pub allow_blocks_with_same_timestamp: bool,
    pub allow_unlimited_contract_size: bool,
    pub accounts: Vec<AccountConfig>,
    /// Whether to return an `Err` when `eth_call` fails
    pub bail_on_call_failure: bool,
    /// Whether to return an `Err` when a `eth_sendTransaction` fails
    pub bail_on_transaction_failure: bool,
    pub block_gas_limit: NonZeroU64,
    pub cache_dir: PathBuf,
    pub chain_id: ChainId,
    pub chains: HashMap<ChainId, HardforkActivations>,
    pub coinbase: Address,
    pub fork: Option<ForkConfig>,
    // Genesis accounts in addition to accounts. Useful for adding impersonated accounts for tests.
    pub genesis_accounts: HashMap<Address, AccountInfo>,
    pub hardfork: SpecId,
    pub initial_base_fee_per_gas: Option<U256>,
    pub initial_blob_gas: Option<BlobGas>,
    pub initial_date: Option<SystemTime>,
    pub initial_parent_beacon_block_root: Option<B256>,
    pub min_gas_price: U256,
    pub mining: MiningConfig,
    pub network_id: u64,
}

/// Configuration input for a single account
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AccountConfig {
    /// the secret key of the account
    #[serde(with = "secret_key_serde")]
    pub secret_key: k256::SecretKey,
    /// the balance of the account
    pub balance: U256,
}

mod secret_key_serde {
    use edr_eth::signature::{secret_key_from_str, secret_key_to_str};
    use serde::Deserialize;

    pub(super) fn serialize<S>(
        secret_key: &k256::SecretKey,
        serializer: S,
    ) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&secret_key_to_str(secret_key))
    }

    pub(super) fn deserialize<'de, D>(deserializer: D) -> Result<k256::SecretKey, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = <&str as Deserialize>::deserialize(deserializer)?;
        secret_key_from_str(s).map_err(serde::de::Error::custom)
    }
}

impl Default for MemPoolConfig {
    fn default() -> Self {
        Self {
            order: MineOrdering::Priority,
        }
    }
}

impl Default for MiningConfig {
    fn default() -> Self {
        Self {
            auto_mine: true,
            interval: None,
            mem_pool: MemPoolConfig::default(),
        }
    }
}
