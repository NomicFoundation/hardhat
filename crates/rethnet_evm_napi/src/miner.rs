//! Functionality for mining blocks.

mod result;

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, B256, U256};
use rethnet_evm::CfgEnv;

use crate::{
    blockchain::Blockchain, cast::TryCast, config::ConfigOptions, mempool::MemPool,
    state::StateManager,
};

use self::result::MineBlockResult;

/// Mines a block using as many transactions as can fit in it.
#[allow(clippy::too_many_arguments)]
#[napi]
pub async fn mine_block(
    blockchain: &Blockchain,
    state_manager: &StateManager,
    mem_pool: &MemPool,
    config: ConfigOptions,
    timestamp: BigInt,
    block_gas_limit: BigInt,
    beneficiary: Buffer,
    reward: BigInt,
    base_fee: Option<BigInt>,
    prevrandao: Option<Buffer>,
) -> napi::Result<MineBlockResult> {
    let config = CfgEnv::try_from(config)?;
    let block_gas_limit: U256 = BigInt::try_cast(block_gas_limit)?;
    let beneficiary = Address::from_slice(&beneficiary);
    let timestamp: U256 = BigInt::try_cast(timestamp)?;
    let reward: U256 = BigInt::try_cast(reward)?;
    let base_fee: Option<U256> =
        base_fee.map_or(Ok(None), |base_fee| BigInt::try_cast(base_fee).map(Some))?;
    let prevrandao: Option<B256> = prevrandao.map(|prevrandao| B256::from_slice(&prevrandao));

    rethnet_evm::mine_block(
        &mut *blockchain.write().await,
        &mut *state_manager.write().await,
        &mut *mem_pool.write().await,
        &config,
        timestamp,
        block_gas_limit,
        beneficiary,
        reward,
        base_fee,
        prevrandao,
    )
    .await
    .map_or_else(
        |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
        |result| Ok(MineBlockResult::from(result)),
    )
}
