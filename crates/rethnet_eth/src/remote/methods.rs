use crate::{
    remote::{
        eth::eip712,
        serde_with_helpers::{sequence_to_single, single_to_sequence},
        BlockSpec, ZeroXPrefixedBytes,
    },
    Address, B256, U256,
};

/// for specifying input to methods requiring a transaction object, like eth_call,
/// eth_sendTransaction and eth_estimateGas
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

/// for specifying the inputs to eth_newFilter
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterOptions {
    /// from block
    pub from_block: Option<BlockSpec>,
    /// to block
    pub to_block: Option<BlockSpec>,
    /// address
    pub address: Option<Address>,
    /// topics
    pub topics: Option<Vec<ZeroXPrefixedBytes>>,
}

struct OptionalBlockSpecResolved;
impl OptionalBlockSpecResolved {
    fn latest() -> Option<BlockSpec> {
        Some(BlockSpec::latest())
    }

    fn pending() -> Option<BlockSpec> {
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
            default = "OptionalBlockSpecResolved::latest"
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
            default = "OptionalBlockSpecResolved::pending"
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
            default = "OptionalBlockSpecResolved::latest"
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
            default = "OptionalBlockSpecResolved::latest"
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
            default = "OptionalBlockSpecResolved::latest"
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
            default = "OptionalBlockSpecResolved::latest"
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
    #[serde(rename = "eth_sign")]
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
    Subscribe(Vec<String>),
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
    Unsubscribe(Vec<ZeroXPrefixedBytes>),
}

/// for specifying the inputs to eth_getLogs
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
