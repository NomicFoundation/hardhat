use core::fmt::Debug;
use std::sync::Arc;

use edr_eth::Bytes;
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
