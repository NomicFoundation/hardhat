//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).
#![warn(missing_docs)]

use rethnet_eth::Address;

pub use hashbrown::HashMap;
pub use revm::{
    blockchain::{Blockchain, BlockchainRef},
    db::EmptyDB,
    Account, AccountInfo, BlockEnv, Bytecode, CfgEnv, CreateScheme, Database, DatabaseCommit,
    ExecutionResult, Log, Return, SpecId, TransactOut, TransactTo, TxEnv, EVM,
};

pub use crate::{
    block::{BlockBuilder, HeaderData},
    debug::DatabaseDebug,
    runtime::Rethnet,
    transaction::PendingTransaction,
};

/// State mapping of addresses to accounts.
pub type State = HashMap<Address, Account>;

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
