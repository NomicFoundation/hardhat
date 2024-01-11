#![warn(missing_docs)]

//! NAPI bindings for the EDR EVM

mod access_list;
mod account;
mod block;
mod blockchain;
mod cast;
mod config;
mod context;
mod debug_trace;
mod log;
mod mempool;
pub mod miner;
mod provider;
mod receipt;
pub mod runtime;
mod signature;
mod state;
mod subscribe;
mod sync;
mod threadsafe_function;
mod trace;
mod tracer;
mod transaction;
mod withdrawal;
