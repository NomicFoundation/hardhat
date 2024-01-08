use std::{path::PathBuf, time::SystemTime};

use edr_eth::{block::BlobGas, AccountInfo, Address, HashMap, SpecId, B256, U256};
use edr_evm::MineOrdering;
use rand::Rng;

use crate::{requests::hardhat::rpc_types::ForkConfig, OneUsizeOrTwo};

/// Configuration for interval mining.
#[derive(Debug, Clone)]
pub enum IntervalConfig {
    Fixed(u64),
    Range { min: u64, max: u64 },
}

impl IntervalConfig {
    /// Generates a (random) interval based on the configuration.
    pub fn generate_interval(&self) -> u64 {
        match self {
            IntervalConfig::Fixed(interval) => *interval,
            IntervalConfig::Range { min, max } => rand::thread_rng().gen_range(*min..=*max),
        }
    }
}

impl From<OneUsizeOrTwo> for IntervalConfig {
    fn from(value: OneUsizeOrTwo) -> Self {
        match value {
            OneUsizeOrTwo::One(value) => Self::Fixed(value as u64),
            OneUsizeOrTwo::Two([min, max]) => Self::Range {
                min: min as u64,
                max: max as u64,
            },
        }
    }
}

/// Configuration for the provider's mempool.
#[derive(Debug, Clone)]
pub struct MemPoolConfig {
    pub order: MineOrdering,
}

/// Configuration for the provider's miner.
#[derive(Debug, Clone)]
pub struct MiningConfig {
    pub auto_mine: bool,
    pub interval: Option<IntervalConfig>,
    pub mem_pool: MemPoolConfig,
}

/// Configuration for the provider
#[derive(Debug, Clone)]
pub struct ProviderConfig {
    pub allow_blocks_with_same_timestamp: bool,
    pub allow_unlimited_contract_size: bool,
    pub accounts: Vec<AccountConfig>,
    /// Whether to return an `Err` when `eth_call` fails
    pub bail_on_call_failure: bool,
    /// Whether to return an `Err` when a `eth_sendTransaction` fails
    pub bail_on_transaction_failure: bool,
    pub block_gas_limit: u64,
    pub cache_dir: PathBuf,
    pub chain_id: u64,
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
#[derive(Debug, Clone)]
pub struct AccountConfig {
    /// the secret key of the account
    pub secret_key: k256::SecretKey,
    /// the balance of the account
    pub balance: U256,
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
