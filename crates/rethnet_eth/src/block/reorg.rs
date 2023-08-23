use crate::U256;

/// The largest block number that is safe from a reorg for a specific chain based on the latest
/// block number.
pub fn largest_safe_block_number(chain_id: &U256, latest_block_number: &U256) -> U256 {
    latest_block_number.saturating_sub(largest_possible_reorg(chain_id))
}

/// Retrieves the largest possible size of a reorg, i.e. ensures a "safe" block.
///
/// # Source
///
/// These numbers were taken from:
/// <https://github.com/NomicFoundation/hardhat/blob/caa504fe0e53c183578f42d66f4740b8ec147051/packages/hardhat-core/src/internal/hardhat-network/provider/utils/reorgs-protection.ts>
pub fn largest_possible_reorg(chain_id: &U256) -> U256 {
    let chain_id: u64 = chain_id.try_into().expect("invalid chain id");
    let threshold: u64 = match chain_id {
        // mainnet
        1 => 5,
        // Ropsten
        3 => 100,
        // Rinkeby
        4 => 5,
        // Goerli
        5 => 5,
        // Kovan
        42 => 5,
        // xDai
        100 => 38,
        _ => 30,
    };
    U256::from(threshold)
}
