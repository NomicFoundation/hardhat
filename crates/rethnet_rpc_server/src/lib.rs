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

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest, jsonrpc, methods::MethodInvocation as EthMethodInvocation,
        BlockSpec,
    },
    Address, U256,
};
use rethnet_evm::{
    state::{AccountModifierFn, ForkState, HybridState, StateError, SyncState},
    AccountInfo, Bytecode, KECCAK_EMPTY,
};

mod hardhat_methods;
pub use hardhat_methods::{reset::RpcHardhatNetworkConfig, HardhatMethodInvocation};

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

type StateType = Arc<RwLock<Box<dyn SyncState<StateError>>>>;

fn response<T>(
    id: jsonrpc::Id,
    data: jsonrpc::ResponseData<T>,
) -> (StatusCode, Json<serde_json::Value>)
where
    T: serde::Serialize,
{
    let response: jsonrpc::Response<T> = jsonrpc::Response {
        jsonrpc: jsonrpc::Version::V2_0,
        id: id.clone(),
        data,
    };
    if let Ok(response) = serde_json::to_value(response) {
        (StatusCode::OK, Json(response))
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(
                serde_json::to_value(jsonrpc::Response {
                    jsonrpc: jsonrpc::Version::V2_0,
                    id,
                    data: jsonrpc::ResponseData::<T>::new_error(
                        0,
                        "serde_json::to_value() failed",
                        None,
                    ),
                })
                .expect("shouldn't happen"),
            ),
        )
    }
}

