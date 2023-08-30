use std::{collections::VecDeque, fmt::Debug, sync::Arc};

use rethnet_eth::{
    block::{BlockOptions, DetailedBlock, Header},
    Address, B256, B64, U256,
};
use revm::primitives::{CfgEnv, ExecutionResult, SpecId};

use crate::{
    block::BlockBuilderCreationError,
    blockchain::SyncBlockchain,
    state::SyncState,
    trace::{Trace, TraceCollector},
    BlockBuilder, BlockTransactionError, MemPool,
};

/// The result of mining a block.
pub struct MineBlockResult {
    /// Mined block
    pub block: Arc<DetailedBlock>,
    /// Transaction results
    pub transaction_results: Vec<ExecutionResult>,
    /// Transaction traces
    pub transaction_traces: Vec<Trace>,
}

/// An error that occurred while mining a block.
#[derive(Debug, thiserror::Error)]
pub enum MineBlockError<BE, SE> {
    /// An error that occurred while aborting the block builder.
    #[error(transparent)]
    BlockAbort(SE),
    /// An error that occurred while constructing a block builder.
    #[error(transparent)]
    BlockBuilderCreation(#[from] BlockBuilderCreationError<SE>),
    /// An error that occurred while executing a transaction.
    #[error(transparent)]
    BlockTransaction(#[from] BlockTransactionError<BE, SE>),
    /// An error that occurred while finalizing a block.
    #[error(transparent)]
    BlockFinalize(SE),
    /// A blockchain error
    #[error(transparent)]
    Blockchain(BE),
    /// An error that occurred while updating the mempool.
    #[error(transparent)]
    MemPoolUpdate(SE),
    /// The block is expected to have a prevrandao, as the executor's config is on a post-merge hardfork.
    #[error("Post-merge transaction is missing prevrandao")]
    MissingPrevrandao,
}

/// Mines a block using as many transactions as can fit in it.
#[allow(clippy::too_many_arguments)]
pub async fn mine_block<BlockchainErrorT, StateErrorT>(
    blockchain: &mut dyn SyncBlockchain<BlockchainErrorT>,
    state: &mut dyn SyncState<StateErrorT>,
    mem_pool: &mut MemPool,
    cfg: &CfgEnv,
    timestamp: U256,
    block_gas_limit: U256,
    beneficiary: Address,
    reward: U256,
    base_fee: Option<U256>,
    prevrandao: Option<B256>,
) -> Result<MineBlockResult, MineBlockError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send + 'static,
    StateErrorT: Debug + Send + 'static,
{
    let mut block_builder = {
        let parent_block = blockchain
            .last_block()
            .await
            .map_err(MineBlockError::Blockchain)?;

        BlockBuilder::new(
            state,
            cfg.clone(),
            &parent_block.header,
            BlockOptions {
                beneficiary: Some(beneficiary),
                number: Some(parent_block.header.number + U256::from(1)),
                gas_limit: Some(block_gas_limit),
                timestamp: Some(timestamp),
                mix_hash: if cfg.spec_id >= SpecId::MERGE {
                    Some(prevrandao.ok_or(MineBlockError::MissingPrevrandao)?)
                } else {
                    None
                },
                nonce: Some(if cfg.spec_id >= SpecId::MERGE {
                    B64::ZERO
                } else {
                    B64::from_limbs([66u64.to_be()])
                }),
                base_fee: if cfg.spec_id >= SpecId::LONDON {
                    Some(base_fee.unwrap_or_else(|| calculate_next_base_fee(&parent_block.header)))
                } else {
                    None
                },
                ..Default::default()
            },
        )?
    };

    let mut pending_transactions: VecDeque<_> = mem_pool.pending_transactions().cloned().collect();

    let mut results = Vec::new();
    let mut traces = Vec::new();

    while let Some(transaction) = pending_transactions.pop_front() {
        let mut tracer = TraceCollector::default();

        match block_builder.add_transaction(blockchain, state, transaction, Some(&mut tracer)) {
            Err(BlockTransactionError::ExceedsBlockGasLimit) => continue,
            Err(e) => {
                block_builder
                    .abort(state)
                    .map_err(MineBlockError::BlockAbort)?;

                return Err(MineBlockError::BlockTransaction(e));
            }
            Ok(result) => {
                results.push(result);
                traces.push(tracer.into_trace());
            }
        }
    }

    let rewards = vec![(beneficiary, reward)];
    let block = block_builder
        .finalize(state, rewards, None)
        .map_err(MineBlockError::BlockFinalize)?;

    let block = blockchain
        .insert_block(block)
        .await
        .map_err(MineBlockError::Blockchain)?;

    mem_pool
        .update(state)
        .map_err(MineBlockError::MemPoolUpdate)?;

    Ok(MineBlockResult {
        block,
        transaction_results: results,
        transaction_traces: traces,
    })
}

/// Calculates the next base fee for a post-London block, given the parent's header.
///
/// # Panics
///
/// Panics if the parent header does not contain a base fee.
fn calculate_next_base_fee(parent: &Header) -> U256 {
    let elasticity = U256::from(2);
    let base_fee_max_change_denominator = U256::from(8);

    let parent_gas_target = parent.gas_limit / elasticity;
    let parent_base_fee = parent
        .base_fee_per_gas
        .expect("Post-London headers must contain a baseFee");

    match parent.gas_used.cmp(&parent_gas_target) {
        std::cmp::Ordering::Less => {
            let gas_used_delta = parent_gas_target - parent.gas_used;

            let delta = parent_base_fee * gas_used_delta
                / parent_gas_target
                / base_fee_max_change_denominator;

            parent_base_fee.saturating_sub(delta)
        }
        std::cmp::Ordering::Equal => parent_base_fee,
        std::cmp::Ordering::Greater => {
            let gas_used_delta = parent.gas_used - parent_gas_target;

            let delta = parent_base_fee * gas_used_delta
                / parent_gas_target
                / base_fee_max_change_denominator;

            parent_base_fee + delta.max(U256::from(1))
        }
    }
}

#[cfg(test)]
mod tests {
    use itertools::izip;

    use super::*;

    #[test]
    fn test_calculate_next_base_fee() {
        let base_fee = [
            1000000000, 1000000000, 1000000000, 1072671875, 1059263476, 1049238967, 1049238967, 0,
            1, 2,
        ];
        let gas_used = [
            10000000, 10000000, 10000000, 9000000, 10001000, 0, 10000000, 10000000, 10000000,
            10000000,
        ];
        let gas_limit = [
            10000000, 12000000, 14000000, 10000000, 14000000, 2000000, 18000000, 18000000,
            18000000, 18000000,
        ];
        let next_base_fee = [
            1125000000, 1083333333, 1053571428, 1179939062, 1116028649, 918084097, 1063811730, 1,
            2, 3,
        ];

        for (base_fee, gas_used, gas_limit, next_base_fee) in
            izip!(base_fee, gas_used, gas_limit, next_base_fee)
        {
            let parent_header = Header {
                base_fee_per_gas: Some(U256::from(base_fee)),
                gas_used: U256::from(gas_used),
                gas_limit: U256::from(gas_limit),
                ..Default::default()
            };

            assert_eq!(
                U256::from(next_base_fee),
                calculate_next_base_fee(&parent_header)
            );
        }
    }
}
