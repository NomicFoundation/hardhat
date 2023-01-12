//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).
#![warn(missing_docs)]

use rethnet_eth::Address;

pub use hashbrown::HashMap;
pub use revm::{
    db::DatabaseComponents, Account, AccountInfo, BlockEnv, BlockHash, BlockHashRef, Bytecode,
    CallInputs, CfgEnv, CreateInputs, CreateScheme, Database, EVMData, ExecutionResult, Gas,
    Inspector, Interpreter, Log, Return, SpecId, State as StateMut, StateCommit, StateRef,
    TransactOut, TransactTo, TxEnv, EVM, OPCODE_JUMPMAP,
};

pub use crate::{
    block::{BlockBuilder, HeaderData},
    debug::DatabaseDebug,
    runtime::{AsyncDatabase, Rethnet},
    transaction::PendingTransaction,
};

/// State mapping of addresses to accounts.
pub type State = HashMap<Address, Account>;

/// Types for managing Ethereum blockchain
pub mod blockchain;

/// Database types for managing Ethereum state
pub mod state;

/// Types used for tracing EVM calls
pub mod trace;

mod block;
mod debug;
pub(crate) mod evm;
mod inspector;
pub(crate) mod random;
mod runtime;
mod transaction;