async fn handle_get_balance(
    state: StateType,
    address: Address,
    _block_spec: BlockSpec,
) -> jsonrpc::ResponseData<U256> {
    match (*state).read().await.basic(address) {
        Ok(Some(account_info)) => jsonrpc::ResponseData::Success {
            result: account_info.balance,
        },
        Ok(None) => jsonrpc::ResponseData::new_error(0, "No such account", None),
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_get_code(
    state: StateType,
    address: Address,
    _block_spec: BlockSpec,
) -> jsonrpc::ResponseData<ZeroXPrefixedBytes> {
    match (*state).read().await.basic(address) {
        Ok(Some(account_info)) => {
            match (*state).read().await.code_by_hash(account_info.code_hash) {
                Ok(code) => jsonrpc::ResponseData::Success {
                    result: ZeroXPrefixedBytes::from(code.bytecode),
                },
                Err(error) => jsonrpc::ResponseData::new_error(0, &error.to_string(), None),
            }
        }
        Ok(None) => jsonrpc::ResponseData::new_error(0, "No such account", None),
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_get_storage_at(
    state: StateType,
    address: Address,
    position: U256,
    _block_spec: BlockSpec,
) -> jsonrpc::ResponseData<U256> {
    match (*state).read().await.storage(address, position) {
        Ok(value) => jsonrpc::ResponseData::Success { result: value },
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_get_transaction_count(
    state: StateType,
    address: Address,
    _block_spec: BlockSpec,
) -> jsonrpc::ResponseData<U256> {
    match (*state).read().await.basic(address) {
        Ok(Some(account_info)) => jsonrpc::ResponseData::Success {
            result: U256::from(account_info.nonce),
        },
        Ok(None) => jsonrpc::ResponseData::new_error(0, "No such account", None),
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_balance(
    state: StateType,
    address: Address,
    balance: U256,
) -> jsonrpc::ResponseData<()> {
    match (*state).write().await.modify_account(
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
        Ok(()) => jsonrpc::ResponseData::Success { result: () },
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_code(
    state: StateType,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> jsonrpc::ResponseData<()> {
    let code_1 = code.clone();
    let code_2 = code.clone();
    match (*state).write().await.modify_account(
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
        Ok(()) => jsonrpc::ResponseData::Success { result: () },
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_nonce(
    state: StateType,
    address: Address,
    nonce: U256,
) -> jsonrpc::ResponseData<()> {
    match TryInto::<u64>::try_into(nonce) {
        Ok(nonce) => {
            match (*state).write().await.modify_account(
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
                Ok(()) => jsonrpc::ResponseData::Success { result: () },
                Err(error) => jsonrpc::ResponseData::new_error(0, &error.to_string(), None),
            }
        }
        Err(error) => jsonrpc::ResponseData::new_error(0, &error.to_string(), None),
    }
}

async fn handle_set_storage_at(
    state: StateType,
    address: Address,
    position: U256,
    value: U256,
) -> jsonrpc::ResponseData<()> {
    match (*state)
        .write()
        .await
        .set_account_storage_slot(address, position, value)
    {
        Ok(()) => jsonrpc::ResponseData::Success { result: () },
        Err(e) => jsonrpc::ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn router(state: StateType) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(state): State<StateType>, payload: Json<RpcRequest<MethodInvocation>>| async move {
                    match payload {
                        Json(RpcRequest {
                            version,
                            id,
                            method: _,
                        }) if version != jsonrpc::Version::V2_0 => {
                            (StatusCode::OK, Json(serde_json::json!(jsonrpc::Response {
                                jsonrpc: jsonrpc::Version::V2_0,
                                id,
                                data: jsonrpc::ResponseData::<serde_json::Value>::new_error(
                                    0,
                                    "unsupported JSON-RPC version",
                                    match serde_json::to_value(version) {
                                        Ok(version) => Some(version),
                                        Err(_) => None,
                                    },
                                )
                            })))
                        }
                        Json(RpcRequest {
                            version: _,
                            id,
                            method,
                        }) => {
                            match method {
                                MethodInvocation::Eth(EthMethodInvocation::GetBalance(
                                    address,
                                    block,
                                )) => response(id, handle_get_balance(state, address, block).await),
                                MethodInvocation::Eth(EthMethodInvocation::GetCode(
                                    address,
                                    block,
                                )) => response(id, handle_get_code(state, address, block).await),
                                MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
                                    address,
                                    position,
                                    block,
                                )) => response(
                                    id,
                                    handle_get_storage_at(state, address, position, block).await,
                                ),
                                MethodInvocation::Eth(
                                    EthMethodInvocation::GetTransactionCount(address, block),
                                ) => response(
                                    id,
                                    handle_get_transaction_count(state, address, block).await,
                                ),
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(
                                    address,
                                    balance,
                                )) => {
                                    response(id, handle_set_balance(state, address, balance).await)
                                }
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(
                                    address,
                                    code,
                                )) => response(id, handle_set_code(state, address, code).await),
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(
                                    address,
                                    nonce,
                                )) => response(id, handle_set_nonce(state, address, nonce).await),
                                MethodInvocation::Hardhat(
                                    HardhatMethodInvocation::SetStorageAt(address, position, value),
                                ) => response(
                                    id,
                                    handle_set_storage_at(state, address, position, value).await,
                                ),
                                _ => {
                                    // TODO: after adding all the methods here, eliminate this
                                    // catch-all match arm.
                                    (StatusCode::OK, Json(serde_json::json!(jsonrpc::Response {
                                        jsonrpc: jsonrpc::Version::V2_0,
                                        id,
                                        data: jsonrpc::ResponseData::<serde_json::Value>::Error {
                                            error: jsonrpc::Error {
                                                code: -32601,
                                                message: String::from("Method not found"),
                                                data: match serde_json::to_value(method) {
                                                    Ok(value) => Some(value),
                                                    Err(_) => None,
                                                }
                                            }
                                        }
                                    })))
                                }
                            }
                        }
                    }
                },
            ),
        )
        .with_state(state)
}

/// accepts an address to listen on (which could be a wildcard like 0.0.0.0:0), and a set of
/// initial accounts to initialize the state.
/// returns the address that the server is listening on (with any input wildcards resolved).
pub async fn run(
    address: SocketAddr,
    config: RpcHardhatNetworkConfig,
    genesis_accounts: HashMap<Address, AccountInfo>,
) -> Result<SocketAddr, std::io::Error> {
    let listener = TcpListener::bind(address)?;
    let address = listener.local_addr()?;

    let rethnet_state: StateType = if let Some(config) = config.forking {
        Arc::new(RwLock::new(Box::new(ForkState::new(
            Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("failed to construct async runtime"),
            ),
            Arc::new(parking_lot::Mutex::new(
                rethnet_evm::RandomHashGenerator::with_seed("seed"),
            )),
            &config.json_rpc_url,
            match config.block_number {
                Some(block_number) => U256::from(block_number),
                None => rethnet_eth::remote::client::RpcClient::new(&config.json_rpc_url)
                    .get_block_by_number(rethnet_eth::remote::BlockSpec::latest())
                    .await
                    .expect("should retrieve latest block from fork source")
                    .number
                    .expect("fork source's latest block should have a block number"),
            },
            genesis_accounts,
        ))))
    } else {
        Arc::new(RwLock::new(Box::new(HybridState::with_accounts(
            genesis_accounts,
        ))))
    };

    tokio::spawn(async move {
        axum::Server::from_tcp(listener)
            .unwrap()
            .serve(router(rethnet_state).await.into_make_service())
            .await
            .unwrap();
    });

    Ok(address)
}
