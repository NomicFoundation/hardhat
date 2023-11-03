use std::{
    net::{SocketAddr, TcpListener},
    sync::Arc,
};

use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use edr_eth::{
    remote::{
        client::Request as RpcRequest,
        filter::{FilteredEvents, LogOutput},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::{CallInput, MethodInvocation as EthMethodInvocation, U64OrUsize},
        BlockSpec,
    },
    serde::ZeroXPrefixedBytes,
    signature::Signature,
    transaction::EthTransactionRequest,
    Address, Bytes, B256, U256, U64,
};
use edr_evm::{blockchain::BlockchainError, MineBlockResult};
use sha3::{Digest, Keccak256};
use tokio::sync::Mutex;
use tracing::{event, Level};

use crate::{
    node::{Node, NodeError},
    Config, HardhatMethodInvocation,
};

/// an RPC method with its parameters
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
#[allow(clippy::large_enum_variant)]
pub enum MethodInvocation {
    /// an eth_* method invocation
    Eth(EthMethodInvocation),
    /// a hardhat_* method invocation
    Hardhat(HardhatMethodInvocation),
}

fn error_response_data<T>(code: i16, msg: &str) -> ResponseData<T> {
    event!(Level::INFO, "{}", &msg);
    ResponseData::new_error(code, msg, None)
}

pub struct Server {
    inner: axum::Server<hyper::server::conn::AddrIncoming, axum::routing::IntoMakeService<Router>>,
}

#[derive(thiserror::Error, Debug)]
pub enum ServerError {
    #[error("failed to construct Address from string {address}: {reason}")]
    AddressParse { address: String, reason: String },

    #[error("Failed to bind to address/port: {0}")]
    Listen(std::io::Error),

    #[error("Failed to initialize server: {0}")]
    Serve(hyper::Error),

