use std::{cmp::Ordering, fmt::Debug, sync::Arc};

use edr_eth::{block::BlockOptions, U256};
use revm::primitives::{CfgEnvWithHandlerCfg, ExecutionResult, InvalidTransaction};
use serde::{Deserialize, Serialize};

use crate::{
    block::BlockBuilderCreationError,
    blockchain::SyncBlockchain,
    debug::DebugContext,
    mempool::OrderedTransaction,
    state::{StateDiff, SyncState},
    trace::Trace,
    BlockBuilder, BlockTransactionError, BuildBlockResult, ExecutableTransaction,
    ExecutionResultWithContext, LocalBlock, MemPool, SyncBlock,
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
}

/// The type of ordering to use when selecting blocks to mine.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
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
pub fn mine_block<'blockchain, 'evm, BlockchainErrorT, DebugDataT, StateErrorT>(
    blockchain: &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    mut state: Box<dyn SyncState<StateErrorT>>,
    mem_pool: &MemPool,
    cfg: &CfgEnvWithHandlerCfg,
    options: BlockOptions,
    min_gas_price: U256,
    mine_ordering: MineOrdering,
    reward: U256,
    dao_hardfork_activation_block: Option<u64>,
    mut debug_context: Option<
        DebugContext<'evm, BlockchainErrorT, DebugDataT, Box<dyn SyncState<StateErrorT>>>,
    >,
) -> Result<MineBlockResultAndState<StateErrorT>, MineBlockError<BlockchainErrorT, StateErrorT>>
where
    'blockchain: 'evm,
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
            MineOrdering::Fifo => Box::new(first_in_first_out_comparator),
            MineOrdering::Priority => {
                Box::new(move |lhs, rhs| priority_comparator(lhs, rhs, base_fee))
            }
        };

        mem_pool.iter(comparator)
    };

    let mut results = Vec::new();

    while let Some(transaction) = pending_transactions.next() {
        if transaction.gas_price() < min_gas_price {
            pending_transactions.remove_caller(transaction.caller());
            continue;
        }

        let caller = *transaction.caller();
        let ExecutionResultWithContext {
            result,
            evm_context,
        } = block_builder.add_transaction(blockchain, state, transaction, debug_context);

        match result {
            Err(
                BlockTransactionError::ExceedsBlockGasLimit
                | BlockTransactionError::InvalidTransaction(
                    InvalidTransaction::GasPriceLessThanBasefee,
                ),
            ) => {
                pending_transactions.remove_caller(&caller);
                state = evm_context.state;
                debug_context = evm_context.debug;
                continue;
            }
            Err(error) => {
                return Err(MineBlockError::BlockTransaction(error));
            }
            Ok(result) => {
                results.push(result);
                state = evm_context.state;
                debug_context = evm_context.debug;
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
    })
}

fn effective_miner_fee(transaction: &ExecutableTransaction, base_fee: Option<U256>) -> U256 {
    let max_fee_per_gas = transaction.gas_price();
    let max_priority_fee_per_gas = transaction
        .max_priority_fee_per_gas()
        .unwrap_or(max_fee_per_gas);

    base_fee.map_or(max_fee_per_gas, |base_fee| {
        max_priority_fee_per_gas.min(max_fee_per_gas - base_fee)
    })
}

fn first_in_first_out_comparator(lhs: &OrderedTransaction, rhs: &OrderedTransaction) -> Ordering {
    lhs.order_id().cmp(&rhs.order_id())
}

fn priority_comparator(
    lhs: &OrderedTransaction,
    rhs: &OrderedTransaction,
    base_fee: Option<U256>,
) -> Ordering {
    let effective_miner_fee =
        move |transaction: &ExecutableTransaction| effective_miner_fee(transaction, base_fee);

    // Invert lhs and rhs to get decreasing order by effective miner fee
    let ordering = effective_miner_fee(rhs.pending()).cmp(&effective_miner_fee(lhs.pending()));

    // If two txs have the same effective miner fee we want to sort them
    // in increasing order by orderId
    if ordering == Ordering::Equal {
        lhs.order_id().cmp(&rhs.order_id())
    } else {
        ordering
    }
}

#[cfg(test)]
mod tests {
    use edr_eth::{AccountInfo, Address};

    use super::*;
    use crate::test_utils::{
        dummy_eip1559_transaction, dummy_eip155_transaction_with_price, MemPoolTestFixture,
    };

