use std::{cmp::Ordering, fmt::Debug, sync::Arc};

use edr_eth::{block::BlockOptions, U256};
use revm::primitives::{CfgEnv, ExecutionResult, InvalidTransaction};

use crate::{
    block::BlockBuilderCreationError,
    blockchain::SyncBlockchain,
    evm::SyncInspector,
    inspector::InspectorContainer,
    mempool::OrderedTransaction,
    state::{StateDiff, SyncState},
    trace::Trace,
    BlockBuilder, BlockTransactionError, BuildBlockResult, ExecutableTransaction, LocalBlock,
    MemPool, SyncBlock,
};

/// The result of mining a block, after having been committed to the blockchain.
#[derive(Debug)]
pub struct MineBlockResult<BlockchainErrorT> {
    /// Mined block
    pub block: Arc<dyn SyncBlock<Error = BlockchainErrorT>>,
    /// Transaction results
    pub transaction_results: Vec<ExecutionResult>,
    /// Transaction traces
    pub transaction_traces: Vec<Trace>,
}

impl<BlockchainErrorT> Clone for MineBlockResult<BlockchainErrorT> {
    fn clone(&self) -> Self {
        Self {
            block: self.block.clone(),
            transaction_results: self.transaction_results.clone(),
            transaction_traces: self.transaction_traces.clone(),
        }
    }
}

/// The result of mining a block, including the state. This result needs to be
/// inserted into the blockchain to be persistent.
pub struct MineBlockResultAndState<StateErrorT> {
    /// Mined block
    pub block: LocalBlock,
    /// State after mining the block
    pub state: Box<dyn SyncState<StateErrorT>>,
    /// State diff applied by block
    pub state_diff: StateDiff,
    /// Transaction results
    pub transaction_results: Vec<ExecutionResult>,
    /// Transaction traces
    pub transaction_traces: Vec<Trace>,
}

/// The type of ordering to use when selecting blocks to mine.
#[derive(Clone, Copy, Debug)]
pub enum MineOrdering {
    /// Insertion order
    Fifo,
    /// Effective miner fee
    Priority,
}

/// An error that occurred while mining a block.
#[derive(Debug, thiserror::Error)]
pub enum MineBlockError<BE, SE> {
    /// An error that occurred while constructing a block builder.
    #[error(transparent)]
    BlockBuilderCreation(#[from] BlockBuilderCreationError),
    /// An error that occurred while executing a transaction.
    #[error(transparent)]
    BlockTransaction(#[from] BlockTransactionError<BE, SE>),
    /// An error that occurred while finalizing a block.
    #[error(transparent)]
    BlockFinalize(SE),
    /// A blockchain error
    #[error(transparent)]
    Blockchain(BE),
    /// The block is expected to have a prevrandao, as the executor's config is
    /// on a post-merge hardfork.
    #[error("Post-merge transaction is missing prevrandao")]
    MissingPrevrandao,
}

/// Mines a block using as many transactions as can fit in it.
#[allow(clippy::too_many_arguments)]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn mine_block<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    mut state: Box<dyn SyncState<StateErrorT>>,
    mem_pool: &MemPool,
    cfg: &CfgEnv,
    options: BlockOptions,
    min_gas_price: U256,
    mine_ordering: MineOrdering,
    reward: U256,
    dao_hardfork_activation_block: Option<u64>,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<MineBlockResultAndState<StateErrorT>, MineBlockError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    let parent_block = blockchain
        .last_block()
        .map_err(MineBlockError::Blockchain)?;

    let parent_header = parent_block.header();

    let mut block_builder = BlockBuilder::new(
        cfg.clone(),
        parent_header,
        options,
        dao_hardfork_activation_block,
    )?;

    let mut pending_transactions = {
        type MineOrderComparator =
            dyn Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering + Send;

        let base_fee = block_builder.header().base_fee;
        let comparator: Box<MineOrderComparator> = match mine_ordering {
            MineOrdering::Fifo => Box::new(|lhs, rhs| lhs.order_id().cmp(&rhs.order_id())),
            MineOrdering::Priority => Box::new(move |lhs, rhs| {
                let effective_miner_fee = |transaction: &ExecutableTransaction| {
                    let max_fee_per_gas = transaction.gas_price();
                    let max_priority_fee_per_gas = transaction
                        .max_priority_fee_per_gas()
                        .unwrap_or(max_fee_per_gas);

                    base_fee.map_or(max_fee_per_gas, |base_fee| {
                        max_priority_fee_per_gas.min(max_fee_per_gas - base_fee)
                    })
                };

                // Invert lhs and rhs to get decreasing order by effective miner fee
                let ordering =
                    effective_miner_fee(rhs.pending()).cmp(&effective_miner_fee(lhs.pending()));

                // If two txs have the same effective miner fee we want to sort them
                // in increasing order by orderId
                if ordering == Ordering::Equal {
                    lhs.order_id().cmp(&rhs.order_id())
                } else {
                    ordering
                }
            }),
        };

        mem_pool.iter(comparator)
    };

    let mut results = Vec::new();
    let mut traces = Vec::new();

    let mut container = InspectorContainer::new(true, inspector);
    while let Some(transaction) = pending_transactions.next() {
        if transaction.gas_price() < min_gas_price {
            pending_transactions.remove_caller(transaction.caller());
            continue;
        }

        let caller = *transaction.caller();
        match block_builder.add_transaction(
            blockchain,
            &mut state,
            transaction,
            container.as_dyn_inspector(),
        ) {
            Err(
                BlockTransactionError::ExceedsBlockGasLimit
                | BlockTransactionError::InvalidTransaction(
                    InvalidTransaction::GasPriceLessThanBasefee,
                ),
            ) => {
                pending_transactions.remove_caller(&caller);
                continue;
            }
            Err(e) => {
                return Err(MineBlockError::BlockTransaction(e));
            }
            Ok(result) => {
                results.push(result);
                traces.push(container.clear_trace().unwrap());
            }
        }
    }

    let beneficiary = block_builder.header().beneficiary;
    let rewards = vec![(beneficiary, reward)];
    let BuildBlockResult { block, state_diff } = block_builder
        .finalize(&mut state, rewards)
        .map_err(MineBlockError::BlockFinalize)?;

    Ok(MineBlockResultAndState {
        block,
        state,
        state_diff,
        transaction_results: results,
        transaction_traces: traces,
    })
}
