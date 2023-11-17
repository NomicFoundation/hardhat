mod config;
mod data;
mod error;
mod filter;
mod logger;
mod requests;
/// Test utilities
#[cfg(test)]
pub mod test_utils;

use data::{CreationError, ProviderData};
use parking_lot::Mutex;
use requests::{
    eth::{self, handle_evm_mine_request},
    hardhat,
};
use tokio::runtime;

use self::requests::{EthRequest, Request};
pub use self::{
    config::{AccountConfig, ProviderConfig},
    error::ProviderError,
    requests::ProviderRequest,
};

/// A JSON-RPC provider for Ethereum.
///
/// Add a layer in front that handles this
///
/// ```rust,ignore
/// let RpcRequest {
///     version,
///     method: request,
///     id,
/// } = request;
///
/// if version != jsonrpc::Version::V2_0 {
///     return Err(ProviderError::RpcVersion(version));
/// }
///
/// fn to_response(
///     id: jsonrpc::Id,
///     result: Result<serde_json::Value, ProviderError>,
/// ) -> jsonrpc::Response<serde_json::Value> { let data = match result {
///   Ok(result) => jsonrpc::ResponseData::Success { result }, Err(error) =>
///   jsonrpc::ResponseData::Error { error: jsonrpc::Error { code: -32000,
///   message: error.to_string(), data: None, }, }, };
///
///     jsonrpc::Response {
///         jsonrpc: jsonrpc::Version::V2_0,
///         id,
///         data,
///     }
/// }
/// ```
pub struct Provider {
    data: Mutex<ProviderData>,
}

impl Provider {
    /// Constructs a new instance.
    pub async fn new(
        runtime: &runtime::Handle,
        config: &ProviderConfig,
    ) -> Result<Self, CreationError> {
        let data = ProviderData::new(runtime, config).await?;

        Ok(Self {
            data: Mutex::new(data),
        })
    }

    pub fn handle_request(
        &self,
        request: ProviderRequest,
    ) -> Result<serde_json::Value, ProviderError> {
        let mut data = self.data.lock();

        // TODO: resolve deserialization defaults using data
        // Will require changes to `ProviderRequest` to receive `json_serde::Value`

        match request {
            ProviderRequest::Single(request) => handle_single_request(&mut data, request),
            ProviderRequest::Batch(requests) => handle_batch_request(&mut data, requests),
        }
    }
}

/// Handles a JSON request for an execution provider.
fn handle_single_request(
    data: &mut ProviderData,
    request: Request,
) -> Result<serde_json::Value, ProviderError> {
    match request {
        Request::Eth(request) => handle_eth_request(data, request),
        Request::Hardhat(request) => handle_hardhat_request(data, request),
    }
}

/// Handles a batch of JSON requests for an execution provider.
fn handle_batch_request(
    data: &mut ProviderData,
    request: Vec<Request>,
) -> Result<serde_json::Value, ProviderError> {
    let mut results = Vec::new();

    for req in request {
        results.push(handle_single_request(data, req)?);
    }

    serde_json::to_value(results).map_err(ProviderError::Serialization)
}

