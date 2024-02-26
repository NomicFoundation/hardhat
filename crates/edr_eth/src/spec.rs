use std::sync::OnceLock;

use crate::{HashMap, SpecId};

/// A struct that stores the hardforks for a chain.
#[derive(Clone, Debug)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct HardforkActivations {
    /// (Start block number -> SpecId) mapping
    hardforks: Vec<(u64, SpecId)>,
}

impl HardforkActivations {
    /// Constructs a new instance with the provided hardforks.
    pub fn new(hardforks: Vec<(u64, SpecId)>) -> Self {
        Self { hardforks }
    }

    /// Creates a new instance for a new chain with the provided [`SpecId`].
    pub fn with_spec_id(spec_id: SpecId) -> Self {
        Self {
            hardforks: vec![(0, spec_id)],
        }
    }

    /// Whether no hardforks activations are present.
    pub fn is_empty(&self) -> bool {
        self.hardforks.is_empty()
    }

    /// Returns the hardfork's `SpecId` corresponding to the provided block
    /// number.
    pub fn hardfork_at_block_number(&self, block_number: u64) -> Option<SpecId> {
        self.hardforks
            .iter()
            .rev()
            .find(|(hardfork_number, _)| block_number >= *hardfork_number)
            .map(|entry| entry.1)
    }

    /// Retrieves the block number at which the provided hardfork was activated.
    pub fn hardfork_activation(&self, spec_id: SpecId) -> Option<u64> {
        self.hardforks
            .iter()
            .find(|(_, id)| *id == spec_id)
            .map(|(block, _)| *block)
    }
}

impl From<&[(u64, SpecId)]> for HardforkActivations {
    fn from(hardforks: &[(u64, SpecId)]) -> Self {
        Self {
            hardforks: hardforks.to_vec(),
        }
    }
}

struct ChainConfig {
    /// Chain name
    pub name: String,
    /// Hardfork activations for the chain
    pub hardfork_activations: HardforkActivations,
}

const MAINNET_HARDFORKS: &[(u64, SpecId)] = &[
    (0, SpecId::FRONTIER),
    (200_000, SpecId::FRONTIER_THAWING),
    (1_150_000, SpecId::HOMESTEAD),
    (1_920_000, SpecId::DAO_FORK),
    (2_463_000, SpecId::TANGERINE),
    (2_675_000, SpecId::SPURIOUS_DRAGON),
    (4_370_000, SpecId::BYZANTIUM),
    (7_280_000, SpecId::CONSTANTINOPLE),
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
        let hardfork_activations = MAINNET_HARDFORKS.into();

        ChainConfig {
            name: "mainnet".to_string(),
            hardfork_activations,
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
        let hardfork_activations = ROPSTEN_HARDFORKS.into();

        ChainConfig {
            name: "ropsten".to_string(),
            hardfork_activations,
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
        let hardfork_activations = RINKEBY_HARDFORKS.into();

        ChainConfig {
            name: "rinkeby".to_string(),
            hardfork_activations,
        }
    })
}

const GOERLI_HARDFORKS: &[(u64, SpecId)] = &[
    (0, SpecId::PETERSBURG),
    (1_561_651, SpecId::ISTANBUL),
    (4_460_644, SpecId::BERLIN),
    (5_062_605, SpecId::LONDON),
    (7_382_818, SpecId::MERGE),
    (8_656_123, SpecId::SHANGHAI),
    (10_388_176, SpecId::CANCUN),
];

fn goerli_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardfork_activations = GOERLI_HARDFORKS.into();

        ChainConfig {
            name: "goerli".to_string(),
            hardfork_activations,
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
        let hardfork_activations = KOVAN_HARDFORKS.into();

        ChainConfig {
            name: "kovan".to_string(),
            hardfork_activations,
        }
    })
}

const HOLESKY_HARDFORKS: &[(u64, SpecId)] = &[
    (0, SpecId::MERGE),
    (6_698, SpecId::SHANGHAI),
    (894_733, SpecId::CANCUN),
];

fn holesky_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardfork_activations = HOLESKY_HARDFORKS.into();

        ChainConfig {
            name: "holesky".to_string(),
            hardfork_activations,
        }
    })
}

const SEPOLIA_HARDFORKS: &[(u64, SpecId)] = &[
    (0, SpecId::LONDON),
    (1_450_409, SpecId::MERGE),
    (2_990_908, SpecId::SHANGHAI),
    (5_187_023, SpecId::CANCUN),
];

fn sepolia_config() -> &'static ChainConfig {
    static CONFIG: OnceLock<ChainConfig> = OnceLock::new();

    CONFIG.get_or_init(|| {
        let hardfork_activations = SEPOLIA_HARDFORKS.into();

        ChainConfig {
            name: "sepolia".to_string(),
            hardfork_activations,
        }
    })
}

fn chain_configs() -> &'static HashMap<u64, &'static ChainConfig> {
    static CONFIGS: OnceLock<HashMap<u64, &'static ChainConfig>> = OnceLock::new();

    CONFIGS.get_or_init(|| {
        let mut hardforks = HashMap::new();
        hardforks.insert(1, mainnet_config());
        hardforks.insert(3, ropsten_config());
        hardforks.insert(4, rinkeby_config());
        hardforks.insert(5, goerli_config());
        hardforks.insert(42, kovan_config());
        hardforks.insert(17_000, holesky_config());
        hardforks.insert(11_155_111, sepolia_config());

        hardforks
    })
}

/// Returns the name corresponding to the provided chain ID, if it is supported.
pub fn chain_name(chain_id: u64) -> Option<&'static str> {
    chain_configs()
        .get(&chain_id)
        .map(|config| config.name.as_str())
}

/// Returns the hardfork activations corresponding to the provided chain ID, if
/// it is supported.
pub fn chain_hardfork_activations(chain_id: u64) -> Option<&'static HardforkActivations> {
    chain_configs()
        .get(&chain_id)
        .map(|config| &config.hardfork_activations)
}
