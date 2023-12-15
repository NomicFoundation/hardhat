use revm_primitives::{Address, B256};

use crate::{
    remote::{eth::GetLogsInput, BlockSpec, PreEip1898BlockSpec},
    U256,
};

/// Methods for requests to a remote Ethereum node. Only contains methods
/// supported by the [`crate::remote::client::RpcClient`].
#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(tag = "method", content = "params")]
pub enum RequestMethod {
    /// eth_blockNumber
    #[serde(rename = "eth_blockNumber", with = "crate::serde::empty_params")]
    BlockNumber(()),
    /// eth_chainId
    #[serde(rename = "eth_chainId", with = "crate::serde::empty_params")]
    ChainId(()),
    /// eth_getBalance
    #[serde(rename = "eth_getBalance")]
    GetBalance(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getBlockByNumber
    #[serde(rename = "eth_getBlockByNumber")]
    GetBlockByNumber(
        PreEip1898BlockSpec,
        /// include transaction data
        bool,
    ),
    /// eth_getBlockByHash
    #[serde(rename = "eth_getBlockByHash")]
    GetBlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    /// eth_getCode
    #[serde(rename = "eth_getCode")]
    GetCode(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getLogs
    #[serde(rename = "eth_getLogs", with = "crate::serde::sequence")]
    GetLogs(GetLogsInput),
    /// eth_getStorageAt
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        Address,
        /// position
        U256,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionByHash
    #[serde(rename = "eth_getTransactionByHash", with = "crate::serde::sequence")]
    GetTransactionByHash(B256),
    /// eth_getTransactionCount
    #[serde(rename = "eth_getTransactionCount")]
    GetTransactionCount(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionReceipt
    #[serde(rename = "eth_getTransactionReceipt", with = "crate::serde::sequence")]
    GetTransactionReceipt(B256),
    /// net_version
    #[serde(rename = "net_version", with = "crate::serde::empty_params")]
    NetVersion(()),
}
