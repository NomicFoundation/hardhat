#![warn(missing_docs)]

//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).

pub use revm::{
    interpreter::{
        instruction_result::SuccessOrHalt, opcode, return_revert, CallInputs, CreateInputs, Gas,
        InstructionResult, Interpreter, OPCODE_JUMPMAP,
    },
    primitives::*,
    Inspector,
};

pub use crate::{
    block::*,
    evm::SyncInspector,
    mempool::MemPool,
    miner::{mine_block, MineBlockError, MineBlockResult},
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
pub(crate) mod evm;
mod mempool;
mod miner;
pub(crate) mod random;
mod runtime;
mod transaction;
