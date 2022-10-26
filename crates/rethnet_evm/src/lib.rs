//! The Rethnet EVM
//!
//! The Rethnet EVM exposes APIs for running and interacting with a multi-threaded Ethereum
//! Virtual Machine (or EVM).
#![warn(missing_docs)]

pub use bytes::Bytes;
pub use db::layered_db::{LayeredDatabase, RethnetLayer};
pub use debug::{DatabaseDebug, HasDatabaseDebug};
pub use hashbrown::HashMap;
pub use primitive_types::{H160, H256, U256};
pub use revm::{
    db::{DatabaseRef, EmptyDB},
    Account, AccountInfo, BlockEnv, Bytecode, CfgEnv, CreateScheme, Database, DatabaseCommit,
    ExecutionResult, Log, Return, SpecId, TransactOut, TransactTo, TxEnv, EVM,
};

/// State mapping of addresses to accounts.
pub type State = HashMap<H160, Account>;

mod db;
mod debug;
mod inspector;
pub mod sync;
