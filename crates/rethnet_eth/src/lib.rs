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
/// Ethereum receipt types
pub mod receipt;
/// Ethereum signature types
pub mod signature;
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
pub use revm::{B160, B256};
pub use ruint::aliases::{B512, B64, U256, U64};

/// An Ethereum address
pub type Address = B160;
/// A secret key
pub type Secret = B256;
/// A public key
pub type Public = B512;
