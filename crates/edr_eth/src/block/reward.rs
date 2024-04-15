use revm_primitives::SpecId;

use crate::U256;

/// Retrieves the miner reward for the provided hardfork.
pub fn miner_reward(spec_id: SpecId) -> Option<U256> {
    match spec_id {
        SpecId::FRONTIER
        | SpecId::FRONTIER_THAWING
        | SpecId::HOMESTEAD
        | SpecId::DAO_FORK
        | SpecId::TANGERINE
        | SpecId::SPURIOUS_DRAGON => Some(U256::from(5_000_000_000_000_000_000u128)),
        SpecId::BYZANTIUM => Some(U256::from(3_000_000_000_000_000_000u128)),
        SpecId::CONSTANTINOPLE
        | SpecId::PETERSBURG
        | SpecId::ISTANBUL
        | SpecId::MUIR_GLACIER
        | SpecId::BERLIN
        | SpecId::LONDON
        | SpecId::ARROW_GLACIER
        | SpecId::GRAY_GLACIER => Some(U256::from(2_000_000_000_000_000_000u128)),
        SpecId::MERGE | SpecId::SHANGHAI | SpecId::CANCUN | SpecId::LATEST => None,
    }
}
