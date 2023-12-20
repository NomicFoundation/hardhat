/// Compiler input and output structures used as parameters to Hardhat RPC
/// methods
pub mod compiler;
/// Configuration types for Hardhat RPC methods
pub mod config;
mod metadata;

use edr_eth::{Address, Bytes, B256, U256};

pub use self::metadata::{ForkMetadata, Metadata};
use self::{
    compiler::{CompilerInput, CompilerOutput},
    config::ResetProviderConfig,
};

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
    #[serde(rename = "hardhat_dropTransaction", with = "edr_eth::serde::sequence")]
    DropTransaction(B256),
    /// hardhat_getAutomine
    #[serde(rename = "hardhat_getAutomine", with = "edr_eth::serde::empty_params")]
    GetAutomine(()),
    /// hardhat_getStackTraceFailuresCount
    #[serde(
        rename = "hardhat_getStackTraceFailuresCount",
        with = "edr_eth::serde::empty_params"
    )]
    GetStackTraceFailuresCount(()),
    /// hardhat_impersonateAccount
    #[serde(
        rename = "hardhat_impersonateAccount",
        with = "edr_eth::serde::sequence"
    )]
    ImpersonateAccount(Address),
    /// hardhat_intervalMine
    #[serde(rename = "hardhat_intervalMine", with = "edr_eth::serde::empty_params")]
    IntervalMine(()),
    /// hardhat_metadata
    #[serde(rename = "hardhat_metadata", with = "edr_eth::serde::empty_params")]
    Metadata(()),
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
    #[serde(rename = "hardhat_reset", with = "edr_eth::serde::sequence")]
    Reset(Option<ResetProviderConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    SetBalance(Address, U256),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    SetCode(Address, Bytes),
    /// hardhat_setCoinbase
    #[serde(rename = "hardhat_setCoinbase", with = "edr_eth::serde::sequence")]
    SetCoinbase(Address),
    /// hardhat_setLoggingEnabled
    #[serde(
        rename = "hardhat_setLoggingEnabled",
        with = "edr_eth::serde::sequence"
    )]
    SetLoggingEnabled(bool),
    /// hardhat_setMinGasPrice
    #[serde(rename = "hardhat_setMinGasPrice", with = "edr_eth::serde::sequence")]
    SetMinGasPrice(U256),
    /// hardhat_setNextBlockBaseFeePerGas
    #[serde(
        rename = "hardhat_setNextBlockBaseFeePerGas",
        with = "edr_eth::serde::sequence"
    )]
    SetNextBlockBaseFeePerGas(U256),
    /// hardhat_setNonce
    #[serde(rename = "hardhat_setNonce")]
    SetNonce(Address, #[serde(with = "edr_eth::serde::u64")] u64),
    /// hardhat_setPrevRandao
    #[serde(rename = "hardhat_setPrevRandao", with = "edr_eth::serde::sequence")]
    SetPrevRandao(B256),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    SetStorageAt(Address, U256, U256),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        with = "edr_eth::serde::sequence"
    )]
    StopImpersonatingAccount(Address),
}
