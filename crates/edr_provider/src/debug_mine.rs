use core::fmt::Debug;
use std::sync::Arc;

use edr_eth::{Bytes, B256};
use edr_evm::{
    state::{StateDiff, SyncState},
    trace::Trace,
    ExecutionResult, LocalBlock, MineBlockResultAndState, SyncBlock,
};

/// The result of mining a block, including the state, in debug mode. This
/// result needs to be inserted into the blockchain to be persistent.
pub struct DebugMineBlockResultAndState<StateErrorT> {
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
    /// Encoded `console.log` call inputs
    pub console_log_inputs: Vec<Bytes>,
}

impl<StateErrorT> DebugMineBlockResultAndState<StateErrorT> {
    /// Constructs a new instance from a [`MineBlockResultAndState`],
    /// transaction traces, and decoded console log messages.
    pub fn new(
        result: MineBlockResultAndState<StateErrorT>,
        transaction_traces: Vec<Trace>,
        console_log_decoded_messages: Vec<Bytes>,
    ) -> Self {
        Self {
            block: result.block,
            state: result.state,
            state_diff: result.state_diff,
            transaction_results: result.transaction_results,
            transaction_traces,
            console_log_inputs: console_log_decoded_messages,
        }
    }
}

/// The result of mining a block in debug mode, after having been committed to
/// the blockchain.
#[derive(Debug)]
pub struct DebugMineBlockResult<BlockchainErrorT> {
    /// Mined block
    pub block: Arc<dyn SyncBlock<Error = BlockchainErrorT>>,
    /// Transaction results
    pub transaction_results: Vec<ExecutionResult>,
    /// Transaction traces
    pub transaction_traces: Vec<Trace>,
    /// Encoded `console.log` call inputs
    pub console_log_inputs: Vec<Bytes>,
}

impl<BlockchainErrorT> DebugMineBlockResult<BlockchainErrorT> {
    /// Whether the block contains a transaction with the given hash.
    pub fn has_transaction(&self, transaction_hash: &B256) -> bool {
        self.block
            .transactions()
            .iter()
            .any(|tx| *tx.hash() == *transaction_hash)
    }

    /// Returns the index of the transaction with the given hash in the block.
    pub fn transaction_index(&self, transaction_hash: &B256) -> Option<usize> {
        self.block
            .transactions()
            .iter()
            .position(|tx| *tx.hash() == *transaction_hash)
    }

    /// Returns the transaction result of the transaction with the given index.
    pub fn transaction_result(&self, transaction_index: usize) -> Option<&ExecutionResult> {
        self.transaction_results.get(transaction_index)
    }

    /// Returns the transaction trace of the transaction with the given index.
    pub fn transaction_trace(&self, transaction_index: usize) -> Option<&Trace> {
        self.transaction_traces.get(transaction_index)
    }
}

impl<BlockchainErrorT> Clone for DebugMineBlockResult<BlockchainErrorT> {
    fn clone(&self) -> Self {
        Self {
            block: self.block.clone(),
            transaction_results: self.transaction_results.clone(),
            transaction_traces: self.transaction_traces.clone(),
            console_log_inputs: self.console_log_inputs.clone(),
        }
    }
}