    #[error(transparent)]
    Node(#[from] NodeError),
}

/// `require_canonical`: whether the server should additionally raise a JSON-RPC
/// error if the block is not in the canonical chain
async fn handle_accounts(node: Arc<Mutex<Node>>) -> ResponseData<Vec<Address>> {
    event!(Level::INFO, "eth_accounts()");

    let node = node.lock().await;
    ResponseData::Success {
        result: node.accounts().copied().collect(),
    }
}

async fn handle_block_number(node: Arc<Mutex<Node>>) -> ResponseData<U64> {
    event!(Level::INFO, "eth_blockNumber()");

    let node = node.lock().await;
    ResponseData::Success {
        result: U64::from(node.block_number().await),
    }
}

async fn handle_call(
    node: Arc<Mutex<Node>>,
    input: CallInput,
    block_spec: Option<BlockSpec>,
) -> ResponseData<ZeroXPrefixedBytes> {
    event!(Level::INFO, "eth_call({input:?}, {block_spec:?})");

    let node = node.lock().await;
    match node.run_call(input, block_spec.as_ref()).await {
        Ok(result) => ResponseData::Success {
            result: result.into(),
        },
        Err(e) => error_response_data(-32_000, &format!("call failed with error: {e}")),
    }
}

async fn handle_chain_id(node: Arc<Mutex<Node>>) -> ResponseData<U64> {
    event!(Level::INFO, "eth_chainId()");

    let node = node.lock().await;
    ResponseData::Success {
        result: U64::from(node.chain_id()),
    }
}

async fn handle_coinbase(node: Arc<Mutex<Node>>) -> ResponseData<Address> {
    event!(Level::INFO, "eth_coinbase()");

    let node = node.lock().await;
    ResponseData::Success {
        result: node.coinbase(),
    }
}

async fn handle_evm_increase_time(
    node: Arc<Mutex<Node>>,
    increment: U64OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_increaseTime({increment:?})");

    let mut node = node.lock().await;
    let new_block_time = node.increase_block_time(increment.into());
    ResponseData::Success {
        result: new_block_time.to_string(),
    }
}

fn log_block(_result: &MineBlockResult<BlockchainError>, _is_interval_mined: bool) {
    // TODO
}

fn log_interval_mined_block_number(
    _block_number: u64,
    _is_empty: bool,
    _base_fee_per_gas: Option<U256>,
) {
    // TODO
}

async fn handle_evm_mine(
    node: Arc<Mutex<Node>>,
    timestamp: Option<U64OrUsize>,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_mine({timestamp:?})");

    let mut node = node.lock().await;
    let timestamp: Option<u64> = timestamp.map(U64OrUsize::into);
    match node.mine_and_commit_block(timestamp).await {
        Ok(mine_block_result) => {
            log_block(&mine_block_result, false);

            ResponseData::Success {
                result: String::from("0"),
            }
        }
        Err(e) => error_response_data(0, &format!("Error mining block: {e}")),
    }
}

async fn handle_evm_set_next_block_timestamp(
    node: Arc<Mutex<Node>>,
    timestamp: U64OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_setNextBlockTimestamp({timestamp:?})");

    let mut node = node.lock().await;
    match node.set_next_block_timestamp(timestamp.into()).await {
        Ok(new_timestamp) => {
            ResponseData::Success {
                result: new_timestamp.to_string(),
            }
        },
        Err(NodeError::TimestampLowerThanPrevious {proposed, previous}) => {
            error_response_data(
                -32000,
                &format!(
                    "Timestamp {proposed} is lower than the previous block's timestamp {previous}",
                ),
            )
        },
        Err(NodeError::TimestampEqualsPrevious {proposed}) => {
            error_response_data(-32000, &format!("Timestamp {proposed} is equal to the previous block's timestamp. Enable the 'allowBlocksWithSameTimestamp' option to allow this"))
        }
        Err(e) => error_response_data(0, &format!("Error: {e}")),
    }
}

async fn handle_get_balance(
    node: Arc<Mutex<Node>>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(Level::INFO, "eth_getBalance({address:?}, {block_spec:?})");

    let node = node.lock().await;
    match node.balance(address, block_spec.as_ref()).await {
        Ok(balance) => ResponseData::Success { result: balance },
        // Internal server error
        Err(e) => error_response_data(-32000, &e.to_string()),
    }
}

async fn handle_get_code(
    node: Arc<Mutex<Node>>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> ResponseData<ZeroXPrefixedBytes> {
    event!(Level::INFO, "eth_getCode({address:?}, {block_spec:?})");

    let node = node.lock().await;
    match node.get_code(address, block_spec.as_ref()).await {
        Ok(code) => ResponseData::Success { result: code },
        Err(e) => error_response_data(0, &format!("failed to retrieve code: {e}")),
    }
}

async fn handle_get_filter_changes(
    node: Arc<Mutex<Node>>,
    filter_id: U256,
) -> ResponseData<Option<FilteredEvents>> {
    event!(Level::INFO, "eth_getFilterChanges({filter_id:?})");

    let mut node = node.lock().await;
    ResponseData::Success {
        result: node.get_filter_changes(&filter_id),
    }
}

async fn handle_get_filter_logs(
    node: Arc<Mutex<Node>>,
    filter_id: U256,
) -> ResponseData<Option<Vec<LogOutput>>> {
    event!(Level::INFO, "eth_getFilterLogs({filter_id:?})");

    let mut node = node.lock().await;
    match node.get_filter_logs(&filter_id) {
        Ok(result) => ResponseData::Success { result },
        Err(err) => error_response_data(0, &err.to_string()),
    }
}

async fn handle_get_storage_at(
    node: Arc<Mutex<Node>>,
    address: Address,
    position: U256,
    block_spec: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getStorageAt({address:?}, {position:?}, {block_spec:?})"
    );

    let node = node.lock().await;
    let storage = node
        .get_storage_at(address, position, block_spec.as_ref())
        .await;
    match storage {
        Ok(value) => ResponseData::Success { result: value },
        Err(e) => error_response_data(0, &format!("failed to retrieve storage value: {e}")),
    }
}

async fn handle_get_transaction_count(
    node: Arc<Mutex<Node>>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getTransactionCount({address:?}, {block_spec:?})"
    );

    let node = node.lock().await;
    let transaction_count = node
        .get_transaction_count(address, block_spec.as_ref())
        .await;
    match transaction_count {
        Ok(count) => ResponseData::Success {
            result: U256::from(count),
        },
        Err(e) => error_response_data(0, &format!("failed to retrieve transaction count: {e}")),
    }
}

async fn handle_impersonate_account(
    node: Arc<Mutex<Node>>,
    address: Address,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_impersonateAccount({address:?})");

    let mut node = node.lock().await;
    node.impersonate_account(address);
    ResponseData::Success { result: true }
}

async fn handle_interval_mine(node: Arc<Mutex<Node>>) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_intervalMine()");

    let mut node = node.lock().await;
    match node.mine_and_commit_block(None).await {
        Ok(mine_block_result) => {
            let block_header = mine_block_result.block.header();
            if mine_block_result.block.transactions().is_empty() {
                log_interval_mined_block_number(
                    block_header.number,
                    true,
                    block_header.base_fee_per_gas,
                );
            } else {
                log_block(&mine_block_result, true);
                log_interval_mined_block_number(block_header.number, false, None);
            }
            ResponseData::Success { result: true }
        }
        Err(e) => error_response_data(0, &format!("Error mining block: {e}")),
    }
}

