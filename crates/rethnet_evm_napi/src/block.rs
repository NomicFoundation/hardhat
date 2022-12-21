mod builder;

use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;
use rethnet_eth::{Address, Bloom, Bytes, B256, B64, U64};
use rethnet_evm::BlockEnv;

use crate::cast::TryCast;

pub use builder::BlockBuilder;

#[napi(object)]
pub struct BlockConfig {
    pub number: Option<BigInt>,
    pub coinbase: Option<Buffer>,
    pub timestamp: Option<BigInt>,
    pub difficulty: Option<BigInt>,
    pub prevrandao: Option<Buffer>,
    pub basefee: Option<BigInt>,
    pub gas_limit: Option<BigInt>,
    pub parent_hash: Option<Buffer>,
}

impl TryFrom<BlockConfig> for BlockEnv {
    type Error = napi::Error;

    fn try_from(value: BlockConfig) -> std::result::Result<Self, Self::Error> {
        let default = BlockEnv::default();

        let number = value.number.map_or(Ok(default.number), BigInt::try_cast)?;
        let coinbase = value
            .coinbase
            .map_or(default.coinbase, |coinbase| Address::from_slice(&coinbase));
        let difficulty = value.difficulty.map_or_else(
            || Ok(default.difficulty),
            |difficulty| difficulty.try_cast(),
        )?;
        let prevrandao = value
            .prevrandao
            .map(|prevrandao| B256::from_slice(&prevrandao));
        let timestamp = value
            .timestamp
            .map_or(Ok(default.timestamp), BigInt::try_cast)?;
        let basefee = value
            .basefee
            .map_or_else(|| Ok(default.basefee), |basefee| basefee.try_cast())?;
        let gas_limit = value
            .gas_limit
            .map_or(Ok(default.gas_limit), |gas_limit| gas_limit.try_cast())?;

        Ok(Self {
            number,
            coinbase,
            timestamp,
            difficulty,
            prevrandao,
            basefee,
            gas_limit,
        })
    }
}

impl TryFrom<BlockConfig> for rethnet_evm::HeaderData {
    type Error = napi::Error;

    fn try_from(value: BlockConfig) -> std::result::Result<Self, Self::Error> {
        Ok(Self {
            number: value
                .number
                .map_or(Ok(None), |number| number.try_cast().map(Some))?,
            coinbase: value
                .coinbase
                .map(|coinbase| Address::from_slice(&coinbase)),
            timestamp: value
                .timestamp
                .map_or(Ok(None), |timestamp| timestamp.try_cast().map(Some))?,
            difficulty: value
                .difficulty
                .map_or(Ok(None), |difficulty| difficulty.try_cast().map(Some))?,
            basefee: value
                .basefee
                .map_or(Ok(None), |basefee| basefee.try_cast().map(Some))?,
            gas_limit: value
                .gas_limit
                .map_or(Ok(None), |gas_limit| gas_limit.try_cast().map(Some))?,
            parent_hash: value
                .parent_hash
                .map_or(Ok(None), |parent_hash| parent_hash.try_cast().map(Some))?,
        })
    }
}

#[napi(object)]
pub struct BlockHeader {
    pub parent_hash: Buffer,
    pub ommers_hash: Buffer,
    pub beneficiary: Buffer,
    pub state_root: Buffer,
    pub transactions_root: Buffer,
    pub receipts_root: Buffer,
    pub logs_bloom: Buffer,
    pub difficulty: BigInt,
    pub number: BigInt,
    pub gas_limit: BigInt,
    pub gas_used: BigInt,
    pub timestamp: BigInt,
    pub extra_data: Buffer,
    pub mix_hash: Buffer,
    pub nonce: BigInt,
    pub base_fee_per_gas: Option<BigInt>,
}

impl TryFrom<BlockHeader> for rethnet_eth::block::Header {
    type Error = napi::Error;

    fn try_from(value: BlockHeader) -> Result<Self, Self::Error> {
        Ok(Self {
            parent_hash: B256::from_slice(&value.parent_hash),
            ommers_hash: B256::from_slice(&value.ommers_hash),
            beneficiary: Address::from_slice(&value.beneficiary),
            state_root: B256::from_slice(&value.state_root),
            transactions_root: B256::from_slice(&value.transactions_root),
            receipts_root: B256::from_slice(&value.receipts_root),
            logs_bloom: Bloom::from_slice(&value.logs_bloom),
            difficulty: value.difficulty.try_cast()?,
            number: value.number.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            gas_used: value.gas_used.try_cast()?,
            timestamp: value.timestamp.get_u64().1,
            extra_data: Bytes::copy_from_slice(&value.extra_data),
            mix_hash: B256::from_slice(&value.mix_hash),
            nonce: B64::from(U64::from(value.nonce.get_u64().1)),
            base_fee_per_gas: value
                .base_fee_per_gas
                .map_or(Ok(None), |fee| fee.try_cast().map(Some))?,
        })
    }
}
