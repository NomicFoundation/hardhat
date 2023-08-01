//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).
#![warn(missing_docs)]

pub use hashbrown::HashMap;

pub use revm::{
    db::{
        BlockHash, BlockHashRef, Database, DatabaseCommit, DatabaseComponentError,
        DatabaseComponents, State as StateMut, StateRef,
    },
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
    miner::{BlockMiner, MineBlockResult},
    random::RandomHashGenerator,
    runtime::{Rethnet, SyncDatabase},
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
