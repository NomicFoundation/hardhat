use revm_primitives::{ruint::aliases::U64, Bytes};

use super::StateOverrideOptions;
use crate::{
    access_list::AccessListItem,
    remote::{
        eth::eip712,
        filter::{FilterOptions, SubscriptionType},
        BlockSpec, PreEip1898BlockSpec,
    },
    serde::{optional_single_to_sequence, sequence_to_optional_single},
    transaction::EthTransactionRequest,
    Address, B256, U256,
};

/// for specifying input to methods requiring a transaction object, like
/// `eth_call`, `eth_sendTransaction` and `eth_estimateGas`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[cfg_attr(feature = "serde", serde(deny_unknown_fields))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct CallRequest {
    /// the address from which the transaction should be sent
    pub from: Option<Address>,
    /// the address to which the transaction should be sent
    pub to: Option<Address>,
    #[cfg_attr(feature = "serde", serde(default, with = "crate::serde::optional_u64"))]
    /// gas
    pub gas: Option<u64>,
    /// gas price
    pub gas_price: Option<U256>,
    /// max base fee per gas sender is willing to pay
    pub max_fee_per_gas: Option<U256>,
    /// miner tip
    pub max_priority_fee_per_gas: Option<U256>,
    /// transaction value
    pub value: Option<U256>,
    /// transaction data
    pub data: Option<Bytes>,
    /// warm storage access pre-payment
    pub access_list: Option<Vec<AccessListItem>>,
}

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
    #[serde(rename = "eth_accounts", with = "crate::serde::empty_params")]
    Accounts(()),
    /// eth_blockNumber
    #[serde(rename = "eth_blockNumber", with = "crate::serde::empty_params")]
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
    #[serde(rename = "eth_chainId", with = "crate::serde::empty_params")]
    ChainId(()),
    /// eth_coinbase
    #[serde(rename = "eth_coinbase", with = "crate::serde::empty_params")]
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
    #[serde(rename = "eth_gasPrice", with = "crate::serde::empty_params")]
    GasPrice(()),
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
    /// eth_getBlockTransactionCountByHash
    #[serde(
        rename = "eth_getBlockTransactionCountByHash",
        with = "crate::serde::sequence"
    )]
    GetBlockTransactionCountByHash(B256),
    /// eth_getBlockTransactionCountByNumber
    #[serde(
        rename = "eth_getBlockTransactionCountByNumber",
        with = "crate::serde::sequence"
    )]
    GetBlockTransactionCountByNumber(PreEip1898BlockSpec),
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
    /// eth_getFilterChanges
    #[serde(rename = "eth_getFilterChanges", with = "crate::serde::sequence")]
    GetFilterChanges(U256),
    /// eth_getFilterLogs
    #[serde(rename = "eth_getFilterLogs", with = "crate::serde::sequence")]
    GetFilterLogs(U256),
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
    /// eth_getTransactionByBlockHashAndIndex
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    /// eth_getTransactionByBlockNumberAndIndex
    // Matching Hardhat behavior in not accepting EIP-1898 block tags
    // https://github.com/NomicFoundation/hardhat/blob/06474681f72e1cd895abbec419f6f10be3d8e4ed/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L775
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(PreEip1898BlockSpec, U256),
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
    /// eth_mining
    #[serde(rename = "eth_mining", with = "crate::serde::empty_params")]
    Mining(()),
    /// net_listening
    #[serde(rename = "net_listening", with = "crate::serde::empty_params")]
    NetListening(()),
    /// net_peerCount
    #[serde(rename = "net_peerCount", with = "crate::serde::empty_params")]
    NetPeerCount(()),
    /// net_version
    #[serde(rename = "net_version", with = "crate::serde::empty_params")]
    NetVersion(()),
    /// eth_newBlockFilter
    #[serde(rename = "eth_newBlockFilter", with = "crate::serde::empty_params")]
    NewBlockFilter(()),
    /// eth_newFilter
    #[serde(rename = "eth_newFilter", with = "crate::serde::sequence")]
    NewFilter(FilterOptions),
    /// eth_newPendingTransactionFilter
    #[serde(
        rename = "eth_newPendingTransactionFilter",
        with = "crate::serde::empty_params"
    )]
    NewPendingTransactionFilter(()),
    /// eth_pendingTransactions
    #[serde(
        rename = "eth_pendingTransactions",
        with = "crate::serde::empty_params"
    )]
    PendingTransactions(()),
    /// eth_sendRawTransaction
    #[serde(rename = "eth_sendRawTransaction", with = "crate::serde::sequence")]
    SendRawTransaction(Bytes),
    /// eth_sendTransaction
    #[serde(rename = "eth_sendTransaction", with = "crate::serde::sequence")]
    SendTransaction(EthTransactionRequest),
    /// eth_sign
    #[serde(rename = "eth_sign", alias = "personal_sign")]
    Sign(Address, Bytes),
    /// eth_signTypedData_v4
    #[serde(rename = "eth_signTypedData_v4")]
    SignTypedDataV4(Address, eip712::Message),
    /// eth_subscribe
    #[serde(rename = "eth_subscribe", with = "crate::serde::sequence")]
    Subscribe(Vec<SubscriptionType>),
    /// eth_syncing
    #[serde(rename = "eth_syncing", with = "crate::serde::empty_params")]
    Syncing(()),
    /// eth_uninstallFilter
    #[serde(rename = "eth_uninstallFilter", with = "crate::serde::sequence")]
    UninstallFilter(U256),
    /// eth_unsubscribe
    #[serde(rename = "eth_unsubscribe", with = "crate::serde::sequence")]
    Unsubscribe(U256),
    /// web3_clientVersion
    #[serde(rename = "web3_clientVersion", with = "crate::serde::empty_params")]
    Web3ClientVersion(()),
    /// web3_sha3
    #[serde(rename = "web3_sha3", with = "crate::serde::sequence")]
    Web3Sha3(Bytes),
    /// evm_increaseTime
    #[serde(rename = "evm_increaseTime", with = "crate::serde::sequence")]
    EvmIncreaseTime(U64OrUsize),
    /// evm_mine
    #[serde(
        rename = "evm_mine",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    EvmMine(Option<U64OrUsize>),
    /// evm_revert
    #[serde(rename = "evm_revert", with = "crate::serde::sequence")]
    EvmRevert(U64),
    /// evm_setAutomine
    #[serde(rename = "evm_setAutomine", with = "crate::serde::sequence")]
    EvmSetAutomine(bool),
    /// evm_setBlockGasLimit
    #[serde(rename = "evm_setBlockGasLimit", with = "crate::serde::sequence")]
    EvmSetBlockGasLimit(U64),
    /// evm_setIntervalMining
    #[serde(rename = "evm_setIntervalMining", with = "crate::serde::sequence")]
    EvmSetIntervalMining(OneUsizeOrTwo),
    /// evm_setNextBlockTimestamp
    #[serde(rename = "evm_setNextBlockTimestamp", with = "crate::serde::sequence")]
    EvmSetNextBlockTimestamp(U64OrUsize),
    /// evm_snapshot
    #[serde(rename = "evm_snapshot", with = "crate::serde::empty_params")]
    EvmSnapshot(()),
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

/// for specifying the inputs to `eth_getLogs`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLogsInput {
    /// starting block for get_logs request
    pub from_block: BlockSpec,
    /// ending block for get_logs request
    pub to_block: BlockSpec,
    /// address for get_logs request
    pub address: Address,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic(expected = "string \\\"deadbeef\\\" does not have a '0x' prefix")]
    fn test_zero_x_prefixed_bytes_deserialization_without_0x_prefix() {
        serde_json::from_str::<Bytes>("\"deadbeef\"").unwrap();
    }

    #[test]
    #[should_panic(expected = "string \\\"0deadbeef\\\" does not have a '0x' prefix")]
    fn test_zero_x_prefixed_bytes_deserialization_with_0_prefix_but_no_x() {
        serde_json::from_str::<Bytes>("\"0deadbeef\"").unwrap();
    }
}
