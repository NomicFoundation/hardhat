use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;

use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use hashbrown::HashMap;
use rethnet_eth::remote::ZeroXPrefixedBytes;
use tokio::sync::RwLock;
use tracing::{event, Level};

use rethnet_eth::{
    remote::{
        client::{Request as RpcRequest, RpcClient},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::MethodInvocation as EthMethodInvocation,
        BlockSpec, BlockTag, Eip1898BlockSpec,
    },
    Address, B256, U256,
};
use rethnet_evm::{
    state::{AccountModifierFn, ForkState, HybridState, StateError, SyncState},
    AccountInfo, Bytecode, KECCAK_EMPTY,
};

mod hardhat_methods;
pub use hardhat_methods::{
    reset::{RpcForkConfig, RpcHardhatNetworkConfig},
    HardhatMethodInvocation,
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

type RethnetStateType = Arc<RwLock<Box<dyn SyncState<StateError>>>>;

struct AppState {
    rethnet_state: RethnetStateType,
    fork_block_number: Option<U256>,
}

type StateType = Arc<AppState>;

fn error_response_data<T>(msg: &str) -> ResponseData<T> {
    event!(Level::INFO, "{}", &msg);
    ResponseData::new_error(0, msg, None)
}

pub struct Config {
    pub address: SocketAddr,
    pub rpc_hardhat_network_config: RpcHardhatNetworkConfig,
}

pub struct Server {
    inner: axum::Server<hyper::server::conn::AddrIncoming, axum::routing::IntoMakeService<Router>>,
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("failed to construct Address from string {address}: {reason}")]
    AddressParse { address: String, reason: String },

    #[error("Failed to bind to address/port: {0}")]
    Listen(std::io::Error),

    #[error("Failed to initialize server: {0}")]
    Serve(hyper::Error),
}

async fn get_latest_block_number<T>(state: &StateType) -> Result<U256, ResponseData<T>> {
    // limited functionality per https://github.com/NomicFoundation/hardhat/issues/4125
    if let Some(fork_block_number) = state.fork_block_number {
        // TODO: when we're able to mint local blocks, and there are some newer than
        // fork_block_number, return the number of the latest one
        Ok(U256::from(fork_block_number))
    } else {
        // TODO: when we're able to mint local blocks, return the number of the latest one
        Ok(U256::ZERO)
    }
}

fn check_post_merge_block_tags<T>(_state: &StateType) -> Result<(), ResponseData<T>> {
    todo!("when we're tracking hardforks, if the given block tag is 'safe' or 'finalized', ensure that we're running a hardfork that's after the merge")
}

/// returns the state root in effect BEFORE setting the block context, so that the caller can
/// restore the context to that state root.
async fn set_block_context<T>(
    state: &StateType,
    block_spec: BlockSpec,
) -> Result<B256, ResponseData<T>> {
    let previous_state_root = state.rethnet_state.read().await.state_root().map_err(|e| {
        error_response_data(&format!("Failed to retrieve previous state root: {e}"))
    })?;
    match block_spec {
        BlockSpec::Tag(BlockTag::Pending) => {
            // do nothing
            Ok(previous_state_root)
        }
        BlockSpec::Tag(BlockTag::Latest) if state.fork_block_number.is_none() => {
            Ok(previous_state_root)
        }
        resolvable_block_spec => {
            state
                .rethnet_state
                .write()
                .await
                .set_block_context(
                    &KECCAK_EMPTY,
                    Some(match resolvable_block_spec.clone() {
                        BlockSpec::Number(n) => Ok(n),
                        BlockSpec::Eip1898(s) => match s {
                            Eip1898BlockSpec::Number { block_number: n } => Ok(n),
                            Eip1898BlockSpec::Hash {
                                block_hash: _,
                                require_canonical: _,
                            } => todo!("when there's a blockchain present"),
                        },
                        BlockSpec::Tag(tag) => match tag {
                            BlockTag::Earliest => Ok(U256::ZERO),
                            BlockTag::Safe | BlockTag::Finalized => {
                                check_post_merge_block_tags(state)?;
                                Ok(get_latest_block_number(state).await?)
                            }
                            BlockTag::Latest => Ok(get_latest_block_number(state).await?),
                            BlockTag::Pending => panic!("should never happen"),
                        },
                    }?),
                )
                .map_err(|e| {
                    error_response_data(&format!(
                        "Failed to set block context {resolvable_block_spec:?}: {e}"
                    ))
                })?;
            Ok(previous_state_root)
        }
    }
}

async fn restore_block_context<T>(
    state: &StateType,
    state_root: B256,
) -> Result<(), ResponseData<T>> {
    state
        .rethnet_state
        .write()
        .await
        .set_block_context(&state_root, None)
        .map_err(|_| error_response_data("Failed to restore previous block context"))
}

async fn get_account_info<T>(
    state: &StateType,
    address: Address,
) -> Result<AccountInfo, ResponseData<T>> {
    match state.rethnet_state.read().await.basic(address) {
        Ok(Some(account_info)) => Ok(account_info),
        Ok(None) => Err(error_response_data("No such account")),
        Err(e) => Err(error_response_data(&e.to_string())),
    }
}

