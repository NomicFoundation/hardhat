use edr_eth::{
    remote::{
        eth::{eip712, CallRequest, GetLogsInput},
        filter::{FilterOptions, SubscriptionType},
        BlockSpec, PreEip1898BlockSpec, StateOverrideOptions,
    },
    serde::{optional_single_to_sequence, sequence_to_optional_single},
    transaction::EthTransactionRequest,
    Address, Bytes, B256, U256, U64,
};

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
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
pub enum MethodInvocation {
    /// eth_accounts
    #[serde(rename = "eth_accounts", with = "edr_eth::serde::empty_params")]
    Accounts(()),
    /// eth_blockNumber
    #[serde(rename = "eth_blockNumber", with = "edr_eth::serde::empty_params")]
    BlockNumber(()),
    /// eth_call
    #[serde(rename = "eth_call")]
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
    ChainId(()),
    /// eth_coinbase
    #[serde(rename = "eth_coinbase", with = "edr_eth::serde::empty_params")]
    Coinbase(()),
    /// eth_estimateGas
    #[serde(rename = "eth_estimateGas")]
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
    FeeHistory(
        /// block count
        U256,
        /// newest block
        BlockSpec,
        /// reward percentiles
        Vec<f64>,
    ),
    /// eth_gasPrice
    #[serde(rename = "eth_gasPrice", with = "edr_eth::serde::empty_params")]
    GasPrice(()),
    /// eth_getBalance
    #[serde(rename = "eth_getBalance")]
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
    /// eth_getBlockTransactionCountByHash
    #[serde(
        rename = "eth_getBlockTransactionCountByHash",
        with = "edr_eth::serde::sequence"
    )]
    GetBlockTransactionCountByHash(B256),
    /// eth_getBlockTransactionCountByNumber
    #[serde(
        rename = "eth_getBlockTransactionCountByNumber",
        with = "edr_eth::serde::sequence"
    )]
    GetBlockTransactionCountByNumber(PreEip1898BlockSpec),
    /// eth_getCode
    #[serde(rename = "eth_getCode")]
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
    GetFilterChanges(U256),
    /// eth_getFilterLogs
    #[serde(rename = "eth_getFilterLogs", with = "edr_eth::serde::sequence")]
    GetFilterLogs(U256),
    /// eth_getLogs
    #[serde(rename = "eth_getLogs", with = "edr_eth::serde::sequence")]
    GetLogs(GetLogsInput),
    /// eth_getStorageAt
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_storage_index")] U256,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionByBlockHashAndIndex
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    /// eth_getTransactionByBlockNumberAndIndex
    // Matching Hardhat behavior in not accepting EIP-1898 block tags
    // https://github.com/NomicFoundation/hardhat/blob/06474681f72e1cd895abbec419f6f10be3d8e4ed/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L775
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(PreEip1898BlockSpec, U256),
    /// eth_getTransactionByHash
    #[serde(rename = "eth_getTransactionByHash", with = "edr_eth::serde::sequence")]
    GetTransactionByHash(B256),
    /// eth_getTransactionCount
    #[serde(rename = "eth_getTransactionCount")]
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
    GetTransactionReceipt(B256),
    /// eth_mining
    #[serde(rename = "eth_mining", with = "edr_eth::serde::empty_params")]
    Mining(()),
    /// net_listening
    #[serde(rename = "net_listening", with = "edr_eth::serde::empty_params")]
    NetListening(()),
    /// net_peerCount
    #[serde(rename = "net_peerCount", with = "edr_eth::serde::empty_params")]
    NetPeerCount(()),
    /// net_version
    #[serde(rename = "net_version", with = "edr_eth::serde::empty_params")]
    NetVersion(()),
    /// eth_newBlockFilter
    #[serde(rename = "eth_newBlockFilter", with = "edr_eth::serde::empty_params")]
    NewBlockFilter(()),
    /// eth_newFilter
    #[serde(rename = "eth_newFilter", with = "edr_eth::serde::sequence")]
    NewFilter(FilterOptions),
    /// eth_newPendingTransactionFilter
    #[serde(
        rename = "eth_newPendingTransactionFilter",
        with = "edr_eth::serde::empty_params"
    )]
    NewPendingTransactionFilter(()),
    /// eth_pendingTransactions
    #[serde(
        rename = "eth_pendingTransactions",
        with = "edr_eth::serde::empty_params"
    )]
    PendingTransactions(()),
    /// eth_sendRawTransaction
    #[serde(rename = "eth_sendRawTransaction", with = "edr_eth::serde::sequence")]
    SendRawTransaction(Bytes),
    /// eth_sendTransaction
    #[serde(rename = "eth_sendTransaction", with = "edr_eth::serde::sequence")]
    SendTransaction(EthTransactionRequest),
    /// eth_sign
    #[serde(rename = "eth_sign", alias = "personal_sign")]
    Sign(
        Bytes,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
    ),
    /// eth_signTypedData_v4
    #[serde(rename = "eth_signTypedData_v4")]
    SignTypedDataV4(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        eip712::Message,
    ),
    /// eth_subscribe
    #[serde(rename = "eth_subscribe", with = "edr_eth::serde::sequence")]
    Subscribe(Vec<SubscriptionType>),
    /// eth_syncing
    #[serde(rename = "eth_syncing", with = "edr_eth::serde::empty_params")]
    Syncing(()),
    /// eth_uninstallFilter
    #[serde(rename = "eth_uninstallFilter", with = "edr_eth::serde::sequence")]
    UninstallFilter(U256),
    /// eth_unsubscribe
    #[serde(rename = "eth_unsubscribe", with = "edr_eth::serde::sequence")]
    Unsubscribe(U256),
    /// web3_clientVersion
    #[serde(rename = "web3_clientVersion", with = "edr_eth::serde::empty_params")]
    Web3ClientVersion(()),
    /// web3_sha3
    #[serde(rename = "web3_sha3", with = "edr_eth::serde::sequence")]
    Web3Sha3(Bytes),
    /// evm_increaseTime
    #[serde(rename = "evm_increaseTime", with = "edr_eth::serde::sequence")]
    EvmIncreaseTime(U64OrUsize),
    /// evm_mine
    #[serde(
        rename = "evm_mine",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    EvmMine(Option<U64OrUsize>),
    /// evm_revert
    #[serde(rename = "evm_revert", with = "edr_eth::serde::sequence")]
    EvmRevert(U64),
    /// evm_setAutomine
    #[serde(rename = "evm_setAutomine", with = "edr_eth::serde::sequence")]
    EvmSetAutomine(bool),
    /// evm_setBlockGasLimit
    #[serde(rename = "evm_setBlockGasLimit", with = "edr_eth::serde::sequence")]
    EvmSetBlockGasLimit(U64),
    /// evm_setIntervalMining
    #[serde(rename = "evm_setIntervalMining", with = "edr_eth::serde::sequence")]
    EvmSetIntervalMining(OneUsizeOrTwo),
    /// evm_setNextBlockTimestamp
    #[serde(
        rename = "evm_setNextBlockTimestamp",
        with = "edr_eth::serde::sequence"
    )]
    EvmSetNextBlockTimestamp(U64OrUsize),
    /// evm_snapshot
    #[serde(rename = "evm_snapshot", with = "edr_eth::serde::empty_params")]
    EvmSnapshot(()),

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
    ImpersonateAccount(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
    ),
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
    #[serde(
        rename = "hardhat_reset",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    Reset(Option<ResetProviderConfig>),
    /// hardhat_setBalance
    #[serde(rename = "hardhat_setBalance")]
    SetBalance(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_quantity")] U256,
    ),
    /// hardhat_setCode
    #[serde(rename = "hardhat_setCode")]
    SetCode(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        #[serde(deserialize_with = "crate::requests::serde::deserialize_data")] Bytes,
    ),
    /// hardhat_setCoinbase
    #[serde(rename = "hardhat_setCoinbase", with = "edr_eth::serde::sequence")]
    SetCoinbase(#[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address),
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
    SetPrevRandao(B256),
    /// hardhat_setStorageAt
    #[serde(rename = "hardhat_setStorageAt")]
    SetStorageAt(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
        U256,
        U256,
    ),
    /// hardhat_stopImpersonatingAccount
    #[serde(
        rename = "hardhat_stopImpersonatingAccount",
        with = "edr_eth::serde::sequence"
    )]
    StopImpersonatingAccount(
        #[serde(deserialize_with = "crate::requests::serde::deserialize_address")] Address,
    ),
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
