use std::time::Duration;

/// The default depth of blocks to consider safe from a reorg and thus
/// cacheable.
const DEFAULT_SAFE_BLOCK_DEPTH: u64 = 128;

/// The default delay between blocks. Should be the lowest possible to stay on
/// the safe side.
const DEFAULT_SAFE_BLOCK_TIME: Duration = Duration::from_secs(1);

/// Test whether a block number is safe from a reorg for a specific chain based
/// on the latest block number.
pub fn is_safe_block_number(args: IsSafeBlockNumberArgs) -> bool {
    let safe_block_number = largest_safe_block_number((&args).into());
    args.block_number <= safe_block_number
}

/// Arguments for the `is_safe_block_number` function.
/// The purpose of this struct is to prevent mixing up the U256 arguments.
pub struct IsSafeBlockNumberArgs {
    /// The chain id
    pub chain_id: u64,
    /// The latest known block number
    pub latest_block_number: u64,
    /// The block number to test
    pub block_number: u64,
}

impl<'a> From<&'a IsSafeBlockNumberArgs> for LargestSafeBlockNumberArgs {
    fn from(value: &'a IsSafeBlockNumberArgs) -> LargestSafeBlockNumberArgs {
        LargestSafeBlockNumberArgs {
            chain_id: value.chain_id,
            latest_block_number: value.latest_block_number,
        }
    }
}

/// The largest block number that is safe from a reorg for a specific chain
/// based on the latest block number.
pub fn largest_safe_block_number(args: LargestSafeBlockNumberArgs) -> u64 {
    args.latest_block_number
        .saturating_sub(safe_block_depth(args.chain_id))
}

/// Arguments for the `largest_safe_block_number` function.
/// The purpose of this struct is to prevent mixing up the U256 arguments.
pub struct LargestSafeBlockNumberArgs {
    /// The chain id
    pub chain_id: u64,
    /// The latest known block number
    pub latest_block_number: u64,
}

/// The safe block depth for a specific chain.
///
/// The custom numbers were taken from:
/// <https://github.com/NomicFoundation/hardhat/blob/caa504fe0e53c183578f42d66f4740b8ec147051/packages/hardhat-core/src/internal/hardhat-network/provider/utils/reorgs-protection.ts>
pub fn safe_block_depth(chain_id: u64) -> u64 {
    match chain_id {
        // Ethereum mainnet, Rinkeby, Goerli and Kovan testnets
        // 32 blocks is one epoch on Ethereum mainnet
        1 | 4 | 5 | 42 => 32,
        // Ropsten
        3 => 100,
        // Gnosis/xDai
        100 => 38,
        _ => {
            log::warn!(
                "Unknown chain id {chain_id}, using default safe block depth of {}",
                DEFAULT_SAFE_BLOCK_DEPTH,
            );
            DEFAULT_SAFE_BLOCK_DEPTH
        }
    }
}

/// The interval between blocks for a specific chain.
pub fn block_time(chain_id: u64) -> Duration {
    match chain_id {
        // Ethereum mainnet, Ropsten, Rinkeby, Goerli and Kovan testnets
        // 32 blocks is one epoch on Ethereum mainnet
        1 | 3 | 4 | 5 | 42 => Duration::from_secs(12),
        // Gnosis/xDai
        // https://gnosisscan.io/chart/blocktime
        100 => Duration::from_secs(5),
        _ => {
            log::warn!(
                "Unknown chain id {chain_id}, using default block time of {} seconds",
                DEFAULT_SAFE_BLOCK_TIME.as_secs(),
            );
            DEFAULT_SAFE_BLOCK_TIME
        }
    }
}
