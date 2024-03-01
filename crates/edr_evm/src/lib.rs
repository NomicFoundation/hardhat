#![warn(missing_docs)]

//! The EDR EVM
//!
//! The EDR EVM exposes APIs for running and interacting with a multi-threaded
//! Ethereum Virtual Machine (or EVM).

pub use revm::{
    interpreter::{
        opcode, return_revert, CallInputs, CreateInputs, Gas, InstructionResult, Interpreter,
        SuccessOrHalt, OPCODE_JUMPMAP,
    },
    primitives::*,
};

pub use crate::{
    block::*,
    debug_trace::{
        debug_trace_transaction, execution_result_to_debug_result, DebugTraceConfig,
        DebugTraceError, DebugTraceLogItem, DebugTraceResult, TracerEip3155,
    },
    mempool::{MemPool, MemPoolAddTransactionError, OrderedTransaction},
    miner::*,
    random::RandomHashGenerator,
    runtime::{dry_run, guaranteed_dry_run, run, SyncDatabase},
    transaction::*,
};

/// Types for managing Ethereum blockchain
pub mod blockchain;

/// Database types for managing Ethereum state
pub mod state;

/// Types used for tracing EVM calls
pub mod trace;

mod block;
pub(crate) mod collections;
mod debug;
mod debug_trace;
/// Types for managing Ethereum mem pool
pub mod mempool;
mod miner;
pub(crate) mod random;
mod runtime;
/// Utilities for testing
#[cfg(any(test, feature = "test-utils"))]
pub mod test_utils;
mod transaction;

/// Types for managing Ethereum precompiles
pub mod precompile {
    pub use revm::precompile::{PrecompileSpecId, Precompiles};
}