async fn handle_net_version(node: Arc<Mutex<Node>>) -> ResponseData<String> {
    event!(Level::INFO, "net_version()");

    let node = node.lock().await;
    ResponseData::Success {
        result: node.network_id(),
    }
}

async fn handle_new_pending_transaction_filter(node: Arc<Mutex<Node>>) -> ResponseData<U256> {
    event!(Level::INFO, "eth_newPendingTransactionFilter()");

    let mut node = node.lock().await;
    let filter_id = node.new_pending_transaction_filter();

    ResponseData::Success { result: filter_id }
}

async fn handle_send_transaction(
    node: Arc<Mutex<Node>>,
    transaction_request: EthTransactionRequest,
) -> ResponseData<B256> {
    event!(Level::INFO, "eth_sendTransaction({transaction_request:?})");

    let mut node = node.lock().await;
    match node.send_transaction(transaction_request) {
        Ok(transaction_hash) => ResponseData::Success {
            result: transaction_hash,
        },
        Err(e) => error_response_data(-32000, &format!("failed to send transaction: {e}")),
    }
}

async fn handle_send_raw_transaction(
    node: Arc<Mutex<Node>>,
    raw_transaction: ZeroXPrefixedBytes,
) -> ResponseData<B256> {
    event!(Level::INFO, "eth_sendRawTransaction({raw_transaction:?})");

    let mut node = node.lock().await;
    match node.send_raw_transaction(raw_transaction.as_ref()) {
        Ok(transaction_hash) => ResponseData::Success {
            result: transaction_hash,
        },
        Err(e) => error_response_data(-32000, &format!("failed to send transaction: {e}")),
    }
}

async fn handle_set_balance(
    node: Arc<Mutex<Node>>,
    address: Address,
    balance: U256,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setBalance({address:?}, {balance:?})");

    let mut node = node.lock().await;
    match node.set_balance(address, balance).await {
        // Hardhat always returns true if there is no error.
        Ok(()) => ResponseData::Success { result: true },
        // Internal server error
        Err(e) => error_response_data(-32000, &e.to_string()),
    }
}

