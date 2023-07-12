use std::sync::OnceLock;

use hashbrown::HashMap;
use primitive_types::U256;
use revm_primitives::SpecId;

struct ChainConfig {
    /// Chain name
    pub name: String,
    /// (Start block number -> SpecId) mapping
    pub hardforks: Vec<(U256, SpecId)>,
}

const MAINNET_HARDFORKS: &[(u64, SpecId)] = &[
    (0, SpecId::FRONTIER),
    (200_000, SpecId::FRONTIER_THAWING),
    (1_150_000, SpecId::HOMESTEAD),
    (1_920_000, SpecId::DAO_FORK),
    (2_463_000, SpecId::TANGERINE),
    (2_675_000, SpecId::SPURIOUS_DRAGON),
    (4_370_000, SpecId::BYZANTIUM),
    (7_280_000, SpecId::PETERSBURG),
    (9_069_000, SpecId::ISTANBUL),
    (9_200_000, SpecId::MUIR_GLACIER),
    (12_244_000, SpecId::BERLIN),
    (12_965_000, SpecId::LONDON),
    (13_773_000, SpecId::ARROW_GLACIER),
    (15_050_000, SpecId::GRAY_GLACIER),
    (15_537_394, SpecId::MERGE),
    (17_034_870, SpecId::SHANGHAI),
];

fn mainnet_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardforks = MAINNET_HARDFORKS
            .iter()
            .map(|(block_number, spec_id)| (U256::from(*block_number), *spec_id))
            .collect();

        ChainConfig {
            name: "mainnet".to_string(),
            hardforks,
        }
    })
}

const ROPSTEN_HARDFORKS: &[(u64, SpecId)] = &[
    (1_700_000, SpecId::BYZANTIUM),
    (4_230_000, SpecId::CONSTANTINOPLE),
    (4_939_394, SpecId::PETERSBURG),
    (6_485_846, SpecId::ISTANBUL),
    (7_117_117, SpecId::MUIR_GLACIER),
    (9_812_189, SpecId::BERLIN),
    (10_499_401, SpecId::LONDON),
];

fn ropsten_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardforks = ROPSTEN_HARDFORKS
            .iter()
            .map(|(block_number, spec_id)| (U256::from(*block_number), *spec_id))
            .collect();

        ChainConfig {
            name: "ropsten".to_string(),
            hardforks,
        }
    })
}

const RINKEBY_HARDFORKS: &[(u64, SpecId)] = &[
    (1_035_301, SpecId::BYZANTIUM),
    (3_660_663, SpecId::CONSTANTINOPLE),
    (4_321_234, SpecId::PETERSBURG),
    (5_435_345, SpecId::ISTANBUL),
    (8_290_928, SpecId::BERLIN),
    (8_897_988, SpecId::LONDON),
];

fn rinkeby_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardforks = RINKEBY_HARDFORKS
            .iter()
            .map(|(block_number, spec_id)| (U256::from(*block_number), *spec_id))
            .collect();

        ChainConfig {
            name: "rinkeby".to_string(),
            hardforks,
        }
    })
}

const GOERLI_HARDFORKS: &[(u64, SpecId)] = &[
    (1_561_651, SpecId::ISTANBUL),
    (4_460_644, SpecId::BERLIN),
    (5_062_605, SpecId::LONDON),
];

fn goerli_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardforks = GOERLI_HARDFORKS
            .iter()
            .map(|(block_number, spec_id)| (U256::from(*block_number), *spec_id))
            .collect();

        ChainConfig {
            name: "goerli".to_string(),
            hardforks,
        }
    })
}

const KOVAN_HARDFORKS: &[(u64, SpecId)] = &[
    (5_067_000, SpecId::BYZANTIUM),
    (9_200_000, SpecId::CONSTANTINOPLE),
    (10_255_201, SpecId::PETERSBURG),
    (14_111_141, SpecId::ISTANBUL),
    (24_770_900, SpecId::BERLIN),
    (26_741_100, SpecId::LONDON),
];

fn kovan_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardforks = KOVAN_HARDFORKS
            .iter()
            .map(|(block_number, spec_id)| (U256::from(*block_number), *spec_id))
            .collect();

        ChainConfig {
            name: "kovan".to_string(),
            hardforks,
        }
    })
}

fn chain_configs() -> &'static HashMap<U256, &'static ChainConfig> {
    static CONFIGS: OnceLock<HashMap<U256, &'static ChainConfig>> = OnceLock::new();

    CONFIGS.get_or_init(|| {
        let mut hardforks = HashMap::new();
        hardforks.insert(U256::from(1), mainnet_config());
        hardforks.insert(U256::from(3), ropsten_config());
        hardforks.insert(U256::from(4), rinkeby_config());
        hardforks.insert(U256::from(5), goerli_config());
        hardforks.insert(U256::from(42), kovan_config());

        hardforks
    })
}

/// Returns the `SpecId` corresponding to the provided chain ID and block number, if the chain ID is supported.
pub fn determine_hardfork(chain_id: &U256, block_number: &U256) -> Option<SpecId> {
    chain_configs().get(chain_id).map(|config| {
        config
            .hardforks
            .iter()
            .rev()
            .find(|(hardfork_number, _)| *block_number >= *hardfork_number)
            .map(|entry| entry.1)
            .expect("At least one entry must've been found")
    })
}

/// Returns the name corresponding to the provided chain ID, if it is supported.
pub fn chain_name(chain_id: &U256) -> Option<&'static str> {
    chain_configs()
        .get(chain_id)
        .map(|config| config.name.as_str())
}
