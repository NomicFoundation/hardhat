use rethnet_eth::{block::Header, trie::KECCAK_RLP_EMPTY_ARRAY, U256};
use revm::primitives::SpecId;

fn bomb_delay(spec_id: SpecId) -> U256 {
    U256::from(match spec_id {
        SpecId::FRONTIER
        | SpecId::FRONTIER_THAWING
        | SpecId::HOMESTEAD
        | SpecId::DAO_FORK
        | SpecId::TANGERINE
        | SpecId::SPURIOUS_DRAGON => 0,
        SpecId::BYZANTIUM => 3000000,
        SpecId::CONSTANTINOPLE | SpecId::PETERSBURG | SpecId::ISTANBUL => 5000000,
        SpecId::MUIR_GLACIER
        | SpecId::BERLIN
        | SpecId::LONDON
        | SpecId::ARROW_GLACIER
        | SpecId::GRAY_GLACIER => 9000000,
        SpecId::MERGE | SpecId::SHANGHAI | SpecId::CANCUN | SpecId::LATEST => {
            unreachable!("Post-merge hardforks don't have a bomb delay")
        }
    })
}

pub fn calculate_ethash_canonical_difficulty(
    spec_id: SpecId,
    parent: &Header,
    block_number: &U256,
    block_timestamp: &U256,
) -> U256 {
    // TODO: Create a custom config that prevents usage of older hardforks
    if spec_id < SpecId::BYZANTIUM {
        panic!("Hardforks older than Byzantium are not supported");
    }

    let bound_divisor = U256::from(2048);
    let offset = parent.difficulty / bound_divisor;

    let mut diff = {
        let uncle_addend = U256::from(if parent.ommers_hash == KECCAK_RLP_EMPTY_ARRAY {
            1
        } else {
            2
        });
        let a = (block_timestamp - parent.timestamp) / U256::from(9);

        if let Some(a) = a.checked_sub(uncle_addend) {
            let a = a.min(U256::from(99));

            parent.difficulty - a * offset
        } else {
            let a = uncle_addend - a;
            parent.difficulty + a * offset
        }
    };

    if let Some(exp) = block_number
        .checked_sub(bomb_delay(spec_id))
        .and_then(|num| (num / U256::from(100000)).checked_sub(U256::from(2)))
    {
        diff += U256::from(2).pow(exp);
    }

    let min_difficulty = U256::from(131072);
    diff.max(min_difficulty)
}
