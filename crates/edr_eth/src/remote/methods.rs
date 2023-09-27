use revm_primitives::ruint::aliases::U64;

use crate::{
    remote::{
        eth::eip712,
        filter::{FilterOptions, SubscriptionType},
        BlockSpec,
    },
    serde::{
        optional_single_to_sequence, sequence_to_optional_single, sequence_to_single,
        single_to_sequence, ZeroXPrefixedBytes,
    },
    Address, B256, U256,
};

/// for specifying input to methods requiring a transaction object, like `eth_call`,
/// `eth_sendTransaction` and `eth_estimateGas`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct TransactionInput {
    /// the address from which the transaction should be sent
    pub from: Option<Address>,
    /// the address to which the transaction should be sent
    pub to: Option<Address>,
    /// gas
    pub gas: Option<U256>,
    /// gas price
    #[serde(rename = "gasPrice")]
    pub gas_price: Option<U256>,
    /// transaction value
    pub value: Option<U256>,
    /// transaction data
    pub data: Option<ZeroXPrefixedBytes>,
}

mod optional_block_spec_resolved {
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
    #[serde(rename = "eth_accounts")]
    Accounts(),
    /// eth_block_number
    #[serde(rename = "eth_blockNumber")]
    BlockNumber(),
    /// eth_call
    #[serde(rename = "eth_call")]
    Call(
        TransactionInput,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_chainId
    #[serde(rename = "eth_chainId")]
    ChainId(),
    /// eth_coinbase
    #[serde(rename = "eth_coinbase")]
    Coinbase(),
    /// eth_estimateGas
    #[serde(rename = "eth_estimateGas")]
    EstimateGas(
        TransactionInput,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::pending"
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
    #[serde(rename = "eth_gasPrice")]
    GasPrice(),
    /// eth_getBalance
    #[serde(rename = "eth_getBalance")]
    GetBalance(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getBlockByNumber
    #[serde(rename = "eth_getBlockByNumber")]
    GetBlockByNumber(
        BlockSpec,
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
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetBlockTransactionCountByHash(B256),
    /// eth_getBlockTransactionCountByNumber
    #[serde(
        rename = "eth_getBlockTransactionCountByNumber",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetBlockTransactionCountByNumber(BlockSpec),
    /// eth_getCode
    #[serde(rename = "eth_getCode")]
    GetCode(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getFilterChanges
    #[serde(
        rename = "eth_getFilterChanges",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetFilterChanges(U256),
    /// eth_getFilterLogs
    #[serde(
        rename = "eth_getFilterLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetFilterLogs(U256),
    /// eth_getLogs
    #[serde(
        rename = "eth_getLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetLogs(GetLogsInput),
    /// eth_getStorageAt
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        Address,
        /// position
        U256,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionByBlockHashAndIndex
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    /// eth_getTransactionByBlockNumberAndIndex
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(U256, U256),
    /// eth_getTransactionByHash
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionByHash(B256),
    /// eth_getTransactionCount
    #[serde(rename = "eth_getTransactionCount")]
    GetTransactionCount(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionReceipt
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionReceipt(B256),
    /// eth_mining
    #[serde(rename = "eth_mining")]
    Mining(),
    /// net_listening
    #[serde(rename = "net_listening")]
    NetListening(),
    /// net_peerCount
    #[serde(rename = "net_peerCount")]
    NetPeerCount(),
    /// net_version
    #[serde(rename = "net_version")]
    NetVersion(),
    /// eth_newBlockFilter
    #[serde(rename = "eth_newBlockFilter")]
    NewBlockFilter(),
    /// eth_newFilter
    #[serde(
        rename = "eth_newFilter",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    NewFilter(FilterOptions),
    /// eth_newPendingTransactionFilter
    #[serde(rename = "eth_newPendingTransactionFilter")]
    NewPendingTransactionFilter(),
    /// eth_pendingTransactions
    #[serde(rename = "eth_pendingTransactions")]
    PendingTransactions(),
    /// eth_sendRawTransaction
    #[serde(
        rename = "eth_sendRawTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SendRawTransaction(ZeroXPrefixedBytes),
    /// eth_sendTransaction
    #[serde(
        rename = "eth_sendTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SendTransaction(TransactionInput),
    /// eth_sign
    #[serde(rename = "eth_sign", alias = "personal_sign")]
    Sign(Address, ZeroXPrefixedBytes),
    /// eth_signTypedData_v4
    #[serde(rename = "eth_signTypedData_v4")]
    SignTypedDataV4(Address, eip712::Message),
    /// eth_subscribe
    #[serde(
        rename = "eth_subscribe",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Subscribe(Vec<SubscriptionType>),
    /// eth_syncing
    #[serde(rename = "eth_syncing")]
    Syncing(),
    /// eth_uninstallFilter
    #[serde(
        rename = "eth_uninstallFilter",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    UninstallFilter(U256),
    /// eth_unsubscribe
    #[serde(
        rename = "eth_unsubscribe",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Unsubscribe(U256),
    /// web3_clientVersion
    #[serde(rename = "web3_clientVersion")]
    Web3ClientVersion(),
    /// web3_sha3
    #[serde(
        rename = "web3_sha3",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Web3Sha3(ZeroXPrefixedBytes),
    /// evm_increaseTime
    #[serde(
        rename = "evm_increaseTime",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmIncreaseTime(U64OrUsize),
    /// evm_mine
    #[serde(
        rename = "evm_mine",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    EvmMine(Option<U64OrUsize>),
    /// evm_setAutomine
    #[serde(
        rename = "evm_setAutomine",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmSetAutomine(bool),
    /// evm_setIntervalMining
    #[serde(
        rename = "evm_setIntervalMining",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmSetIntervalMining(OneUsizeOrTwo),
    /// evm_setNextBlockTimestamp
    #[serde(
        rename = "evm_setNextBlockTimestamp",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmSetNextBlockTimestamp(U64OrUsize),
    /// evm_snapshot
    #[serde(rename = "evm_snapshot")]
    EvmSnapshot(),
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
        serde_json::from_str::<ZeroXPrefixedBytes>("\"deadbeef\"").unwrap();
    }

    #[test]
    #[should_panic(expected = "string \\\"0deadbeef\\\" does not have a '0x' prefix")]
    fn test_zero_x_prefixed_bytes_deserialization_with_0_prefix_but_no_x() {
        serde_json::from_str::<ZeroXPrefixedBytes>("\"0deadbeef\"").unwrap();
    }
}