async fn handle_set_code(
    node: Arc<Mutex<Node>>,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setCode({address:?}, {code:?})");

    let mut node = node.lock().await;
    match node.set_code(address, code.into()).await {
        // Hardhat always returns true if there is no error.
        Ok(()) => ResponseData::Success { result: true },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_nonce(
    node: Arc<Mutex<Node>>,
    address: Address,
    nonce: U256,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setNonce({address:?}, {nonce:?})");

    let mut node = node.lock().await;
    match TryInto::<u64>::try_into(nonce) {
        Ok(nonce) => match node.set_nonce(address, nonce).await {
            Ok(()) => ResponseData::Success { result: true },
            Err(error) => ResponseData::new_error(0, &error.to_string(), None),
        },
        Err(error) => ResponseData::new_error(0, &error.to_string(), None),
    }
}

async fn handle_set_storage_at(
    node: Arc<Mutex<Node>>,
    address: Address,
    index: U256,
    value: U256,
) -> ResponseData<bool> {
    event!(
        Level::INFO,
        "hardhat_setStorageAt({address:?}, {index:?}, {value:?})"
    );

    let mut node = node.lock().await;
    match node.set_account_storage_slot(address, index, value).await {
        Ok(()) => ResponseData::Success { result: true },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

fn handle_net_listening() -> ResponseData<bool> {
    event!(Level::INFO, "net_listening()");
    ResponseData::Success { result: true }
}

fn handle_net_peer_count() -> ResponseData<U64> {
    event!(Level::INFO, "net_peerCount()");

    ResponseData::Success {
        result: U64::from(0),
    }
}

async fn handle_sign(
    node: Arc<Mutex<Node>>,
    address: Address,
    message: ZeroXPrefixedBytes,
) -> ResponseData<Signature> {
    event!(Level::INFO, "eth_sign({address:?}, {message:?})");

    let node = node.lock().await;
    match node.sign(&address, message) {
        Ok(signature) => ResponseData::Success { result: signature },
        Err(error) => match error {
            NodeError::UnknownAddress { .. } => {
                ResponseData::new_error(0, &error.to_string(), None)
            }
            _ => ResponseData::new_error(-32000, &error.to_string(), None),
        },
    }
}

async fn handle_stop_impersonating_account(
    node: Arc<Mutex<Node>>,
    address: Address,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_stopImpersonatingAccount({address:?})");

    let mut node = node.lock().await;
    ResponseData::Success {
        result: node.stop_impersonating_account(address),
    }
}

async fn handle_uninstall_filter(node: Arc<Mutex<Node>>, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_uninstallFilter({filter_id:?})");

    let mut node = node.lock().await;
    ResponseData::Success {
        result: node.remove_filter(&filter_id),
    }
}

async fn handle_unsubscribe(node: Arc<Mutex<Node>>, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_unsubscribe({filter_id:?})");

    let mut node = node.lock().await;
    ResponseData::Success {
        result: node.remove_subscription(&filter_id),
    }
}

fn handle_web3_client_version() -> ResponseData<String> {
    event!(Level::INFO, "web3_clientVersion()");
    ResponseData::Success {
        result: format!(
            "edr/{}/revm/{}",
            env!("CARGO_PKG_VERSION"),
            env!("REVM_VERSION"),
        ),
    }
}

fn handle_web3_sha3(message: ZeroXPrefixedBytes) -> ResponseData<B256> {
    event!(Level::INFO, "web3_sha3({message:?})");

    let message: Bytes = message.into();
    let hash = Keccak256::digest(&message[..]);
    ResponseData::Success {
        result: B256::from_slice(&hash[..]),
    }
}

async fn handle_request(
    node: Arc<Mutex<Node>>,
    request: RpcRequest<MethodInvocation>,
) -> Result<serde_json::Value, String> {
    fn response<T>(id: jsonrpc::Id, data: ResponseData<T>) -> Result<serde_json::Value, String>
    where
        T: serde::Serialize,
    {
        let response: Response<T> = Response {
            jsonrpc: jsonrpc::Version::V2_0,
            id,
            data,
        };
        serde_json::to_value(response).map_err(|e| {
            let msg = format!("failed to serialize response data: {e}");
            event!(Level::ERROR, "{}", &msg);
            msg
        })
    }

    match request {
        RpcRequest {
            version,
            id,
            method: _,
        } if version != jsonrpc::Version::V2_0 => response(
            id,
            error_response_data::<serde_json::Value>(
                0,
                &format!("unsupported JSON-RPC version '{version:?}'"),
            ),
        ),
        RpcRequest {
            version: _,
            id,
            method,
        } => {
            match method {
                MethodInvocation::Eth(EthMethodInvocation::Accounts()) => {
                    response(id, handle_accounts(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::BlockNumber()) => {
                    response(id, handle_block_number(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Call(transaction, block_spec)) => {
                    response(id, handle_call(node, transaction, block_spec).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::ChainId()) => {
                    response(id, handle_chain_id(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Coinbase()) => {
                    response(id, handle_coinbase(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmIncreaseTime(increment)) => {
                    response(id, handle_evm_increase_time(node, increment).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmMine(timestamp)) => {
                    response(id, handle_evm_mine(node, timestamp).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmSetNextBlockTimestamp(timestamp)) => {
                    response(
                        id,
                        handle_evm_set_next_block_timestamp(node, timestamp).await,
                    )
                }
                MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, block)) => {
                    response(id, handle_get_balance(node, address, block).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetCode(address, block)) => {
                    response(id, handle_get_code(node, address, block).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetFilterChanges(filter_id)) => {
                    response(id, handle_get_filter_changes(node, filter_id).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetFilterLogs(filter_id)) => {
                    response(id, handle_get_filter_logs(node, filter_id).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
                    address,
                    position,
                    block,
                )) => response(
                    id,
                    handle_get_storage_at(node, address, position, block).await,
                ),
                MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(address, block)) => {
                    response(id, handle_get_transaction_count(node, address, block).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::NetListening()) => {
                    response(id, handle_net_listening())
                }
                MethodInvocation::Eth(EthMethodInvocation::NetPeerCount()) => {
                    response(id, handle_net_peer_count())
                }
                MethodInvocation::Eth(EthMethodInvocation::NetVersion()) => {
                    response(id, handle_net_version(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()) => {
                    response(id, handle_new_pending_transaction_filter(node).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::SendTransaction(
                    transaction_request,
                )) => response(id, handle_send_transaction(node, transaction_request).await),
                MethodInvocation::Eth(EthMethodInvocation::SendRawTransaction(raw_transaction)) => {
                    response(id, handle_send_raw_transaction(node, raw_transaction).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Sign(address, message)) => {
                    response(id, handle_sign(node, address, message).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Web3ClientVersion()) => {
                    response(id, handle_web3_client_version())
                }
                MethodInvocation::Eth(EthMethodInvocation::Web3Sha3(message)) => {
                    response(id, handle_web3_sha3(message.clone()))
                }
                MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(filter_id)) => {
                    response(id, handle_uninstall_filter(node, filter_id).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Unsubscribe(subscription_id)) => {
                    response(id, handle_unsubscribe(node, subscription_id).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(address)) => {
                    response(id, handle_impersonate_account(node, address).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::IntervalMine()) => {
                    response(id, handle_interval_mine(node).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(
                    address,
                    balance,
                )) => response(id, handle_set_balance(node, address, balance).await),
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(address, code)) => {
                    response(id, handle_set_code(node, address, code).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, nonce)) => {
                    response(id, handle_set_nonce(node, address, nonce).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
                    address,
                    position,
                    value,
                )) => response(
                    id,
                    handle_set_storage_at(node, address, position, value).await,
                ),
                MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(
                    address,
                )) => response(id, handle_stop_impersonating_account(node, address).await),
                // TODO: after adding all the methods here, eliminate this
                // catch-all match arm:
                _ => {
                    let msg = format!("Method not found for invocation '{method:?}'");
                    response(
                        id,
                        ResponseData::<serde_json::Value>::new_error(-32601, &msg, None),
                    )
                }
            }
        }
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum Request {
    /// A single JSON-RPC request
    Single(RpcRequest<MethodInvocation>),
    /// A batch of requests
    Batch(Vec<RpcRequest<MethodInvocation>>),
}

async fn router(node: Arc<Mutex<Node>>) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(node): State<Arc<Mutex<Node>>>, payload: Json<Request>| async move {
                    let requests: Vec<RpcRequest<MethodInvocation>> = match payload {
                        Json(Request::Single(request)) => vec![request],
                        Json(Request::Batch(requests)) => requests,
                    };

                    let responses = {
                        let mut responses: Vec<serde_json::Value> =
                            Vec::with_capacity(requests.len());
                        for request in requests {
                            match handle_request(Arc::clone(&node), request).await {
                                Ok(response) => responses.push(response),
                                Err(s) => {
                                    return (
                                        StatusCode::INTERNAL_SERVER_ERROR,
                                        Json(
                                            serde_json::to_value(s)
                                                .unwrap_or(serde_json::Value::Null),
                                        ),
                                    );
                                }
                            }
                        }
                        responses
                    };

                    let response = if responses.len() > 1 {
                        serde_json::to_value(responses)
                    } else {
                        serde_json::to_value(responses[0].clone())
                    };

                    match response {
                        Ok(response) => (StatusCode::OK, Json(response)),
                        Err(e) => {
                            let msg = format!("failed to serialize final response data: {e}");
                            event!(Level::ERROR, "{}", &msg);
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(serde_json::to_value(msg).unwrap_or(serde_json::Value::Null)),
                            )
                        }
                    }
                },
            ),
        )
        .with_state(node)
}

impl Server {
    /// Accepts a configuration and a set of initial accounts to initialize the
    /// state.
    pub async fn new(config: &Config) -> Result<Self, ServerError> {
        let listener = TcpListener::bind(config.address).map_err(ServerError::Listen)?;
        event!(Level::INFO, "Listening on {}", config.address);

        let node = Node::new(config).await?;

        for (i, (address, secret_key)) in node.local_accounts().enumerate() {
            event!(Level::INFO, "Account #{}: {:?}", i + 1, address);
            event!(
                Level::INFO,
                "Secret Key: 0x{}",
                hex::encode(secret_key.to_bytes())
            );
        }

        let node = Arc::new(Mutex::new(node));

        Ok(Self {
            inner: axum::Server::from_tcp(listener)
                .unwrap()
                .serve(router(node).await.into_make_service()),
        })
    }

    pub async fn serve(self) -> Result<(), ServerError> {
        self.inner.await.map_err(ServerError::Serve)
    }

    pub async fn serve_with_shutdown_signal<Signal>(self, signal: Signal) -> Result<(), ServerError>
    where
        Signal: std::future::Future<Output = ()>,
    {
        self.inner
            .with_graceful_shutdown(signal)
            .await
            .map_err(ServerError::Serve)
    }

    pub fn local_addr(&self) -> SocketAddr {
        self.inner.local_addr()
    }
}
