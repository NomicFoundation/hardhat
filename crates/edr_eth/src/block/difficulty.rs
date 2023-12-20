use crate::{block::Header, trie::KECCAK_RLP_EMPTY_ARRAY, SpecId, U256};

fn bomb_delay(spec_id: SpecId) -> u64 {
    match spec_id {
        SpecId::FRONTIER
        | SpecId::FRONTIER_THAWING
        | SpecId::HOMESTEAD
        | SpecId::DAO_FORK
        | SpecId::TANGERINE
        | SpecId::SPURIOUS_DRAGON => 0,
        SpecId::BYZANTIUM => 3000000,
        SpecId::CONSTANTINOPLE | SpecId::PETERSBURG | SpecId::ISTANBUL => 5000000,
        SpecId::MUIR_GLACIER | SpecId::BERLIN | SpecId::LONDON => 9000000,
        // SpecId::LONDON => 9500000, // EIP-3554
        SpecId::ARROW_GLACIER => 10700000,
        SpecId::GRAY_GLACIER => 11400000,
        SpecId::MERGE | SpecId::SHANGHAI | SpecId::CANCUN | SpecId::LATEST => {
            unreachable!("Post-merge hardforks don't have a bomb delay")
        }
    }
}

/// Calculates the mining difficulty of a block.
pub fn calculate_ethash_canonical_difficulty(
    spec_id: SpecId,
    parent: &Header,
    block_number: u64,
    block_timestamp: u64,
) -> U256 {
    // TODO: Create a custom config that prevents usage of older hardforks
    assert!(
        spec_id >= SpecId::BYZANTIUM,
        "Hardforks older than Byzantium are not supported"
    );

    let bound_divisor = U256::from(2048);
    let offset = parent.difficulty / bound_divisor;

    let mut difficulty = {
        let uncle_addend = if parent.ommers_hash == KECCAK_RLP_EMPTY_ARRAY {
            1
        } else {
            2
        };
        let a = (block_timestamp - parent.timestamp) / 9;

        if let Some(a) = a.checked_sub(uncle_addend) {
            let a = U256::from(a.min(99));

            parent.difficulty - a * offset
        } else {
            let a = U256::from(uncle_addend - a);
            parent.difficulty + a * offset
        }
    };

    if let Some(exp) = block_number
        .checked_sub(bomb_delay(spec_id))
        .and_then(|num| (num / 100000).checked_sub(2))
    {
        difficulty += U256::from(2u64).pow(U256::from(exp));
    }

    let min_difficulty = U256::from(131072);
    difficulty.max(min_difficulty)
}
