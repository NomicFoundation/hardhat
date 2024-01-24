mod config;
mod data;
mod debug_mine;
mod error;
mod filter;
mod interval;
mod logger;
mod pending;
mod requests;
mod snapshot;
mod subscribe;
/// Test utilities
#[cfg(test)]
pub mod test_utils;

use std::sync::Arc;

use edr_evm::{blockchain::BlockchainError, HashSet};
use lazy_static::lazy_static;
use logger::SyncLogger;
use parking_lot::Mutex;
use requests::eth::handle_set_interval_mining;
use tokio::runtime;

pub use self::{
    config::*,
    data::{CallResult, EstimateGasFailure},
    debug_mine::DebugMineBlockResult,
    error::{ProviderError, TransactionFailure, TransactionFailureReason},
    logger::Logger,
    requests::{
        hardhat::rpc_types as hardhat_rpc_types, InvalidRequestReason, MethodInvocation,
        OneUsizeOrTwo, ProviderRequest, U64OrUsize,
    },
    subscribe::*,
};
use self::{
    data::{CreationError, ProviderData},
    interval::IntervalMiner,
    requests::{eth, hardhat},
};
use crate::requests::debug;

lazy_static! {
    pub static ref PRIVATE_RPC_METHODS: HashSet<&'static str> = {
        [
            "hardhat_getStackTraceFailuresCount",
            "hardhat_setLoggingEnabled",
        ]
        .into_iter()
        .collect()
    };
}

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
    data: Arc<Mutex<ProviderData>>,
    /// Interval miner runs in the background, if enabled.
    interval_miner: Arc<Mutex<Option<IntervalMiner>>>,
    runtime: runtime::Handle,
}

impl Provider {
    /// Constructs a new instance.
    pub fn new(
        runtime: runtime::Handle,
        logger: Box<dyn SyncLogger<BlockchainError = BlockchainError>>,
        subscriber_callback: Box<dyn SyncSubscriberCallback>,
        config: ProviderConfig,
    ) -> Result<Self, CreationError> {
        let data = ProviderData::new(runtime.clone(), logger, subscriber_callback, config.clone())?;
        let data = Arc::new(Mutex::new(data));

        let interval_miner = config
            .mining
            .interval
            .as_ref()
            .map(|config| IntervalMiner::new(runtime.clone(), config.clone(), data.clone()));

        let interval_miner = Arc::new(Mutex::new(interval_miner));

        Ok(Self {
            data,
            interval_miner,
            runtime,
        })
    }

    pub fn handle_request(
        &self,
        request: ProviderRequest,
    ) -> Result<serde_json::Value, ProviderError> {
        let mut data = self.data.lock();

        match request {
            ProviderRequest::Single(request) => self.handle_single_request(&mut data, request),
            ProviderRequest::Batch(requests) => self.handle_batch_request(&mut data, requests),
        }
    }

    pub fn log_failed_deserialization(&self, method_name: &str, error: &ProviderError) {
        let mut data = self.data.lock();
        data.logger_mut()
            .print_method_logs(method_name, Some(error));
    }

    /// Handles a batch of JSON requests for an execution provider.
    fn handle_batch_request(
        &self,
        data: &mut ProviderData,
        request: Vec<MethodInvocation>,
    ) -> Result<serde_json::Value, ProviderError> {
        let mut results = Vec::new();

        for req in request {
            results.push(self.handle_single_request(data, req)?);
        }

        serde_json::to_value(results).map_err(ProviderError::Serialization)
    }

