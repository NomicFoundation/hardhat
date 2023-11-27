use std::{
    path::PathBuf,
    time::{Duration, SystemTime},
};

use edr_eth::{Address, HashMap};
use edr_provider::AccountConfig;
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Either,
};
use napi_derive::napi;

use crate::{
    account::GenesisAccount, block::BlobGas, cast::TryCast, config::SpecId, miner::MineOrdering,
};

/// Configuration for forking a blockchain
#[napi(object)]
pub struct ForkConfig {
    /// The URL of the JSON-RPC endpoint to fork from
    pub json_rpc_url: String,
    /// The block number to fork from. If not provided, the latest safe block is
    /// used.
    pub block_number: Option<BigInt>,
    // TODO: add http_headers,
}

/// Configuration for the provider's mempool.
#[napi(object)]
pub struct MemPoolConfig {
    pub order: MineOrdering,
}

#[napi(object)]
pub struct IntervalRange {
    pub min: i64,
    pub max: i64,
}

/// Configuration for the provider's miner.
#[napi(object)]
pub struct MiningConfig {
    pub auto_mine: bool,
    pub interval: Either<i64, IntervalRange>,
    pub mem_pool: MemPoolConfig,
}

/// Configuration for a provider
#[napi(object)]
pub struct ProviderConfig {
    /// Whether to allow blocks with the same timestamp
    pub allow_blocks_with_same_timestamp: bool,
    /// Whether to allow unlimited contract size
    pub allow_unlimited_contract_size: bool,
    /// The gas limit of each block
    pub block_gas_limit: BigInt,
    /// The directory to cache remote JSON-RPC responses
    pub cache_dir: Option<String>,
    /// The chain ID of the blockchain
    pub chain_id: BigInt,
    /// The address of the coinbase
    pub coinbase: Buffer,
    /// The configuration for forking a blockchain. If not provided, a local
    /// blockchain will be created
    pub fork: Option<ForkConfig>,
    /// The genesis accounts of the blockchain
    pub genesis_accounts: Vec<GenesisAccount>,
    /// The hardfork of the blockchain
    pub hardfork: SpecId,
    /// The initial base fee per gas of the blockchain. Required for EIP-1559
    /// transactions and later
    pub initial_base_fee_per_gas: Option<BigInt>,
    /// The initial blob gas of the blockchain. Required for EIP-4844
    pub initial_blob_gas: Option<BlobGas>,
    /// The initial date of the blockchain, in seconds since the Unix epoch
    pub initial_date: Option<BigInt>,
    /// The initial parent beacon block root of the blockchain. Required for
    /// EIP-4788
    pub initial_parent_beacon_block_root: Option<Buffer>,
    /// The configuration for the miner
    pub mining: MiningConfig,
    /// The network ID of the blockchain
    pub network_id: BigInt,
}

impl TryFrom<ForkConfig> for edr_rpc_hardhat::config::ForkConfig {
    type Error = napi::Error;

    fn try_from(value: ForkConfig) -> Result<Self, Self::Error> {
        let block_number: Option<u64> = value.block_number.map(TryCast::try_cast).transpose()?;

        Ok(Self {
            json_rpc_url: value.json_rpc_url,
            block_number,
            http_headers: None,
        })
    }
}

impl From<MemPoolConfig> for edr_provider::MemPoolConfig {
    fn from(value: MemPoolConfig) -> Self {
        Self {
            order: value.order.into(),
        }
    }
}

impl From<MiningConfig> for edr_provider::MiningConfig {
    fn from(value: MiningConfig) -> Self {
        let mem_pool = value.mem_pool.into();

        let interval = match value.interval {
            Either::A(interval) => edr_provider::IntervalConfig::Fixed(interval),
            Either::B(IntervalRange { min, max }) => {
                edr_provider::IntervalConfig::Range { min, max }
            }
        };

        Self {
            auto_mine: value.auto_mine,
            interval,
            mem_pool,
        }
    }
}

impl TryFrom<ProviderConfig> for edr_provider::ProviderConfig {
    type Error = napi::Error;

    fn try_from(value: ProviderConfig) -> Result<Self, Self::Error> {
        Ok(Self {
            accounts: value
                .genesis_accounts
                .into_iter()
                .map(AccountConfig::try_from)
                .collect::<napi::Result<Vec<_>>>()?,
            allow_blocks_with_same_timestamp: value.allow_blocks_with_same_timestamp,
            allow_unlimited_contract_size: value.allow_unlimited_contract_size,
            block_gas_limit: value.block_gas_limit.try_cast()?,
            cache_dir: PathBuf::from(
                value
                    .cache_dir
                    .unwrap_or(String::from(edr_defaults::CACHE_DIR)),
            ),
            chain_id: value.chain_id.try_cast()?,
            coinbase: Address::from_slice(value.coinbase.as_ref()),
            fork: value.fork.map(TryInto::try_into).transpose()?,
            genesis_accounts: HashMap::new(),
            hardfork: value.hardfork.try_into()?,
            initial_base_fee_per_gas: value
                .initial_base_fee_per_gas
                .map(TryCast::try_cast)
                .transpose()?,
            initial_blob_gas: value.initial_blob_gas.map(TryInto::try_into).transpose()?,
            initial_date: value
                .initial_date
                .map(|date| {
                    let elapsed_since_epoch = Duration::from_secs(date.try_cast()?);
                    napi::Result::Ok(SystemTime::UNIX_EPOCH + elapsed_since_epoch)
                })
                .transpose()?,
            initial_parent_beacon_block_root: value
                .initial_parent_beacon_block_root
                .map(TryCast::try_cast)
                .transpose()?,
            mining: value.mining.into(),
            network_id: value.network_id.try_cast()?,
        })
    }
}
