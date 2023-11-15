use edr_eth::{
    serde::{sequence_to_single, single_to_sequence, ZeroXPrefixedBytes},
    Address, B256, U256,
};

use self::{
    compiler::{CompilerInput, CompilerOutput},
    config::ResetProviderConfig,
};

/// Compiler input and output structures used as parameters to Hardhat RPC
/// methods
pub mod compiler;

/// Configuration types for Hardhat RPC methods
pub mod config;

/// an invocation of a hardhat_* RPC method, with its parameters
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
#[allow(clippy::large_enum_variant)]
pub enum Request {
    /// hardhat_addCompilationResult
    #[serde(rename = "hardhat_addCompilationResult")]
    AddCompilationResult(
        /// solc version:
        String,
        CompilerInput,
        CompilerOutput,
    ),
    /// hardhat_dropTransaction
    #[serde(
        rename = "hardhat_dropTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    DropTransaction(B256),
    /// hardhat_getAutomine
    #[serde(rename = "hardhat_getAutomine")]
    GetAutomine(),
    /// hardhat_getStackTraceFailuresCount
    #[serde(rename = "hardhat_getStackTraceFailuresCount")]
    GetStackTraceFailuresCount(),
    /// hardhat_impersonateAccount
    #[serde(
        rename = "hardhat_impersonateAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    ImpersonateAccount(Address),
    /// hardhat_intervalMine
    #[serde(rename = "hardhat_intervalMine")]
    IntervalMine(),
    /// hardhat_metadata
    #[serde(rename = "hardhat_metadata")]
    Metadata(),
    /// hardhat_mine
    #[serde(rename = "hardhat_mine")]
    Mine(
        /// block count:
        #[serde(default, with = "edr_eth::serde::optional_u64")]
        Option<u64>,
        /// interval:
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            with = "edr_eth::serde::optional_u64"
        )]
        Option<u64>,
    ),
    /// hardhat_reset
    #[serde(
        rename = "hardhat_reset",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Reset(Option<ResetProviderConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    SetBalance(Address, U256),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    SetCode(Address, ZeroXPrefixedBytes),
    /// hardhat_setCoinbase
    #[serde(
        rename = "hardhat_setCoinbase",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetCoinbase(Address),
    /// hardhat_setLoggingEnabled
    #[serde(
        rename = "hardhat_setLoggingEnabled",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetLoggingEnabled(bool),
    /// hardhat_setMinGasPrice
    #[serde(
        rename = "hardhat_setMinGasPrice",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetMinGasPrice(U256),
    /// hardhat_setNextBlockBaseFeePerGas
    #[serde(
        rename = "hardhat_setNextBlockBaseFeePerGas",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetNextBlockBaseFeePerGas(U256),
    /// hardhat_setNonce
    #[serde(rename = "hardhat_setNonce")]
    SetNonce(Address, #[serde(with = "edr_eth::serde::u64")] u64),
    /// hardhat_setPrevRandao
    #[serde(
        rename = "hardhat_setPrevRandao",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SetPrevRandao(B256),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    SetStorageAt(Address, U256, U256),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    StopImpersonatingAccount(Address),
}
