use crate::U256;
use std::time::Duration;

/// Test whether a block number is safe from a reorg for a specific chain based on the latest block
/// number.
pub fn is_safe_block_number(args: IsSafeBlockNumberArgs<'_>) -> bool {
    let safe_block_number = largest_safe_block_number((&args).into());
    args.block_number <= &safe_block_number
}

/// Arguments for the `is_safe_block_number` function.
/// The purpose of this struct is to prevent mixing up the U256 arguments.
pub struct IsSafeBlockNumberArgs<'a> {
    /// The chain id
    pub chain_id: &'a U256,
    /// The latest known block number
    pub latest_block_number: &'a U256,
    /// The block number to test
    pub block_number: &'a U256,
}

impl<'a> From<&'a IsSafeBlockNumberArgs<'a>> for LargestSafeBlockNumberArgs<'a> {
    fn from(value: &'a IsSafeBlockNumberArgs<'a>) -> LargestSafeBlockNumberArgs<'a> {
        LargestSafeBlockNumberArgs {
            chain_id: value.chain_id,
            latest_block_number: value.latest_block_number,
        }
    }
}

/// The largest block number that is safe from a reorg for a specific chain based on the latest
/// block number.
pub fn largest_safe_block_number(args: LargestSafeBlockNumberArgs<'_>) -> U256 {
    args.latest_block_number
        .saturating_sub(safe_block_depth(args.chain_id))
}

/// Arguments for the `largest_safe_block_number` function.
/// The purpose of this struct is to prevent mixing up the U256 arguments.
pub struct LargestSafeBlockNumberArgs<'a> {
    /// The chain id
    pub chain_id: &'a U256,
    /// The latest known block number
    pub latest_block_number: &'a U256,
}

/// The safe block depth for a specific chain.
///
/// The custom numbers were taken from:
/// <https://github.com/NomicFoundation/hardhat/blob/caa504fe0e53c183578f42d66f4740b8ec147051/packages/hardhat-core/src/internal/hardhat-network/provider/utils/reorgs-protection.ts>
pub fn safe_block_depth(chain_id: &U256) -> U256 {
    let chain_id: u64 = chain_id.try_into().expect("invalid chain id");
    let threshold: u64 = match chain_id {
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
                rethnet_defaults::DEFAULT_SAFE_BLOCK_DEPTH,
            );
            rethnet_defaults::DEFAULT_SAFE_BLOCK_DEPTH
        }
    };
    U256::from(threshold)
}

/// The interval between blocks for a specific chain.
pub fn block_time(chain_id: &U256) -> Duration {
    let chain_id: u64 = chain_id.try_into().expect("invalid chain id");
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
                rethnet_defaults::DEFAULT_SAFE_BLOCK_TIME.as_secs(),
            );
            rethnet_defaults::DEFAULT_SAFE_BLOCK_TIME
        }
    }
}
