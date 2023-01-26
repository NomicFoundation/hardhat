//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).
#![warn(missing_docs)]

pub use hashbrown::HashMap;
pub use revm::{
    db::EmptyDB,
    db::{BlockHash, BlockHashRef},
    primitives::{
        Account, AccountInfo, BlockEnv, Bytecode, CfgEnv, CreateScheme, Eval, ExecutionResult,
        Halt, Log, Output, ResultAndState, SpecId, State, TransactTo, TxEnv,
    },
};

pub use crate::{
    block::{BlockBuilder, HeaderData},
    debug::StateDebug,
    runtime::Rethnet,
    transaction::PendingTransaction,
};

/// Types for managing Ethereum blockchain
pub mod blockchain;

/// Database types for managing Ethereum state
pub mod db;

/// Types used for tracing EVM calls
pub mod trace;

mod block;
mod debug;
pub(crate) mod evm;
mod inspector;
pub(crate) mod random;
mod runtime;
mod transaction;
