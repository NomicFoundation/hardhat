use edr_eth::{
    remote::{
        eth::{eip712, CallRequest},
        filter::{LogFilterOptions, SubscriptionType},
        BlockSpec, PreEip1898BlockSpec, StateOverrideOptions,
    },
    serde::{optional_single_to_sequence, sequence_to_optional_single},
    transaction::EthTransactionRequest,
    Address, Bytes, B256, U256, U64,
};

use super::serde::RpcAddress;
use crate::requests::hardhat::rpc_types::{CompilerInput, CompilerOutput, ResetProviderConfig};

mod optional_block_spec {
    use super::BlockSpec;

    pub fn latest() -> Option<BlockSpec> {
        Some(BlockSpec::latest())
    }

    pub fn pending() -> Option<BlockSpec> {
        Some(BlockSpec::pending())
    }
}

/// for an invoking a method on a remote ethereum node
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize, strum::Display)]
#[serde(tag = "method", content = "params")]
pub enum MethodInvocation {
    /// eth_accounts
    #[serde(rename = "eth_accounts", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_accounts")]
    Accounts(()),
    /// eth_blockNumber
    #[serde(rename = "eth_blockNumber", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_blockNumber")]
    BlockNumber(()),
    /// eth_call
    #[serde(rename = "eth_call")]
    #[strum(serialize = "eth_call")]
    Call(
        CallRequest,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
        #[serde(default, skip_serializing_if = "Option::is_none")] Option<StateOverrideOptions>,
    ),
    /// eth_chainId
    #[serde(rename = "eth_chainId", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_chainId")]
    ChainId(()),
    /// eth_coinbase
    #[serde(rename = "eth_coinbase", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_coinbase")]
    Coinbase(()),
    /// eth_estimateGas
    #[serde(rename = "eth_estimateGas")]
    #[strum(serialize = "eth_estimateGas")]
    EstimateGas(
        CallRequest,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::pending"
        )]
        Option<BlockSpec>,
    ),
    /// eth_feeHistory
    #[serde(rename = "eth_feeHistory")]
    #[strum(serialize = "eth_feeHistory")]
    FeeHistory(
        /// block count
        U256,
        /// newest block
        BlockSpec,
        /// reward percentiles
        #[serde(default, skip_serializing_if = "Option::is_none")]
        Option<Vec<f64>>,
    ),
    /// eth_gasPrice
    #[serde(rename = "eth_gasPrice", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_gasPrice")]
    GasPrice(()),
    /// eth_getBalance
    #[serde(rename = "eth_getBalance")]
    #[strum(serialize = "eth_getBalance")]
    GetBalance(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getBlockByNumber
    #[serde(rename = "eth_getBlockByNumber")]
    #[strum(serialize = "eth_getBlockByNumber")]
    GetBlockByNumber(
        PreEip1898BlockSpec,
        /// include transaction data
        bool,
    ),
    /// eth_getBlockByHash
    #[serde(rename = "eth_getBlockByHash")]
    #[strum(serialize = "eth_getBlockByHash")]
    GetBlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    /// eth_getBlockTransactionCountByHash
    #[serde(
        rename = "eth_getBlockTransactionCountByHash",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "eth_getBlockTransactionCountByHash")]
    GetBlockTransactionCountByHash(B256),
    /// eth_getBlockTransactionCountByNumber
    #[serde(
        rename = "eth_getBlockTransactionCountByNumber",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "eth_getBlockTransactionCountByNumber")]
    GetBlockTransactionCountByNumber(PreEip1898BlockSpec),
    /// eth_getCode
    #[serde(rename = "eth_getCode")]
    #[strum(serialize = "eth_getCode")]
    GetCode(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getFilterChanges
    #[serde(rename = "eth_getFilterChanges", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_getFilterChanges")]
    GetFilterChanges(U256),
    /// eth_getFilterLogs
    #[serde(rename = "eth_getFilterLogs", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_getFilterLogs")]
    GetFilterLogs(U256),
    /// eth_getLogs
    #[serde(rename = "eth_getLogs", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_getLogs")]
    GetLogs(LogFilterOptions),
    /// eth_getStorageAt
    #[serde(rename = "eth_getStorageAt")]
    #[strum(serialize = "eth_getStorageAt")]
    GetStorageAt(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_storage_slot")] U256,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionByBlockHashAndIndex
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    #[strum(serialize = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    /// eth_getTransactionByBlockNumberAndIndex
    // Matching Hardhat behavior in not accepting EIP-1898 block tags
    // https://github.com/NomicFoundation/hardhat/blob/06474681f72e1cd895abbec419f6f10be3d8e4ed/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L775
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    #[strum(serialize = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(PreEip1898BlockSpec, U256),
    /// eth_getTransactionByHash
    #[serde(rename = "eth_getTransactionByHash", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_getTransactionByHash")]
    GetTransactionByHash(B256),
    /// eth_getTransactionCount
    #[serde(rename = "eth_getTransactionCount")]
    #[strum(serialize = "eth_getTransactionCount")]
    GetTransactionCount(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionReceipt
    #[serde(
        rename = "eth_getTransactionReceipt",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "eth_getTransactionReceipt")]
    GetTransactionReceipt(B256),
    /// eth_mining
    #[serde(rename = "eth_mining", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_mining")]
    Mining(()),
    /// net_listening
    #[serde(rename = "net_listening", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "net_listening")]
    NetListening(()),
    /// net_peerCount
    #[serde(rename = "net_peerCount", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "net_peerCount")]
    NetPeerCount(()),
    /// net_version
    #[serde(rename = "net_version", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "net_version")]
    NetVersion(()),
    /// eth_newBlockFilter
    #[serde(rename = "eth_newBlockFilter", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_newBlockFilter")]
    NewBlockFilter(()),
    /// eth_newFilter
    #[serde(rename = "eth_newFilter", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_newFilter")]
    NewFilter(LogFilterOptions),
    /// eth_newPendingTransactionFilter
    #[serde(
        rename = "eth_newPendingTransactionFilter",
        with = "edr_eth::serde::empty_params"
    )]
    #[strum(serialize = "eth_newPendingTransactionFilter")]
    NewPendingTransactionFilter(()),
    /// eth_pendingTransactions
    #[serde(
        rename = "eth_pendingTransactions",
        with = "edr_eth::serde::empty_params"
    )]
    #[strum(serialize = "eth_pendingTransactions")]
    PendingTransactions(()),
    /// eth_sendRawTransaction
    #[serde(rename = "eth_sendRawTransaction", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_sendRawTransaction")]
    SendRawTransaction(Bytes),
    /// eth_sendTransaction
    #[serde(rename = "eth_sendTransaction", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_sendTransaction")]
    SendTransaction(EthTransactionRequest),
    /// eth_sign
    #[serde(rename = "eth_sign", alias = "personal_sign")]
    #[strum(serialize = "eth_sign")]
    Sign(
        Bytes,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
    ),
    /// eth_signTypedData_v4
    #[serde(rename = "eth_signTypedData_v4")]
    #[strum(serialize = "eth_signTypedData_v4")]
    SignTypedDataV4(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        eip712::Message,
    ),
    /// eth_subscribe
    #[serde(rename = "eth_subscribe")]
    #[strum(serialize = "eth_subscribe")]
    Subscribe(
        SubscriptionType,
        #[serde(default, skip_serializing_if = "Option::is_none")] Option<LogFilterOptions>,
    ),
    /// eth_syncing
    #[serde(rename = "eth_syncing", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "eth_syncing")]
    Syncing(()),
    /// eth_uninstallFilter
    #[serde(rename = "eth_uninstallFilter", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_uninstallFilter")]
    UninstallFilter(U256),
    /// eth_unsubscribe
    #[serde(rename = "eth_unsubscribe", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "eth_unsubscribe")]
    Unsubscribe(U256),
    /// web3_clientVersion
    #[serde(rename = "web3_clientVersion", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "web3_clientVersion")]
    Web3ClientVersion(()),
    /// web3_sha3
    #[serde(rename = "web3_sha3", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "web3_sha3")]
    Web3Sha3(Bytes),
    /// evm_increaseTime
    #[serde(rename = "evm_increaseTime", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "evm_increaseTime")]
    EvmIncreaseTime(U64OrUsize),
    /// evm_mine
    #[serde(
        rename = "evm_mine",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    #[strum(serialize = "evm_mine")]
    EvmMine(Option<U64OrUsize>),
    /// evm_revert
    #[serde(rename = "evm_revert", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "evm_revert")]
    EvmRevert(U64),
    /// evm_setAutomine
    #[serde(rename = "evm_setAutomine", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "evm_setAutomine")]
    EvmSetAutomine(bool),
    /// evm_setBlockGasLimit
    #[serde(rename = "evm_setBlockGasLimit", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "evm_setBlockGasLimit")]
    EvmSetBlockGasLimit(U64),
    /// evm_setIntervalMining
    #[serde(rename = "evm_setIntervalMining", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "evm_setIntervalMining")]
    EvmSetIntervalMining(OneUsizeOrTwo),
    /// evm_setNextBlockTimestamp
    #[serde(
        rename = "evm_setNextBlockTimestamp",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "evm_setNextBlockTimestamp")]
    EvmSetNextBlockTimestamp(U64OrUsize),
    /// evm_snapshot
    #[serde(rename = "evm_snapshot", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "evm_snapshot")]
    EvmSnapshot(()),

    /// hardhat_addCompilationResult
    #[serde(rename = "hardhat_addCompilationResult")]
    #[strum(serialize = "hardhat_addCompilationResult")]
    AddCompilationResult(
        /// solc version:
        String,
        CompilerInput,
        CompilerOutput,
    ),
    /// hardhat_dropTransaction
    #[serde(rename = "hardhat_dropTransaction", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "hardhat_dropTransaction")]
    DropTransaction(B256),
    /// hardhat_getAutomine
    #[serde(rename = "hardhat_getAutomine", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "hardhat_getAutomine")]
    GetAutomine(()),
    /// hardhat_getStackTraceFailuresCount
    #[serde(
        rename = "hardhat_getStackTraceFailuresCount",
        with = "edr_eth::serde::empty_params"
    )]
    #[strum(serialize = "hardhat_getStackTraceFailuresCount")]
    GetStackTraceFailuresCount(()),
    /// hardhat_impersonateAccount
    #[serde(
        rename = "hardhat_impersonateAccount",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "hardhat_impersonateAccount")]
    ImpersonateAccount(RpcAddress),
    /// hardhat_intervalMine
    #[serde(rename = "hardhat_intervalMine", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "hardhat_intervalMine")]
    IntervalMine(()),
    /// hardhat_metadata
    #[serde(rename = "hardhat_metadata", with = "edr_eth::serde::empty_params")]
    #[strum(serialize = "hardhat_metadata")]
    Metadata(()),
    /// hardhat_mine
    #[serde(rename = "hardhat_mine")]
    #[strum(serialize = "hardhat_mine")]
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
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    #[strum(serialize = "hardhat_reset")]
    Reset(Option<ResetProviderConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    #[strum(serialize = "hardhat_setBalance")]
    SetBalance(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_quantity")] U256,
    ),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    #[strum(serialize = "hardhat_setCode")]
    SetCode(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_data")] Bytes,
    ),
    /// hardhat_setCoinbase
    #[serde(rename = "hardhat_setCoinbase", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "hardhat_setCoinbase")]
    SetCoinbase(#[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address),
    /// hardhat_setLoggingEnabled
    #[serde(
        rename = "hardhat_setLoggingEnabled",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "hardhat_setLoggingEnabled")]
    SetLoggingEnabled(bool),
    /// hardhat_setMinGasPrice
    #[serde(rename = "hardhat_setMinGasPrice", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "hardhat_setMinGasPrice")]
    SetMinGasPrice(U256),
    /// hardhat_setNextBlockBaseFeePerGas
    #[serde(
        rename = "hardhat_setNextBlockBaseFeePerGas",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "hardhat_setNextBlockBaseFeePerGas")]
    SetNextBlockBaseFeePerGas(U256),
    /// hardhat_setNonce
    #[serde(rename = "hardhat_setNonce")]
    #[strum(serialize = "hardhat_setNonce")]
    SetNonce(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(
            deserialize_with = "crate::requests::serde::deserialize_nonce",
            serialize_with = "edr_eth::serde::u64::serialize"
        )]
        u64,
    ),
    /// hardhat_setPrevRandao
    #[serde(rename = "hardhat_setPrevRandao", with = "edr_eth::serde::sequence")]
    #[strum(serialize = "hardhat_setPrevRandao")]
    SetPrevRandao(B256),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    #[strum(serialize = "hardhat_setStorageAt")]
    SetStorageAt(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_storage_key")] U256,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_storage_value")] U256,
    ),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        with = "edr_eth::serde::sequence"
    )]
    #[strum(serialize = "hardhat_stopImpersonatingAccount")]
    StopImpersonatingAccount(RpcAddress),
}

/// an input that can be either a single usize or an array of two usize values
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum OneUsizeOrTwo {
    /// a single usize
    One(usize),
    /// an array of two usize values
    Two([usize; 2]),
}

/// an input that can be either a U256 or a usize
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum U64OrUsize {
    /// usize
    Usize(usize),
    /// U256
    U64(U64),
}

impl From<U64OrUsize> for u64 {
    fn from(either: U64OrUsize) -> Self {
        match either {
            U64OrUsize::U64(u) => u.as_limbs()[0],
            U64OrUsize::Usize(u) => u as u64,
        }
    }
}
