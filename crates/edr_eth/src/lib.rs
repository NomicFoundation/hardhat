#![warn(missing_docs)]

//! Ethereum types
//!
//! Ethereum types as needed by EDR. In particular, they are based on the same
//! primitive types as `revm`.

/// Ethereum access list types
pub mod access_list;
/// Ethereum account types
pub mod account;
/// Parent beacon types and constants
pub mod beacon;
/// Ethereum block types
pub mod block;
/// Ethereum log types
pub mod log;
/// Ethereum receipt types
pub mod receipt;
/// Remote node interaction
#[cfg(feature = "serde")]
pub mod remote;
/// Ethereum gas related types
pub mod reward_percentile;
/// RLP traits and functions
pub mod rlp;
#[cfg(feature = "serde")]
pub mod serde;
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
pub mod withdrawal;

pub use alloy_primitives::{Bloom, BloomInput, B512, B64, U64};
pub use revm_primitives::{hex_literal, AccountInfo, Address, Bytes, HashMap, SpecId, B256, U256};

/// A secret key
pub type Secret = B256;
/// A public key
pub type Public = B512;
