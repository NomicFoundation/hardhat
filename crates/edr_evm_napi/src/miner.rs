//! Functionality for mining blocks.

mod ordering;
mod result;

use edr_eth::{Address, B256, U256};
use edr_evm::{BlockTransactionError, CfgEnv, InvalidTransaction, MineBlockError};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use napi_derive::napi;

use crate::{
    blockchain::Blockchain, cast::TryCast, config::ConfigOptions, mempool::MemPool,
    miner::ordering::MineOrdering, state::State, tracer::Tracer,
};

use self::result::MineBlockResult;

/// Mines a block using as many transactions as can fit in it.
#[allow(clippy::too_many_arguments)]
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn mine_block(
    blockchain: &Blockchain,
    state_manager: &State,
    mem_pool: &MemPool,
    config: ConfigOptions,
    timestamp: BigInt,
    beneficiary: Buffer,
    min_gas_price: BigInt,
    mine_ordering: MineOrdering,
    reward: BigInt,
    base_fee: Option<BigInt>,
    prevrandao: Option<Buffer>,
    tracer: Option<&Tracer>,
) -> napi::Result<MineBlockResult> {
    let config = CfgEnv::try_from(config)?;
    let beneficiary = Address::from_slice(&beneficiary);
    let min_gas_price: U256 = BigInt::try_cast(min_gas_price)?;
    let mine_ordering = mine_ordering.into();
    let timestamp: u64 = BigInt::try_cast(timestamp)?;
    let reward: U256 = BigInt::try_cast(reward)?;
    let base_fee: Option<U256> =
        base_fee.map_or(Ok(None), |base_fee| BigInt::try_cast(base_fee).map(Some))?;
    let prevrandao: Option<B256> = prevrandao.map(TryCast::<B256>::try_cast).transpose()?;

    let state = state_manager.read().await.clone();

    edr_evm::mine_block(
        &mut *blockchain.write().await,
        state,
        &mut *mem_pool.write().await,
        &config,
        timestamp,
        beneficiary,
        min_gas_price,
        mine_ordering,
        reward,
        base_fee,
        prevrandao,
        tracer.map(Tracer::as_dyn_inspector)
    )
    .await
    .map_or_else(
        |e| Err(napi::Error::new(Status::GenericFailure,
            match e {
                MineBlockError::BlockTransaction(
                BlockTransactionError::InvalidTransaction(
                    InvalidTransaction::LackOfFundForMaxFee { fee, balance }
                )) => format!("sender doesn't have enough funds to send tx. The max upfront cost is: {fee} and the sender's account only has: {balance}"),
                e => e.to_string(),
            })),
        |result| {
            Ok(MineBlockResult::from(
                result
            ))
        },
    )
}