async fn handle_get_balance(
    state: StateType,
    address: Address,
    block: BlockSpec,
) -> ResponseData<U256> {
    event!(Level::INFO, "eth_getBalance({address:?}, {block:?})");
    match set_block_context(&state, block).await {
        Ok(previous_state_root) => {
            let account_info = get_account_info(&state, address).await;
            match restore_block_context(&state, previous_state_root).await {
                Ok(()) => match account_info {
                    Ok(account_info) => ResponseData::Success {
                        result: account_info.balance,
                    },
                    Err(e) => e,
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_get_code(
    state: StateType,
    address: Address,
    block: BlockSpec,
) -> ResponseData<ZeroXPrefixedBytes> {
    event!(Level::INFO, "eth_getCode({address:?}, {block:?})");
    match set_block_context(&state, block).await {
        Ok(previous_state_root) => {
            let account_info = get_account_info(&state, address).await;
            match restore_block_context(&state, previous_state_root).await {
                Ok(()) => match account_info {
                    Ok(account_info) => {
                        match state
                            .rethnet_state
                            .read()
                            .await
                            .code_by_hash(account_info.code_hash)
                        {
                            Ok(code) => ResponseData::Success {
                                result: ZeroXPrefixedBytes::from(code.bytecode),
                            },
                            Err(e) => {
                                error_response_data(&format!("failed to retrieve code: {}", e))
                            }
                        }
                    }
                    Err(e) => e,
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_get_storage_at(
    state: StateType,
    address: Address,
    position: U256,
    block: BlockSpec,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getStorageAt({address:?}, {position:?}, {block:?})"
    );
    match set_block_context(&state, block).await {
        Ok(previous_state_root) => {
            let value = state.rethnet_state.read().await.storage(address, position);
            match restore_block_context(&state, previous_state_root).await {
                Ok(()) => match value {
                    Ok(value) => ResponseData::Success { result: value },
                    Err(e) => {
                        error_response_data(&format!("failed to retrieve storage value: {}", e))
                    }
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_get_transaction_count(
    state: StateType,
    address: Address,
    block: BlockSpec,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getTransactionCount({address:?}, {block:?})"
    );
    match set_block_context(&state, block).await {
        Ok(previous_state_root) => {
            let account_info = get_account_info(&state, address).await;
            match restore_block_context(&state, previous_state_root).await {
                Ok(()) => match account_info {
                    Ok(account_info) => ResponseData::Success {
                        result: U256::from(account_info.nonce),
                    },
                    Err(e) => e,
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_set_balance(state: StateType, address: Address, balance: U256) -> ResponseData<()> {
    event!(Level::INFO, "hardhat_setBalance({address:?}, {balance:?})");
    match state.rethnet_state.write().await.modify_account(
        address,
        AccountModifierFn::new(Box::new(move |account_balance, _, _| {
            *account_balance = balance
        })),
        &|| {
            Ok(AccountInfo {
                balance,
                nonce: 0,
                code: None,
                code_hash: KECCAK_EMPTY,
            })
        },
    ) {
        Ok(()) => ResponseData::Success { result: () },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_code(
    state: StateType,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> ResponseData<()> {
    event!(Level::INFO, "hardhat_setCode({address:?}, {code:?})");
    let code_1 = code.clone();
    let code_2 = code.clone();
    match state.rethnet_state.write().await.modify_account(
        address,
        AccountModifierFn::new(Box::new(move |_, _, account_code| {
            *account_code = Some(Bytecode::new_raw(code_1.clone().into()))
        })),
        &|| {
            Ok(AccountInfo {
                balance: U256::ZERO,
                nonce: 0,
                code: Some(Bytecode::new_raw(code_2.clone().into())),
                code_hash: KECCAK_EMPTY,
            })
        },
    ) {
        Ok(()) => ResponseData::Success { result: () },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_nonce(state: StateType, address: Address, nonce: U256) -> ResponseData<()> {
    event!(Level::INFO, "hardhat_setNonce({address:?}, {nonce:?})");
    match TryInto::<u64>::try_into(nonce) {
        Ok(nonce) => {
            match state.rethnet_state.write().await.modify_account(
                address,
                AccountModifierFn::new(Box::new(move |_, account_nonce, _| *account_nonce = nonce)),
                &|| {
                    Ok(AccountInfo {
                        balance: U256::ZERO,
                        nonce,
                        code: None,
                        code_hash: KECCAK_EMPTY,
                    })
                },
            ) {
                Ok(()) => ResponseData::Success { result: () },
                Err(error) => ResponseData::new_error(0, &error.to_string(), None),
            }
        }
        Err(error) => ResponseData::new_error(0, &error.to_string(), None),
    }
}

async fn handle_set_storage_at(
    state: StateType,
    address: Address,
    position: U256,
    value: U256,
) -> ResponseData<()> {
    event!(
        Level::INFO,
        "hardhat_setStorageAt({address:?}, {position:?}, {value:?})"
    );
    match state
        .rethnet_state
        .write()
        .await
        .set_account_storage_slot(address, position, value)
    {
        Ok(()) => ResponseData::Success { result: () },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_request(
    state: StateType,
    request: &RpcRequest<MethodInvocation>,
) -> Result<serde_json::Value, String> {
    fn response<T>(id: &jsonrpc::Id, data: ResponseData<T>) -> Result<serde_json::Value, String>
    where
        T: serde::Serialize,
    {
        let response: Response<T> = Response {
            jsonrpc: jsonrpc::Version::V2_0,
            id: id.clone(),
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
        } if *version != jsonrpc::Version::V2_0 => response(
            id,
            error_response_data::<serde_json::Value>(&format!(
                "unsupported JSON-RPC version '{version:?}'"
            )),
        ),
        RpcRequest {
            version: _,
            id,
            method,
        } => {
            match method {
                MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, block)) => {
                    response(id, handle_get_balance(state, *address, block.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetCode(address, block)) => {
                    response(id, handle_get_code(state, *address, block.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
                    address,
                    position,
                    block,
                )) => response(
                    id,
                    handle_get_storage_at(state, *address, *position, block.clone()).await,
                ),
                MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(address, block)) => {
                    response(
                        id,
                        handle_get_transaction_count(state, *address, block.clone()).await,
                    )
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(
                    address,
                    balance,
                )) => response(id, handle_set_balance(state, *address, *balance).await),
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(address, code)) => {
                    response(id, handle_set_code(state, *address, code.clone()).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, nonce)) => {
                    response(id, handle_set_nonce(state, *address, *nonce).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
                    address,
                    position,
                    value,
                )) => response(
                    id,
                    handle_set_storage_at(state, *address, *position, *value).await,
                ),
                // TODO: after adding all the methods here, eliminate this
                // catch-all match arm:
                _ => {
                    let msg = format!(
                        "Method '{:?}' not found",
                        match serde_json::to_value(method) {
                            Ok(value) => Some(value),
                            Err(_) => None,
                        },
                    );
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

async fn router(state: StateType) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(state): State<StateType>, payload: Json<Request>| async move {
                    let requests: Vec<RpcRequest<MethodInvocation>> = match payload {
                        Json(Request::Single(request)) => vec![request],
                        Json(Request::Batch(requests)) => requests,
                    };

                    let responses = {
                        let mut responses: Vec<serde_json::Value> =
                            Vec::with_capacity(requests.len());
                        for request in requests.iter() {
                            match handle_request(Arc::clone(&state), request).await {
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
        .with_state(state)
}

impl Server {
    /// accepts a configuration and a set of initial accounts to initialize the state.
    pub async fn new(
        config: Config,
        genesis_accounts: HashMap<Address, AccountInfo>,
    ) -> Result<Self, Error> {
        let listener = TcpListener::bind(config.address).map_err(Error::Listen)?;
        event!(Level::INFO, "Listening on {}", config.address);

        let rethnet_state: StateType =
            if let Some(config) = config.rpc_hardhat_network_config.forking {
                let runtime = tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("failed to construct async runtime");

                let hash_generator = rethnet_evm::RandomHashGenerator::with_seed("seed");

                let fork_block_number = match config.block_number {
                    Some(block_number) => U256::from(block_number),
                    None => RpcClient::new(&config.json_rpc_url)
                        .get_block_by_number(rethnet_eth::remote::BlockSpec::latest())
                        .await
                        .expect("should retrieve latest block from fork source")
                        .number
                        .expect("fork source's latest block should have a block number"),
                };

                Arc::new(AppState {
                    rethnet_state: Arc::new(RwLock::new(Box::new(ForkState::new(
                        Arc::new(runtime),
                        Arc::new(parking_lot::Mutex::new(hash_generator)),
                        &config.json_rpc_url,
                        fork_block_number,
                        genesis_accounts,
                    )))),
                    fork_block_number: Some(fork_block_number),
                })
            } else {
                Arc::new(AppState {
                    rethnet_state: Arc::new(RwLock::new(Box::new(HybridState::with_accounts(
                        genesis_accounts,
                    )))),
                    fork_block_number: None,
                })
            };

        Ok(Self {
            inner: axum::Server::from_tcp(listener)
                .unwrap()
                .serve(router(rethnet_state).await.into_make_service()),
        })
    }

    pub async fn serve(self) -> Result<(), Error> {
        self.inner.await.map_err(Error::Serve)
    }

    pub async fn serve_with_shutdown_signal<Signal>(self, signal: Signal) -> Result<(), Error>
    where
        Signal: std::future::Future<Output = ()>,
    {
        self.inner
            .with_graceful_shutdown(signal)
            .await
            .map_err(Error::Serve)
    }

    pub fn local_addr(&self) -> SocketAddr {
        self.inner.local_addr()
    }
}