    #[test]
    fn fifo_ordering() -> anyhow::Result<()> {
        let sender1 = Address::random();
        let sender2 = Address::random();
        let sender3 = Address::random();

        let account_with_balance = AccountInfo {
            balance: U256::from(100_000_000u64),
            ..AccountInfo::default()
        };
        let mut fixture = MemPoolTestFixture::with_accounts(&[
            (sender1, account_with_balance.clone()),
            (sender2, account_with_balance.clone()),
            (sender3, account_with_balance),
        ]);

        let base_fee = Some(U256::from(15));

        let transaction1 = dummy_eip155_transaction_with_price(sender1, 0, U256::from(111))?;
        assert_eq!(effective_miner_fee(&transaction1, base_fee), U256::from(96));
        fixture.add_transaction(transaction1.clone())?;

        let transaction2 = dummy_eip1559_transaction(sender2, 0, U256::from(120), U256::from(100))?;
        assert_eq!(
            effective_miner_fee(&transaction2, base_fee),
            U256::from(100)
        );
        fixture.add_transaction(transaction2.clone())?;

        let transaction3 = dummy_eip1559_transaction(sender3, 0, U256::from(140), U256::from(110))?;
        assert_eq!(
            effective_miner_fee(&transaction3, base_fee),
            U256::from(110)
        );
        fixture.add_transaction(transaction3.clone())?;

        let mut ordered_transactions = fixture.mem_pool.iter(first_in_first_out_comparator);

        assert_eq!(ordered_transactions.next(), Some(transaction1));
        assert_eq!(ordered_transactions.next(), Some(transaction2));
        assert_eq!(ordered_transactions.next(), Some(transaction3));

        Ok(())
    }

    #[test]
    fn priority_ordering_gas_price_without_base_fee() -> anyhow::Result<()> {
        let sender1 = Address::random();
        let sender2 = Address::random();
        let sender3 = Address::random();
        let sender4 = Address::random();

        let account_with_balance = AccountInfo {
            balance: U256::from(100_000_000u64),
            ..AccountInfo::default()
        };
        let mut fixture = MemPoolTestFixture::with_accounts(&[
            (sender1, account_with_balance.clone()),
            (sender2, account_with_balance.clone()),
            (sender3, account_with_balance.clone()),
            (sender4, account_with_balance),
        ]);

        let transaction1 = dummy_eip155_transaction_with_price(sender1, 0, U256::from(123))?;
        fixture.add_transaction(transaction1.clone())?;

        let transaction2 = dummy_eip155_transaction_with_price(sender2, 0, U256::from(1_000))?;
        fixture.add_transaction(transaction2.clone())?;

        // This has the same gasPrice than tx2, but arrived later, so it's placed later
        // in the queue
        let transaction3 = dummy_eip155_transaction_with_price(sender3, 0, U256::from(1_000))?;
        fixture.add_transaction(transaction3.clone())?;

        let transaction4 = dummy_eip155_transaction_with_price(sender4, 0, U256::from(2_000))?;
        fixture.add_transaction(transaction4.clone())?;

        let mut ordered_transactions = fixture
            .mem_pool
            .iter(|lhs, rhs| priority_comparator(lhs, rhs, None));

        assert_eq!(ordered_transactions.next(), Some(transaction4));
        assert_eq!(ordered_transactions.next(), Some(transaction2));
        assert_eq!(ordered_transactions.next(), Some(transaction3));
        assert_eq!(ordered_transactions.next(), Some(transaction1));

        Ok(())
    }

