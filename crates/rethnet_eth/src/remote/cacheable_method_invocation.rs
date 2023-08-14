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
        match value {
            MethodInvocation::Call(transaction_input, block_spec) => Ok(
                CacheableMethodInvocation::Call(transaction_input, block_spec),
            ),
            MethodInvocation::ChainId() => Ok(CacheableMethodInvocation::ChainId()),
            MethodInvocation::EstimateGas(transaction_input, block_spec) => Ok(
                CacheableMethodInvocation::EstimateGas(transaction_input, block_spec),
            ),
            MethodInvocation::FeeHistory(block_count, newest_block, percentiles) => Ok(
                CacheableMethodInvocation::FeeHistory(block_count, newest_block, percentiles),
            ),
            MethodInvocation::GetBalance(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetBalance(address, block_spec))
            }
            MethodInvocation::GetBlockByNumber(block_spec, include_tx_data) => Ok(
                CacheableMethodInvocation::GetBlockByNumber(block_spec, *include_tx_data),
            ),
            MethodInvocation::GetBlockByHash(hash, include_tx_data) => Ok(
                CacheableMethodInvocation::GetBlockByHash(hash, *include_tx_data),
            ),
            MethodInvocation::GetBlockTransactionCountByHash(hash) => Ok(
                CacheableMethodInvocation::GetBlockTransactionCountByHash(hash),
            ),
            MethodInvocation::GetBlockTransactionCountByNumber(block_spec) => Ok(
                CacheableMethodInvocation::GetBlockTransactionCountByNumber(block_spec),
            ),
            MethodInvocation::GetCode(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetCode(address, block_spec))
            }
            MethodInvocation::GetLogs(params) => Ok(CacheableMethodInvocation::GetLogs(params)),
            MethodInvocation::GetStorageAt(address, position, block_spec) => Ok(
                CacheableMethodInvocation::GetStorageAt(address, position, block_spec),
            ),
            MethodInvocation::GetTransactionByBlockHashAndIndex(block_hash, index) => {
                Ok(CacheableMethodInvocation::GetTransactionByBlockHashAndIndex(block_hash, index))
            }
            MethodInvocation::GetTransactionByBlockNumberAndIndex(block_number, index) => Ok(
                CacheableMethodInvocation::GetTransactionByBlockNumberAndIndex(block_number, index),
            ),
            MethodInvocation::GetTransactionByHash(hash) => {
                Ok(CacheableMethodInvocation::GetTransactionByHash(hash))
            }
            MethodInvocation::GetTransactionCount(address, block_spec) => Ok(
                CacheableMethodInvocation::GetTransactionCount(address, block_spec),
            ),
            MethodInvocation::GetTransactionReceipt(hash) => {
                Ok(CacheableMethodInvocation::GetTransactionReceipt(hash))
            }
            MethodInvocation::NetVersion() => Ok(CacheableMethodInvocation::NetVersion()),

            // Explicit to make sure if a new method is added, it is not forgotten here.
            MethodInvocation::Accounts()
            | MethodInvocation::BlockNumber()
            | MethodInvocation::Coinbase()
            | MethodInvocation::GasPrice()
            | MethodInvocation::GetFilterChanges(_)
            | MethodInvocation::GetFilterLogs(_)
            | MethodInvocation::Mining()
            | MethodInvocation::NetListening()
            | MethodInvocation::NetPeerCount()
            | MethodInvocation::NewBlockFilter()
            | MethodInvocation::NewFilter(_)
            | MethodInvocation::NewPendingTransactionFilter()
            | MethodInvocation::PendingTransactions()
            | MethodInvocation::SendRawTransaction(_)
            | MethodInvocation::SendTransaction(_)
            | MethodInvocation::Sign(_, _)
            | MethodInvocation::SignTypedDataV4(_, _)
            | MethodInvocation::Subscribe(_)
            | MethodInvocation::Syncing()
            | MethodInvocation::UninstallFilter(_)
            | MethodInvocation::Unsubscribe(_)
            | MethodInvocation::Web3ClientVersion()
            | MethodInvocation::Web3Sha3(_)
            | MethodInvocation::EvmIncreaseTime(_)
            | MethodInvocation::EvmMine(_)
            | MethodInvocation::EvmSetAutomine(_)
            | MethodInvocation::EvmSetNextBlockTimestamp(_)
            | MethodInvocation::EvmSnapshot() => Err(MethodNotCacheableError(value.clone())),
        }
    }
}
