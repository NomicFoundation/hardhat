#![warn(missing_docs)]

//! Repository of information about contracts written in Solidity.

/// Model of the project's codebase
pub mod build_model;

/// Map of bytecodes to known contracts
pub mod contracts_identifier;

mod opcodes;
