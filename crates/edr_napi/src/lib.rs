#![warn(missing_docs)]

//! NAPI bindings for the EDR EVM

mod account;
mod block;
mod call_override;
mod cast;
mod config;
mod context;
mod debug_trace;
mod log;
mod logger;
mod provider;
mod result;
#[cfg(feature = "scenarios")]
mod scenarios;
mod subscribe;
mod sync;
mod threadsafe_function;
mod trace;
mod withdrawal;