    #[test]
    fn priority_ordering_gas_price_with_base_fee() -> anyhow::Result<()> {
        let sender1 = Address::random();
        let sender2 = Address::random();
        let sender3 = Address::random();
        let sender4 = Address::random();
        let sender5 = Address::random();

        let account_with_balance = AccountInfo {
            balance: U256::from(100_000_000u64),
            ..AccountInfo::default()
        };
        let mut fixture = MemPoolTestFixture::with_accounts(&[
            (sender1, account_with_balance.clone()),
            (sender2, account_with_balance.clone()),
            (sender3, account_with_balance.clone()),
            (sender4, account_with_balance.clone()),
            (sender5, account_with_balance),
        ]);

        let base_fee = Some(U256::from(15));

        let transaction1 = dummy_eip155_transaction_with_price(sender1, 0, U256::from(111))?;
        assert_eq!(effective_miner_fee(&transaction1, base_fee), U256::from(96));
        fixture.add_transaction(transaction1.clone())?;

        let transaction2 = dummy_eip1559_transaction(sender2, 0, U256::from(120), U256::from(100))?;
        assert_eq!(
            effective_miner_fee(&transaction2, base_fee),
            U256::from(100)
        );
        fixture.add_transaction(transaction2.clone())?;

        let transaction3 = dummy_eip1559_transaction(sender3, 0, U256::from(140), U256::from(110))?;
        assert_eq!(
            effective_miner_fee(&transaction3, base_fee),
            U256::from(110)
        );
        fixture.add_transaction(transaction3.clone())?;

        let transaction4 = dummy_eip1559_transaction(sender4, 0, U256::from(140), U256::from(130))?;
        assert_eq!(
            effective_miner_fee(&transaction4, base_fee),
            U256::from(125)
        );
        fixture.add_transaction(transaction4.clone())?;

        let transaction5 = dummy_eip155_transaction_with_price(sender5, 0, U256::from(170))?;
        assert_eq!(
            effective_miner_fee(&transaction5, base_fee),
            U256::from(155)
        );
        fixture.add_transaction(transaction5.clone())?;

        let mut ordered_transactions = fixture
            .mem_pool
            .iter(|lhs, rhs| priority_comparator(lhs, rhs, base_fee));

        assert_eq!(ordered_transactions.next(), Some(transaction5));
        assert_eq!(ordered_transactions.next(), Some(transaction4));
        assert_eq!(ordered_transactions.next(), Some(transaction3));
        assert_eq!(ordered_transactions.next(), Some(transaction2));
        assert_eq!(ordered_transactions.next(), Some(transaction1));

        Ok(())
    }

    #[test]
    fn ordering_remove_caller() -> anyhow::Result<()> {
        let sender1 = Address::random();
        let sender2 = Address::random();
        let sender3 = Address::random();
        let sender4 = Address::random();

        let account_with_balance = AccountInfo {
            balance: U256::from(100_000_000u64),
            ..AccountInfo::default()
        };
        let mut fixture = MemPoolTestFixture::with_accounts(&[
            (sender1, account_with_balance.clone()),
            (sender2, account_with_balance.clone()),
            (sender3, account_with_balance.clone()),
            (sender4, account_with_balance),
        ]);

        // Insert 9 transactions sequentially (no for loop)
        let transaction1 = dummy_eip155_transaction_with_price(sender1, 0, U256::from(100))?;
        fixture.add_transaction(transaction1.clone())?;

        let transaction2 = dummy_eip155_transaction_with_price(sender1, 1, U256::from(99))?;
        fixture.add_transaction(transaction2.clone())?;

        let transaction3 = dummy_eip155_transaction_with_price(sender2, 0, U256::from(98))?;
        fixture.add_transaction(transaction3.clone())?;

        let transaction4 = dummy_eip155_transaction_with_price(sender2, 1, U256::from(97))?;
        fixture.add_transaction(transaction4.clone())?;

        let transaction5 = dummy_eip155_transaction_with_price(sender3, 0, U256::from(96))?;
        fixture.add_transaction(transaction5.clone())?;

        let transaction6 = dummy_eip155_transaction_with_price(sender3, 1, U256::from(95))?;
        fixture.add_transaction(transaction6.clone())?;

        let transaction7 = dummy_eip155_transaction_with_price(sender3, 2, U256::from(94))?;
        fixture.add_transaction(transaction7.clone())?;

        let transaction8 = dummy_eip155_transaction_with_price(sender3, 3, U256::from(93))?;
        fixture.add_transaction(transaction8.clone())?;

        let transaction9 = dummy_eip155_transaction_with_price(sender4, 0, U256::from(92))?;
        fixture.add_transaction(transaction9.clone())?;

        let transaction10 = dummy_eip155_transaction_with_price(sender4, 1, U256::from(91))?;
        fixture.add_transaction(transaction10.clone())?;

        let mut ordered_transactions = fixture
            .mem_pool
            .iter(|lhs, rhs| priority_comparator(lhs, rhs, None));

        assert_eq!(ordered_transactions.next(), Some(transaction1));
        assert_eq!(ordered_transactions.next(), Some(transaction2));
        assert_eq!(ordered_transactions.next(), Some(transaction3));

        // Remove all transactions for sender 2
        ordered_transactions.remove_caller(&sender2);

        assert_eq!(ordered_transactions.next(), Some(transaction5));
        assert_eq!(ordered_transactions.next(), Some(transaction6));
        assert_eq!(ordered_transactions.next(), Some(transaction7));

        // Remove all transactions for sender 3
        ordered_transactions.remove_caller(&sender3);

        assert_eq!(ordered_transactions.next(), Some(transaction9));
        assert_eq!(ordered_transactions.next(), Some(transaction10));

        Ok(())
    }
}