fn handle_eth_request(
    data: &mut ProviderData,
    request: EthRequest,
) -> Result<serde_json::Value, ProviderError> {
    // TODO: Remove the lint override once all methods have been implemented
    #[allow(clippy::match_same_arms)]
    match request {
        EthRequest::Accounts() => eth::handle_accounts_request(data).and_then(to_json),
        EthRequest::BlockNumber() => eth::handle_block_number_request(data).and_then(to_json),
        EthRequest::Call(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::ChainId() => eth::handle_chain_id_request(data).and_then(to_json),
        EthRequest::Coinbase() => eth::handle_coinbase_request(data).and_then(to_json),
        EthRequest::EstimateGas(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::FeeHistory(_, _, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::GasPrice() => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::GetBalance(address, block_spec) => {
            eth::handle_get_balance_request(data, address, block_spec).and_then(to_json)
        }
        EthRequest::GetBlockByNumber(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::GetBlockByHash(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::GetBlockTransactionCountByHash(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        EthRequest::GetBlockTransactionCountByNumber(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        EthRequest::GetCode(address, block_spec) => {
            eth::handle_get_code_request(data, address, block_spec).and_then(to_json)
        }
        EthRequest::GetFilterChanges(filter_id) => {
            eth::handle_get_filter_changes_request(data, filter_id).and_then(to_json)
        }
        EthRequest::GetFilterLogs(filter_id) => {
            eth::handle_get_filter_logs_request(data, filter_id).and_then(to_json)
        }
        EthRequest::GetLogs(_) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::GetStorageAt(address, index, block_spec) => {
            eth::handle_get_storage_at_request(data, address, index, block_spec).and_then(to_json)
        }
        EthRequest::GetTransactionByBlockHashAndIndex(block_hash, index) => {
            eth::handle_get_transaction_by_block_hash_and_index(data, block_hash, index)
                .and_then(to_json)
        }
        EthRequest::GetTransactionByBlockNumberAndIndex(block_spec, index) => {
            eth::handle_get_transaction_by_block_spec_and_index(data, block_spec, index)
                .and_then(to_json)
        }
        EthRequest::GetTransactionByHash(transaction_hash) => {
            eth::handle_get_transaction_by_hash(data, transaction_hash).and_then(to_json)
        }
        EthRequest::GetTransactionCount(address, block_spec) => {
            eth::handle_get_transaction_count_request(data, address, block_spec).and_then(to_json)
        }
        EthRequest::GetTransactionReceipt(transaction_hash) => {
            eth::handle_get_transaction_receipt(data, transaction_hash).and_then(to_json)
        }
        EthRequest::Mining() => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::NetListening() => eth::handle_net_listening_request().and_then(to_json),
        EthRequest::NetPeerCount() => eth::handle_net_peer_count_request().and_then(to_json),
        EthRequest::NetVersion() => eth::handle_net_version_request(data).and_then(to_json),
        EthRequest::NewBlockFilter() => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::NewFilter(_) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::NewPendingTransactionFilter() => {
            eth::handle_new_pending_transaction_filter_request(data).and_then(to_json)
        }
        EthRequest::PendingTransactions() => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::SendRawTransaction(raw_transaction) => {
            eth::handle_send_raw_transaction_request(data, raw_transaction).and_then(to_json)
        }
        EthRequest::SendTransaction(transaction_request) => {
            eth::handle_send_transaction_request(data, transaction_request).and_then(to_json)
        }
        EthRequest::Sign(address, message) => {
            eth::handle_sign_request(data, address, message).and_then(to_json)
        }
        EthRequest::SignTypedDataV4(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::Subscribe(_) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::Syncing() => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::UninstallFilter(filter_id) => {
            eth::handle_uninstall_filter_request(data, filter_id).and_then(to_json)
        }
        EthRequest::Unsubscribe(filter_id) => {
            eth::handle_unsubscribe_request(data, filter_id).and_then(to_json)
        }
        EthRequest::Web3ClientVersion() => {
            eth::handle_web3_client_version_request().and_then(to_json)
        }
        EthRequest::Web3Sha3(message) => eth::handle_web3_sha3_request(message).and_then(to_json),
        EthRequest::EvmIncreaseTime(increment) => {
            eth::handle_evm_increase_time_request(data, increment).and_then(to_json)
        }
        EthRequest::EvmMine(timestamp) => {
            handle_evm_mine_request(data, timestamp).and_then(to_json)
        }
        EthRequest::EvmSetAutomine(_) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::EvmSetIntervalMining(_) => Err(ProviderError::Unimplemented("".to_string())),
        EthRequest::EvmSetNextBlockTimestamp(timestamp) => {
            eth::handle_evm_set_next_block_timestamp(data, timestamp).and_then(to_json)
        }
        EthRequest::EvmSnapshot() => Err(ProviderError::Unimplemented("".to_string())),
    }
}

fn handle_hardhat_request(
    data: &mut ProviderData,
    request: rpc_hardhat::Request,
) -> Result<serde_json::Value, ProviderError> {
    // TODO: Remove the lint override once all methods have been implemented
    #[allow(clippy::match_same_arms)]
    match request {
        rpc_hardhat::Request::AddCompilationResult(_, _, _) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::DropTransaction(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::GetAutomine() => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::GetStackTraceFailuresCount() => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::ImpersonateAccount(address) => {
            hardhat::handle_impersonate_account_request(data, address).and_then(to_json)
        }
        rpc_hardhat::Request::IntervalMine() => {
            hardhat::handle_interval_mine_request(data).and_then(to_json)
        }
        rpc_hardhat::Request::Metadata() => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::Mine(_, _) => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::Reset(_) => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::SetBalance(address, balance) => {
            hardhat::handle_set_balance(data, address, balance).and_then(to_json)
        }
        rpc_hardhat::Request::SetCode(address, code) => {
            hardhat::handle_set_code(data, address, code).and_then(to_json)
        }
        rpc_hardhat::Request::SetCoinbase(_) => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::SetLoggingEnabled(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::SetMinGasPrice(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::SetNextBlockBaseFeePerGas(_) => {
            Err(ProviderError::Unimplemented("".to_string()))
        }
        rpc_hardhat::Request::SetNonce(address, nonce) => {
            hardhat::handle_set_nonce(data, address, nonce).and_then(to_json)
        }
        rpc_hardhat::Request::SetPrevRandao(_) => Err(ProviderError::Unimplemented("".to_string())),
        rpc_hardhat::Request::SetStorageAt(address, index, value) => {
            hardhat::handle_set_storage_at(data, address, index, value).and_then(to_json)
        }
        rpc_hardhat::Request::StopImpersonatingAccount(address) => {
            hardhat::handle_stop_impersonating_account_request(data, address).and_then(to_json)
        }
    }
}

fn to_json<T: serde::Serialize>(value: T) -> Result<serde_json::Value, ProviderError> {
    serde_json::to_value(value).map_err(ProviderError::Serialization)
}
