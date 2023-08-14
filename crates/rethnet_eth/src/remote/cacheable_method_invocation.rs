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
    /// eth_chainId
    ChainId = 1,
    /// eth_feeHistory
    FeeHistory {
        /// block count
        block_count: &'a U256,
        /// newest block
        block_spec: &'a BlockSpec,
        /// reward percentiles
        percentiles: &'a Percentiles,
    } = 3,
    /// eth_getBalance
    GetBalance {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    } = 4,
    /// eth_getBlockByNumber
    GetBlockByNumber {
        block_spec: &'a BlockSpec,

        /// include transaction data
        include_tx_data: bool,
    } = 5,
    /// eth_getBlockByHash
    GetBlockByHash {
        /// hash
        block_hash: &'a B256,
        /// include transaction data
        include_tx_data: bool,
    } = 6,
    /// eth_getBlockTransactionCountByHash
    GetBlockTransactionCountByHash { block_hash: &'a B256 } = 7,
    /// eth_getBlockTransactionCountByNumber
    GetBlockTransactionCountByNumber { block_spec: &'a BlockSpec } = 8,
    /// eth_getCode
    GetCode {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    } = 9,
    /// eth_getLogs
    GetLogs { params: &'a GetLogsInput } = 11,
    /// eth_getStorageAt
    GetStorageAt {
        address: &'a Address,
        position: &'a U256,
        block_spec: &'a Option<BlockSpec>,
    } = 12,
    /// eth_getTransactionByBlockHashAndIndex
    GetTransactionByBlockHashAndIndex {
        block_hash: &'a B256,
        index: &'a U256,
    } = 13,
    /// eth_getTransactionByBlockNumberAndIndex
    GetTransactionByBlockNumberAndIndex {
        block_number: &'a U256,
        index: &'a U256,
    } = 14,
    /// eth_getTransactionByHash
    GetTransactionByHash { transaction_hash: &'a B256 } = 15,
    /// eth_getTransactionCount
    GetTransactionCount {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    } = 16,
    /// eth_getTransactionReceipt
    GetTransactionReceipt { transaction_hash: &'a B256 } = 17,
    /// net_version
    NetVersion = 18,
}

/// Error type for [`CacheableMethodInvocation::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Method is not cacheable: {0:?}")]
pub(super) struct MethodNotCacheableError(MethodInvocation);

impl<'a> TryFrom<&'a MethodInvocation> for CacheableMethodInvocation<'a> {
    type Error = MethodNotCacheableError;

    fn try_from(value: &'a MethodInvocation) -> Result<Self, Self::Error> {
        match value {
            MethodInvocation::ChainId() => Ok(CacheableMethodInvocation::ChainId),
            MethodInvocation::FeeHistory(block_count, block_spec, percentiles) => {
                Ok(CacheableMethodInvocation::FeeHistory {
                    block_count,
                    block_spec,
                    percentiles,
                })
            }
            MethodInvocation::GetBalance(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetBalance {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetBlockByNumber(block_spec, include_tx_data) => {
                Ok(CacheableMethodInvocation::GetBlockByNumber {
                    block_spec,
                    include_tx_data: *include_tx_data,
                })
            }
            MethodInvocation::GetBlockByHash(block_hash, include_tx_data) => {
                Ok(CacheableMethodInvocation::GetBlockByHash {
                    block_hash,
                    include_tx_data: *include_tx_data,
                })
            }
            MethodInvocation::GetBlockTransactionCountByHash(block_hash) => {
                Ok(CacheableMethodInvocation::GetBlockTransactionCountByHash { block_hash })
            }
            MethodInvocation::GetBlockTransactionCountByNumber(block_spec) => {
                Ok(CacheableMethodInvocation::GetBlockTransactionCountByNumber { block_spec })
            }
            MethodInvocation::GetCode(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetCode {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetLogs(params) => Ok(CacheableMethodInvocation::GetLogs { params }),
            MethodInvocation::GetStorageAt(address, position, block_spec) => {
                Ok(CacheableMethodInvocation::GetStorageAt {
                    address,
                    position,
                    block_spec,
                })
            }
            MethodInvocation::GetTransactionByBlockHashAndIndex(block_hash, index) => Ok(
                CacheableMethodInvocation::GetTransactionByBlockHashAndIndex { block_hash, index },
            ),
            MethodInvocation::GetTransactionByBlockNumberAndIndex(block_number, index) => Ok(
                CacheableMethodInvocation::GetTransactionByBlockNumberAndIndex {
                    block_number,
                    index,
                },
            ),
            MethodInvocation::GetTransactionByHash(transaction_hash) => {
                Ok(CacheableMethodInvocation::GetTransactionByHash { transaction_hash })
            }
            MethodInvocation::GetTransactionCount(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetTransactionCount {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetTransactionReceipt(transaction_hash) => {
                Ok(CacheableMethodInvocation::GetTransactionReceipt { transaction_hash })
            }
            MethodInvocation::NetVersion() => Ok(CacheableMethodInvocation::NetVersion),

            // Explicit to make sure if a new method is added, it is not forgotten here.
            MethodInvocation::Accounts()
            | MethodInvocation::BlockNumber()
            | MethodInvocation::Call(_, _)
            | MethodInvocation::Coinbase()
            | MethodInvocation::EstimateGas(_, _)
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