    fn handle_single_request(
        &self,
        data: &mut ProviderData,
        request: MethodInvocation,
    ) -> Result<serde_json::Value, ProviderError> {
        let method_name = if data.logger_mut().is_enabled() {
            let method_name = request.method_name();
            if PRIVATE_RPC_METHODS.contains(method_name) {
                None
            } else {
                Some(method_name)
            }
        } else {
            None
        };

        // TODO: Remove the lint override once all methods have been implemented
        #[allow(clippy::match_same_arms)]
        let result = match request {
            // eth_* method
            MethodInvocation::Accounts(()) => eth::handle_accounts_request(data).and_then(to_json),
            MethodInvocation::BlockNumber(()) => {
                eth::handle_block_number_request(data).and_then(to_json)
            }
            MethodInvocation::Call(request, block_spec, state_overrides) => {
                eth::handle_call_request(data, request, block_spec, state_overrides)
                    .and_then(to_json)
            }
            MethodInvocation::ChainId(()) => eth::handle_chain_id_request(data).and_then(to_json),
            MethodInvocation::Coinbase(()) => eth::handle_coinbase_request(data).and_then(to_json),
            MethodInvocation::EstimateGas(call_request, block_spec) => {
                eth::handle_estimate_gas(data, call_request, block_spec).and_then(to_json)
            }
            MethodInvocation::FeeHistory(block_count, newest_block, reward_percentiles) => {
                eth::handle_fee_history(data, block_count, newest_block, reward_percentiles)
                    .and_then(to_json)
            }
            MethodInvocation::GasPrice(()) => eth::handle_gas_price(data).and_then(to_json),
            MethodInvocation::GetBalance(address, block_spec) => {
                eth::handle_get_balance_request(data, address, block_spec).and_then(to_json)
            }
            MethodInvocation::GetBlockByNumber(block_spec, transaction_detail_flag) => {
                eth::handle_get_block_by_number_request(data, block_spec, transaction_detail_flag)
                    .and_then(to_json)
            }
            MethodInvocation::GetBlockByHash(block_hash, transaction_detail_flag) => {
                eth::handle_get_block_by_hash_request(data, block_hash, transaction_detail_flag)
                    .and_then(to_json)
            }
            MethodInvocation::GetBlockTransactionCountByHash(block_hash) => {
                eth::handle_get_block_transaction_count_by_hash_request(data, block_hash)
                    .and_then(to_json)
            }
            MethodInvocation::GetBlockTransactionCountByNumber(block_spec) => {
                eth::handle_get_block_transaction_count_by_block_number(data, block_spec)
                    .and_then(to_json)
            }
            MethodInvocation::GetCode(address, block_spec) => {
                eth::handle_get_code_request(data, address, block_spec).and_then(to_json)
            }
            MethodInvocation::GetFilterChanges(filter_id) => {
                eth::handle_get_filter_changes_request(data, filter_id).and_then(to_json)
            }
            MethodInvocation::GetFilterLogs(filter_id) => {
                eth::handle_get_filter_logs_request(data, filter_id).and_then(to_json)
            }
            MethodInvocation::GetLogs(filter_options) => {
                eth::handle_get_logs_request(data, filter_options).and_then(to_json)
            }
            MethodInvocation::GetStorageAt(address, index, block_spec) => {
                eth::handle_get_storage_at_request(data, address, index, block_spec)
                    .and_then(to_json)
            }
            MethodInvocation::GetTransactionByBlockHashAndIndex(block_hash, index) => {
                eth::handle_get_transaction_by_block_hash_and_index(data, block_hash, index)
                    .and_then(to_json)
            }
            MethodInvocation::GetTransactionByBlockNumberAndIndex(block_spec, index) => {
                eth::handle_get_transaction_by_block_spec_and_index(data, block_spec, index)
                    .and_then(to_json)
            }
            MethodInvocation::GetTransactionByHash(transaction_hash) => {
                eth::handle_get_transaction_by_hash(data, transaction_hash).and_then(to_json)
            }
            MethodInvocation::GetTransactionCount(address, block_spec) => {
                eth::handle_get_transaction_count_request(data, address, block_spec)
                    .and_then(to_json)
            }
            MethodInvocation::GetTransactionReceipt(transaction_hash) => {
                eth::handle_get_transaction_receipt(data, transaction_hash).and_then(to_json)
            }
            MethodInvocation::Mining(()) => eth::handle_mining().and_then(to_json),
            MethodInvocation::NetListening(()) => {
                eth::handle_net_listening_request().and_then(to_json)
            }
            MethodInvocation::NetPeerCount(()) => {
                eth::handle_net_peer_count_request().and_then(to_json)
            }
            MethodInvocation::NetVersion(()) => {
                eth::handle_net_version_request(data).and_then(to_json)
            }
            MethodInvocation::NewBlockFilter(()) => {
                eth::handle_new_block_filter_request(data).and_then(to_json)
            }
            MethodInvocation::NewFilter(options) => {
                eth::handle_new_log_filter_request(data, options).and_then(to_json)
            }
            MethodInvocation::NewPendingTransactionFilter(()) => {
                eth::handle_new_pending_transaction_filter_request(data).and_then(to_json)
            }
            MethodInvocation::PendingTransactions(()) => {
                eth::handle_pending_transactions(data).and_then(to_json)
            }
            MethodInvocation::SendRawTransaction(raw_transaction) => {
                eth::handle_send_raw_transaction_request(data, raw_transaction).and_then(to_json)
            }
            MethodInvocation::SendTransaction(transaction_request) => {
                eth::handle_send_transaction_request(data, transaction_request).and_then(to_json)
            }
            MethodInvocation::Sign(message, address) => {
                eth::handle_sign_request(data, message, address).and_then(to_json)
            }
            MethodInvocation::SignTypedDataV4(address, message) => {
                eth::handle_sign_typed_data_v4(data, address, message).and_then(to_json)
            }
            MethodInvocation::Subscribe(subscription_type, filter_options) => {
                eth::handle_subscribe_request(data, subscription_type, filter_options)
                    .and_then(to_json)
            }
            MethodInvocation::Syncing(()) => eth::handle_syncing().and_then(to_json),
            MethodInvocation::UninstallFilter(filter_id) => {
                eth::handle_uninstall_filter_request(data, filter_id).and_then(to_json)
            }
            MethodInvocation::Unsubscribe(filter_id) => {
                eth::handle_unsubscribe_request(data, filter_id).and_then(to_json)
            }

            // web3_* methods
            MethodInvocation::Web3ClientVersion(()) => {
                eth::handle_web3_client_version_request().and_then(to_json)
            }
            MethodInvocation::Web3Sha3(message) => {
                eth::handle_web3_sha3_request(message).and_then(to_json)
            }

            // evm_* methods
            MethodInvocation::EvmIncreaseTime(increment) => {
                eth::handle_increase_time_request(data, increment).and_then(to_json)
            }
            MethodInvocation::EvmMine(timestamp) => {
                eth::handle_mine_request(data, timestamp).and_then(to_json)
            }
            MethodInvocation::EvmRevert(snapshot_id) => {
                eth::handle_revert_request(data, snapshot_id).and_then(to_json)
            }
            MethodInvocation::EvmSetAutomine(enabled) => {
                eth::handle_set_automine_request(data, enabled).and_then(to_json)
            }
            MethodInvocation::EvmSetBlockGasLimit(gas_limit) => {
                eth::handle_set_block_gas_limit_request(data, gas_limit).and_then(to_json)
            }
            MethodInvocation::EvmSetIntervalMining(config) => handle_set_interval_mining(
                self.data.clone(),
                &mut self.interval_miner.lock(),
                self.runtime.clone(),
                config,
            )
            .and_then(to_json),
            MethodInvocation::EvmSetNextBlockTimestamp(timestamp) => {
                eth::handle_set_next_block_timestamp_request(data, timestamp).and_then(to_json)
            }
            MethodInvocation::EvmSnapshot(()) => {
                eth::handle_snapshot_request(data).and_then(to_json)
            }

            // debug_* methods
            MethodInvocation::DebugTraceTransaction(transaction_hash, config) => {
                debug::handle_debug_trace_transaction(data, transaction_hash, config)
                    .and_then(to_json)
            }
            MethodInvocation::DebugTraceCall(call_request, block_spec, config) => {
                debug::handle_debug_trace_call(data, call_request, block_spec, config)
                    .and_then(to_json)
            }

            // hardhat_* methods
            MethodInvocation::AddCompilationResult(_, _, _) => Err(ProviderError::Unimplemented(
                "AddCompilationResult".to_string(),
            )),
            MethodInvocation::DropTransaction(transaction_hash) => {
                hardhat::handle_drop_transaction(data, transaction_hash).and_then(to_json)
            }
            MethodInvocation::GetAutomine(()) => {
                hardhat::handle_get_automine_request(data).and_then(to_json)
            }
            MethodInvocation::GetStackTraceFailuresCount(()) => Err(ProviderError::Unimplemented(
                "GetStackTraceFailuresCount".to_string(),
            )),
            MethodInvocation::ImpersonateAccount(address) => {
                hardhat::handle_impersonate_account_request(data, *address).and_then(to_json)
            }
            MethodInvocation::IntervalMine(()) => {
                hardhat::handle_interval_mine_request(data).and_then(to_json)
            }
            MethodInvocation::Metadata(()) => {
                hardhat::handle_metadata_request(data).and_then(to_json)
            }
            MethodInvocation::Mine(number_of_blocks, interval) => {
                hardhat::handle_mine(data, number_of_blocks, interval).and_then(to_json)
            }
            MethodInvocation::Reset(config) => {
                hardhat::handle_reset(data, config).and_then(to_json)
            }
            MethodInvocation::SetBalance(address, balance) => {
                hardhat::handle_set_balance(data, address, balance).and_then(to_json)
            }
            MethodInvocation::SetCode(address, code) => {
                hardhat::handle_set_code(data, address, code).and_then(to_json)
            }
            MethodInvocation::SetCoinbase(coinbase) => {
                hardhat::handle_set_coinbase_request(data, coinbase).and_then(to_json)
            }
            MethodInvocation::SetLoggingEnabled(is_enabled) => {
                hardhat::handle_set_logging_enabled_request(data, is_enabled).and_then(to_json)
            }
            MethodInvocation::SetMinGasPrice(min_gas_price) => {
                hardhat::handle_set_min_gas_price(data, min_gas_price).and_then(to_json)
            }
            MethodInvocation::SetNextBlockBaseFeePerGas(base_fee_per_gas) => {
                hardhat::handle_set_next_block_base_fee_per_gas_request(data, base_fee_per_gas)
                    .and_then(to_json)
            }
            MethodInvocation::SetNonce(address, nonce) => {
                hardhat::handle_set_nonce(data, address, nonce).and_then(to_json)
            }
            MethodInvocation::SetPrevRandao(prev_randao) => {
                hardhat::handle_set_prev_randao_request(data, prev_randao).and_then(to_json)
            }
            MethodInvocation::SetStorageAt(address, index, value) => {
                hardhat::handle_set_storage_at(data, address, index, value).and_then(to_json)
            }
            MethodInvocation::StopImpersonatingAccount(address) => {
                hardhat::handle_stop_impersonating_account_request(data, *address).and_then(to_json)
            }
        };

        if let Some(method_name) = method_name {
            // Skip printing for `hardhat_intervalMine` unless it is an error
            if method_name != "hardhat_intervalMine" || result.is_err() {
                data.logger_mut()
                    .print_method_logs(method_name, result.as_ref().err());
            }
        }

        result
    }
}

fn to_json<T: serde::Serialize>(value: T) -> Result<serde_json::Value, ProviderError> {
    serde_json::to_value(value).map_err(ProviderError::Serialization)
}
