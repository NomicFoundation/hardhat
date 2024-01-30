//! Functionality for mining blocks.

mod ordering;
mod result;

use edr_eth::{Address, SpecId, B256, U256};
use edr_evm::{
    blockchain::BlockchainError, state::StateError, BlockTransactionError, CfgEnv,
    InvalidTransaction, MineBlockError,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::runtime,
    Status,
};
use napi_derive::napi;

pub use self::ordering::MineOrdering;
use self::result::MineBlockResult;
use crate::{
    blockchain::Blockchain, cast::TryCast, config::ConfigOptions, mempool::MemPool, state::State,
    tracer::Tracer,
};

/// Mines a block using as many transactions as can fit in it.
#[allow(clippy::too_many_arguments)]
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn mine_block(
    blockchain: &Blockchain,
    state: &State,
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
    if config.spec_id >= SpecId::MERGE && prevrandao.is_none() {
        return Err(napi::Error::new(
            Status::GenericFailure,
            MineBlockError::<BlockchainError, StateError>::MissingPrevrandao.to_string(),
        ));
    };

    let blockchain = (*blockchain).clone();
    let mem_pool = (*mem_pool).clone();
    let state = (*state).clone();
    let mut tracer = tracer.map(Tracer::as_dyn_inspector);

    runtime::Handle::current().spawn_blocking(move || {
        let mut blockchain = blockchain.write();
        let mut state = state.write();
        let mut mem_pool = mem_pool.write();

        let result = edr_evm::mine_block(
            &*blockchain,
            state.clone(),
            &mem_pool,
            &config,
            timestamp,
            beneficiary,
            min_gas_price,
            mine_ordering,
            reward,
            base_fee,
            prevrandao,
            None,
            // WORKAROUND: limiting the scope of the mutable borrow of `tracer` to this
            // block
            if let Some(tracer) = &mut tracer {
                Some(tracer.as_mut())
            } else {
                None
            },
        )
            .map_err(
            |e| napi::Error::new(Status::GenericFailure,
                match e {
                    MineBlockError::BlockTransaction(
                    BlockTransactionError::InvalidTransaction(
                        InvalidTransaction::LackOfFundForMaxFee { fee, balance }
                    )) => format!("sender doesn't have enough funds to send tx. The max upfront cost is: {fee} and the sender's account only has: {balance}"),
                    e => e.to_string(),
                }))?;

        let block = blockchain
            .insert_block(result.block, result.state_diff)
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?;

        mem_pool
            .update(&result.state)
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?;

        *state = result.state;

        Ok(MineBlockResult::from(edr_evm::MineBlockResult {
            block: block.block,
            transaction_results: result.transaction_results,
            transaction_traces: result.transaction_traces,
        }))
    })
        .await
        .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
}
