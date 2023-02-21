use napi::{
    bindgen_prelude::{BigInt, ToNapiValue},
    Status,
};
use napi_derive::napi;
use rethnet_evm::CfgEnv;

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

impl From<SpecId> for rethnet_evm::SpecId {
    fn from(value: SpecId) -> Self {
        match value {
            SpecId::Frontier => rethnet_evm::SpecId::FRONTIER,
            SpecId::FrontierThawing => rethnet_evm::SpecId::FRONTIER_THAWING,
            SpecId::Homestead => rethnet_evm::SpecId::HOMESTEAD,
            SpecId::DaoFork => rethnet_evm::SpecId::DAO_FORK,
            SpecId::Tangerine => rethnet_evm::SpecId::TANGERINE,
            SpecId::SpuriousDragon => rethnet_evm::SpecId::SPURIOUS_DRAGON,
            SpecId::Byzantium => rethnet_evm::SpecId::BYZANTIUM,
            SpecId::Constantinople => rethnet_evm::SpecId::CONSTANTINOPLE,
            SpecId::Petersburg => rethnet_evm::SpecId::PETERSBURG,
            SpecId::Istanbul => rethnet_evm::SpecId::ISTANBUL,
            SpecId::MuirGlacier => rethnet_evm::SpecId::MUIR_GLACIER,
            SpecId::Berlin => rethnet_evm::SpecId::BERLIN,
            SpecId::London => rethnet_evm::SpecId::LONDON,
            SpecId::ArrowGlacier => rethnet_evm::SpecId::ARROW_GLACIER,
            SpecId::GrayGlacier => rethnet_evm::SpecId::GRAY_GLACIER,
            SpecId::Merge => rethnet_evm::SpecId::MERGE,
            SpecId::Shanghai => rethnet_evm::SpecId::SHANGHAI,
            SpecId::Cancun => rethnet_evm::SpecId::CANCUN,
            SpecId::Latest => rethnet_evm::SpecId::LATEST,
        }
    }
}

/// If not set, uses defaults from [`CfgEnv`].
#[napi(object)]
pub struct Config {
    /// The blockchain's ID
    pub chain_id: Option<BigInt>,
    /// Identifier for the Ethereum spec
    pub spec_id: Option<SpecId>,
    /// The contract code size limit for EIP-170
    pub limit_contract_code_size: Option<BigInt>,
    /// Disables block limit validation
    pub disable_block_gas_limit: Option<bool>,
    /// Disables EIP-3607, which rejects transactions from sender with deployed code
    pub disable_eip3607: Option<bool>,
}

impl TryFrom<Config> for CfgEnv {
    type Error = napi::Error;

    fn try_from(value: Config) -> std::result::Result<Self, Self::Error> {
        let default = CfgEnv::default();
        let chain_id = value
            .chain_id
            .map_or(Ok(default.chain_id), |chain_id| chain_id.try_cast())?;

        let spec_id = value
            .spec_id
            .map_or(default.spec_id, |spec_id| spec_id.into());

        let limit_contract_code_size = value.limit_contract_code_size.map_or(Ok(None), |size| {
            // TODO: the lossless check in get_u64 is broken: https://github.com/napi-rs/napi-rs/pull/1348
            if let (false, size, _lossless) = size.get_u64() {
                usize::try_from(size).map_or_else(
                    |e| Err(napi::Error::new(Status::InvalidArg, e.to_string())),
                    |size| Ok(Some(size)),
                )
            } else {
                Err(napi::Error::new(
                    Status::InvalidArg,
                    "BigInt cannot be larger than usize::MAX".to_owned(),
                ))
            }
        })?;

        let disable_block_gas_limit = value
            .disable_block_gas_limit
            .unwrap_or(default.disable_block_gas_limit);
        let disable_eip3607 = value.disable_eip3607.unwrap_or(default.disable_eip3607);

        Ok(Self {
            chain_id,
            spec_id,
            limit_contract_code_size,
            disable_block_gas_limit,
            disable_eip3607,
            ..default
        })
    }
}
