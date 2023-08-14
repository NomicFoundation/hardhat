use crate::remote::methods::{GetLogsInput, MethodInvocation, Percentiles, TransactionInput};
use crate::remote::BlockSpec;
use crate::U256;
use revm_primitives::{Address, B256};

/// These method invocations are hashable and can be potentially cached.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
// Using repr(u8) to let us assign a number to each variant which is important to make sure hashing
// remains consistent if new variants are added or if variants are reordered.
#[repr(u8)]
pub(super) enum CacheableMethodInvocation<'a> {
    /// eth_call
    Call(&'a TransactionInput, &'a Option<BlockSpec>) = 0,
    /// eth_chainId
    ChainId() = 1,
    /// eth_estimateGas
    EstimateGas(&'a TransactionInput, &'a Option<BlockSpec>) = 2,
    /// eth_feeHistory
    FeeHistory(
        /// block count
        &'a U256,
        /// newest block
        &'a BlockSpec,
        /// reward percentiles
        &'a Percentiles,
    ) = 3,
    /// eth_getBalance
    GetBalance(&'a Address, &'a Option<BlockSpec>) = 4,
    /// eth_getBlockByNumber
    GetBlockByNumber(
        &'a BlockSpec,
        /// include transaction data
        bool,
    ) = 5,
    /// eth_getBlockByHash
    GetBlockByHash(
        /// hash
        &'a B256,
        /// include transaction data
        bool,
    ) = 6,
    /// eth_getBlockTransactionCountByHash
    GetBlockTransactionCountByHash(&'a B256) = 7,
    /// eth_getBlockTransactionCountByNumber
    GetBlockTransactionCountByNumber(&'a BlockSpec) = 8,
    /// eth_getCode
    GetCode(&'a Address, &'a Option<BlockSpec>) = 9,
    /// eth_getLogs
    GetLogs(&'a GetLogsInput) = 11,
    /// eth_getStorageAt
    GetStorageAt(
        &'a Address,
        /// position
        &'a U256,
        &'a Option<BlockSpec>,
    ) = 12,
    /// eth_getTransactionByBlockHashAndIndex
    GetTransactionByBlockHashAndIndex(&'a B256, &'a U256) = 13,
    /// eth_getTransactionByBlockNumberAndIndex
    GetTransactionByBlockNumberAndIndex(&'a U256, &'a U256) = 14,
    /// eth_getTransactionByHash
    GetTransactionByHash(&'a B256) = 15,
    /// eth_getTransactionCount
    GetTransactionCount(&'a Address, &'a Option<BlockSpec>) = 16,
    /// eth_getTransactionReceipt
    GetTransactionReceipt(&'a B256) = 17,
    /// net_version
    NetVersion() = 18,
}

/// Error type for [`CacheableMethodInvocation::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Method is not cacheable: {0:?}")]
pub(super) struct MethodNotCacheableError(MethodInvocation);

impl<'a> TryFrom<&'a MethodInvocation> for CacheableMethodInvocation<'a> {
    type Error = MethodNotCacheableError;

    fn try_from(value: &'a MethodInvocation) -> Result<Self, Self::Error> {
        use CacheableMethodInvocation as CMI;
        use MethodInvocation as MI;

        match value {
            MI::Call(transaction_input, block_spec) => Ok(CMI::Call(transaction_input, block_spec)),
            MI::ChainId() => Ok(CMI::ChainId()),
            MI::EstimateGas(transaction_input, block_spec) => {
                Ok(CMI::EstimateGas(transaction_input, block_spec))
            }
            MI::FeeHistory(block_count, newest_block, percentiles) => {
                Ok(CMI::FeeHistory(block_count, newest_block, percentiles))
            }
            MI::GetBalance(address, block_spec) => Ok(CMI::GetBalance(address, block_spec)),
            MI::GetBlockByNumber(block_spec, include_tx_data) => {
                Ok(CMI::GetBlockByNumber(block_spec, *include_tx_data))
            }
            MI::GetBlockByHash(hash, include_tx_data) => {
                Ok(CMI::GetBlockByHash(hash, *include_tx_data))
            }
            MI::GetBlockTransactionCountByHash(hash) => {
                Ok(CMI::GetBlockTransactionCountByHash(hash))
            }
            MI::GetBlockTransactionCountByNumber(block_spec) => {
                Ok(CMI::GetBlockTransactionCountByNumber(block_spec))
            }
            MI::GetCode(address, block_spec) => Ok(CMI::GetCode(address, block_spec)),
            MI::GetLogs(params) => Ok(CMI::GetLogs(params)),
            MI::GetStorageAt(address, position, block_spec) => {
                Ok(CMI::GetStorageAt(address, position, block_spec))
            }
            MI::GetTransactionByBlockHashAndIndex(block_hash, index) => {
                Ok(CMI::GetTransactionByBlockHashAndIndex(block_hash, index))
            }
            MI::GetTransactionByBlockNumberAndIndex(block_number, index) => Ok(
                CMI::GetTransactionByBlockNumberAndIndex(block_number, index),
            ),
            MI::GetTransactionByHash(hash) => Ok(CMI::GetTransactionByHash(hash)),
            MI::GetTransactionCount(address, block_spec) => {
                Ok(CMI::GetTransactionCount(address, block_spec))
            }
            MI::GetTransactionReceipt(hash) => Ok(CMI::GetTransactionReceipt(hash)),
            MI::NetVersion() => Ok(CMI::NetVersion()),

            // Explicit to make sure if a new method is added, it is not forgotten here.
            MI::Accounts()
            | MI::BlockNumber()
            | MI::Coinbase()
            | MI::GasPrice()
            | MI::GetFilterChanges(_)
            | MI::GetFilterLogs(_)
            | MI::Mining()
            | MI::NetListening()
            | MI::NetPeerCount()
            | MI::NewBlockFilter()
            | MI::NewFilter(_)
            | MI::NewPendingTransactionFilter()
            | MI::PendingTransactions()
            | MI::SendRawTransaction(_)
            | MI::SendTransaction(_)
            | MI::Sign(_, _)
            | MI::SignTypedDataV4(_, _)
            | MI::Subscribe(_)
            | MI::Syncing()
            | MI::UninstallFilter(_)
            | MI::Unsubscribe(_)
            | MI::Web3ClientVersion()
            | MI::Web3Sha3(_)
            | MI::EvmIncreaseTime(_)
            | MI::EvmMine(_)
            | MI::EvmSetAutomine(_)
            | MI::EvmSetNextBlockTimestamp(_)
            | MI::EvmSnapshot() => Err(MethodNotCacheableError(value.clone())),
        }
    }
}
