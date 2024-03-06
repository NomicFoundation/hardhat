#![warn(missing_docs)]

//! The EDR EVM
//!
//! The EDR EVM exposes APIs for running and interacting with a multi-threaded
//! Ethereum Virtual Machine (or EVM).

pub use revm::primitives::*;

pub use crate::{
    block::*,
    debug::{DebugContext, GetContextData},
    debug_trace::{
        debug_trace_transaction, execution_result_to_debug_result,
        register_eip_3155_tracer_handles, DebugTraceConfig, DebugTraceError, DebugTraceLogItem,
        DebugTraceResult, TracerEip3155,
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

/// Types for interfacing with the evm
pub mod evm {
    pub use revm::{
        handler::register::{EvmHandler, HandleRegister},
        FrameOrResult, FrameResult,
    };
}

/// Types for interfacing with the interpreter
pub mod interpreter {
    pub use revm::interpreter::*;
}

/// Types for managing Ethereum precompiles
pub mod precompile {
    pub use revm::precompile::{PrecompileSpecId, Precompiles};
}
