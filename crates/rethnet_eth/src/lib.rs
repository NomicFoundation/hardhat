#![warn(missing_docs)]

//! Ethereum types
//!
//! Ethereum types as needed by Rethnet. In particular, they are based on the same primitive types as `revm`.

/// Ethereum access list types
pub mod access_list;
/// Ethereum account types
pub mod account;
/// Ethereum block types
pub mod block;
/// Ethereum log types
pub mod log;
/// Ethereum receipt types
pub mod receipt;
/// Remote node interaction
#[cfg(feature = "serde")]
pub mod remote;
/// Ethereum signature types
pub mod signature;
/// Specification of hardforks
pub mod spec;
/// Ethereum state types and functions
pub mod state;
/// Ethereum transaction types
pub mod transaction;
/// Ethereum trie functions
pub mod trie;
/// Ethereum utility functions
pub mod utils;

pub use bytes::Bytes;
pub use ethbloom::Bloom;
pub use revm_primitives::{
    ruint::aliases::{B512, B64, U64},
    Address, B160, B256, U256,
};

/// A secret key
pub type Secret = B256;
/// A public key
pub type Public = B512;
