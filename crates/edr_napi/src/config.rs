use std::ops::Deref;

use edr_evm::CfgEnv;
use napi::bindgen_prelude::{BigInt, FromNapiValue, ToNapiValue};
use napi_derive::napi;

use crate::cast::TryCast;

/// Identifier for the Ethereum spec.
#[napi]
pub enum SpecId {
    /// Frontier
    Frontier = 0,
    /// Frontier Thawing
    FrontierThawing = 1,
    /// Homestead
    Homestead = 2,
    /// DAO Fork
    DaoFork = 3,
    /// Tangerine
    Tangerine = 4,
    /// Spurious Dragon
    SpuriousDragon = 5,
    /// Byzantium
    Byzantium = 6,
    /// Constantinople
    Constantinople = 7,
    /// Petersburg
    Petersburg = 8,
    /// Istanbul
    Istanbul = 9,
    /// Muir Glacier
    MuirGlacier = 10,
    /// Berlin
    Berlin = 11,
    /// London
    London = 12,
    /// Arrow Glacier
    ArrowGlacier = 13,
    /// Gray Glacier
    GrayGlacier = 14,
    /// Merge
    Merge = 15,
    /// Shanghai
    Shanghai = 16,
    /// Cancun
    Cancun = 17,
    /// Latest
    Latest = 18,
}

impl From<SpecId> for edr_evm::SpecId {
    fn from(value: SpecId) -> Self {
        match value {
            SpecId::Frontier => edr_evm::SpecId::FRONTIER,
            SpecId::FrontierThawing => edr_evm::SpecId::FRONTIER_THAWING,
            SpecId::Homestead => edr_evm::SpecId::HOMESTEAD,
            SpecId::DaoFork => edr_evm::SpecId::DAO_FORK,
            SpecId::Tangerine => edr_evm::SpecId::TANGERINE,
            SpecId::SpuriousDragon => edr_evm::SpecId::SPURIOUS_DRAGON,
            SpecId::Byzantium => edr_evm::SpecId::BYZANTIUM,
            SpecId::Constantinople => edr_evm::SpecId::CONSTANTINOPLE,
            SpecId::Petersburg => edr_evm::SpecId::PETERSBURG,
            SpecId::Istanbul => edr_evm::SpecId::ISTANBUL,
            SpecId::MuirGlacier => edr_evm::SpecId::MUIR_GLACIER,
            SpecId::Berlin => edr_evm::SpecId::BERLIN,
            SpecId::London => edr_evm::SpecId::LONDON,
            SpecId::ArrowGlacier => edr_evm::SpecId::ARROW_GLACIER,
            SpecId::GrayGlacier => edr_evm::SpecId::GRAY_GLACIER,
            SpecId::Merge => edr_evm::SpecId::MERGE,
            SpecId::Shanghai => edr_evm::SpecId::SHANGHAI,
            SpecId::Cancun => edr_evm::SpecId::CANCUN,
            SpecId::Latest => edr_evm::SpecId::LATEST,
        }
    }
}

impl From<edr_evm::SpecId> for SpecId {
    fn from(value: edr_evm::SpecId) -> Self {
        match value {
            edr_evm::SpecId::FRONTIER => SpecId::Frontier,
            edr_evm::SpecId::FRONTIER_THAWING => SpecId::FrontierThawing,
            edr_evm::SpecId::HOMESTEAD => SpecId::Homestead,
            edr_evm::SpecId::DAO_FORK => SpecId::DaoFork,
            edr_evm::SpecId::TANGERINE => SpecId::Tangerine,
            edr_evm::SpecId::SPURIOUS_DRAGON => SpecId::SpuriousDragon,
            edr_evm::SpecId::BYZANTIUM => SpecId::Byzantium,
            edr_evm::SpecId::CONSTANTINOPLE => SpecId::Constantinople,
            edr_evm::SpecId::PETERSBURG => SpecId::Petersburg,
            edr_evm::SpecId::ISTANBUL => SpecId::Istanbul,
            edr_evm::SpecId::MUIR_GLACIER => SpecId::MuirGlacier,
            edr_evm::SpecId::BERLIN => SpecId::Berlin,
            edr_evm::SpecId::LONDON => SpecId::London,
            edr_evm::SpecId::ARROW_GLACIER => SpecId::ArrowGlacier,
            edr_evm::SpecId::GRAY_GLACIER => SpecId::GrayGlacier,
            edr_evm::SpecId::MERGE => SpecId::Merge,
            edr_evm::SpecId::SHANGHAI => SpecId::Shanghai,
            edr_evm::SpecId::CANCUN => SpecId::Cancun,
            edr_evm::SpecId::LATEST => SpecId::Latest,
        }
    }
}

/// A wrapper type around EDR's EVM config type.
#[napi]
pub struct Config {
    inner: CfgEnv,
}

impl Config {
    /// Constructs a new [`Config`] instance.
    pub fn new(cfg: CfgEnv) -> Self {
        Self { inner: cfg }
    }
}

impl Deref for Config {
    type Target = CfgEnv;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl Config {
    /// Retrieves the configs contract code size limit
    #[napi(getter)]
    pub fn limit_contract_code_size(&self) -> Option<BigInt> {
        self.inner
            .limit_contract_code_size
            .map(|size| BigInt::from(size as u64))
    }

    /// Returns whether the block gas limit is disabled.
    #[napi(getter)]
    pub fn disable_block_gas_limit(&self) -> bool {
        self.inner.disable_block_gas_limit
    }

    /// Returns whether EIP-3607 is disabled.
    #[napi(getter)]
    pub fn disable_eip3607(&self) -> bool {
        self.inner.disable_eip3607
    }
}

/// If not set, uses defaults from [`CfgEnv`].
#[napi(object)]
pub struct ConfigOptions {
    /// The blockchain's ID
    pub chain_id: Option<BigInt>,
    /// Identifier for the Ethereum spec
    pub spec_id: Option<SpecId>,
    /// The contract code size limit for EIP-170
    pub limit_contract_code_size: Option<BigInt>,
    /// Disables block limit validation
    pub disable_block_gas_limit: Option<bool>,
    /// Disables EIP-3607, which rejects transactions from sender with deployed
    /// code
    pub disable_eip3607: Option<bool>,
}

impl TryFrom<ConfigOptions> for CfgEnv {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: ConfigOptions) -> std::result::Result<Self, Self::Error> {
        let default = CfgEnv::default();
        let chain_id = value
            .chain_id
            .map_or(Ok(default.chain_id), TryCast::try_cast)?;

        let spec_id = value.spec_id.map_or(default.spec_id, Into::into);

        let limit_contract_code_size = value
            .limit_contract_code_size
            .map(TryCast::<usize>::try_cast)
            .transpose()?;

        let disable_block_gas_limit = value
            .disable_block_gas_limit
            .unwrap_or(default.disable_block_gas_limit);
        let disable_eip3607 = value.disable_eip3607.unwrap_or(default.disable_eip3607);

        let mut cfg = CfgEnv::default();
        cfg.chain_id = chain_id;
        cfg.spec_id = spec_id;
        cfg.limit_contract_code_size = limit_contract_code_size;
        cfg.disable_block_gas_limit = disable_block_gas_limit;
        cfg.disable_eip3607 = disable_eip3607;

        Ok(cfg)
    }
}
