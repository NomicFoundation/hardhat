pub use std::net::SocketAddr;
use std::net::TcpListener;
use std::sync::Arc;

pub use axum::Server;
use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use hashbrown::HashMap;
use rethnet_eth::remote::ZeroXPrefixedBytes;
use tokio::sync::{Mutex, RwLock};
use tracing::{event, Level};

use rethnet_eth::{
    remote::{
        client::{Request as RpcRequest, RpcClient},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::MethodInvocation as EthMethodInvocation,
        BlockSpec,
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
    fork_client: Option<Arc<Mutex<RpcClient>>>,
    fork_block_number: Option<usize>,
}

type StateType = Arc<AppState>;

pub const TEST_ACCOUNTS: [&str; 20] = [
    // these were taken from the standard output of a run of `hardhat node`
    "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "90F79bf6EB2c4f870365E785982E1f101E93b906",
    "15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "976EA74026E726554dB657fA54763abd0C3a0aa9",
    "14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "a0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "Bcd4042DE499D14e55001CcbB24a551F3b954096",
    "71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "FABB0ac9d68B0B445fB7357272Ff202C5651694a",
    "1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "dF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    "cd3B766CCDd6AE721141F452C550Ca635964ce71",
    "2546BcD3c84621e976D8185a91A922aE77ECEc30",
    "bDA5747bFD65F08deb54cb465eB87D40e51B197E",
    "dD2FD4581271e230360230F9337D5c0430Bf44C0",
    "8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
];

fn response<T>(id: &jsonrpc::Id, data: ResponseData<T>) -> Result<serde_json::Value, String>
where
    T: serde::Serialize,
{
    let response: Response<T> = Response {
        jsonrpc: jsonrpc::Version::V2_0,
        id: id.clone(),
        data,
    };
    serde_json::to_value(response).or(Err(String::from("failed to serialize response data")))
}

/// returns the state root in effect BEFORE setting the block context, so that the caller can
/// restore the context to that state root.
async fn set_block_context<T>(
    state: &StateType,
    block_spec: BlockSpec,
) -> Result<B256, ResponseData<T>> {
    let previous_state_root =
        state.rethnet_state.read().await.state_root().map_err(|_| {
            ResponseData::new_error(0, "Failed to retrieve previous state root", None)
        })?;
    if block_spec == BlockSpec::Tag(String::from("latest")) {
        // do nothing
        Ok(previous_state_root)
    } else {
        state
            .rethnet_state
            .write()
            .await
            .set_block_context(
                &KECCAK_EMPTY,
                Some(match block_spec {
                    BlockSpec::Number(n) => Ok(n),
                    BlockSpec::Tag(tag) => {
                        if let Some(fork_client) = state.fork_client.clone() {
                            if let Some(block_number) =
                                fork_client
                                    .lock()
                                    .await
                                    .get_block_by_number(BlockSpec::Tag(tag.clone()))
                                    .await
                                    .map_err(|_| {
                                        ResponseData::new_error(
                                            0,
                                            &format!("Failed to get block tagged {tag} from forked node"),
                                            None,
                                        )
                                    })?
                                    .number
                            {
                                if let Some(fork_block_number) = state.fork_block_number {
                                    let fork_block_number = U256::from(fork_block_number);
                                    if block_number > fork_block_number {
                                        Err(ResponseData::new_error(
                                            0,
                                            &format!("Cannot use remote block tagged {tag} because its number ({block_number}) is newer than the configured fork block number ({fork_block_number})"),
                                            None,
                                        ))?
                                    }
                                }
                                Ok(block_number)
                            } else {
                                Err(ResponseData::new_error(
                                    0,
                                    &format!("Remote block tagged {tag} did not have a number"),
                                    None,
                                ))
                            }
                        } else {
                            Err(ResponseData::new_error(
                                0,
                                &format!(
                                    "Cannot resolve block tag {tag} because there is no forking configuration"
                                ),
                                None,
                            ))
                        }
                    }
                }?),
            )
            .map_err(|_| ResponseData::new_error(0, "Failed to set block context", None))?;
        Ok(previous_state_root)
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
        .map_err(|_| ResponseData::new_error(0, "Failed to restore previous block context", None))
}

async fn get_account_info<T>(
    state: &StateType,
    address: Address,
) -> Result<AccountInfo, ResponseData<T>> {
    match state.rethnet_state.read().await.basic(address) {
        Ok(Some(account_info)) => Ok(account_info),
        Ok(None) => Err(ResponseData::new_error(0, "No such account", None)),
        Err(e) => Err(ResponseData::new_error(0, &e.to_string(), None)),
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
                            Err(e) => ResponseData::new_error(
                                0,
                                &format!("failed to retrieve code: {}", e),
                                None,
                            ),
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
                    Err(e) => ResponseData::new_error(
                        0,
                        &format!("failed to retrieve storage value: {}", e),
                        None,
                    ),
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

async fn handle_payload(
    state: StateType,
    payload: &Json<RpcRequest<MethodInvocation>>,
) -> Result<serde_json::Value, String> {
    match payload {
        Json(RpcRequest {
            version,
            id,
            method: _,
        }) if *version != jsonrpc::Version::V2_0 => response(
            id,
            ResponseData::<serde_json::Value>::new_error(
                0,
                "unsupported JSON-RPC version",
                match serde_json::to_value(version) {
                    Ok(version) => Some(version),
                    Err(_) => None,
                },
            ),
        ),
        Json(RpcRequest {
            version: _,
            id,
            method,
        }) => {
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
                _ => response(
                    id,
                    ResponseData::<serde_json::Value>::new_error(
                        -32601,
                        "Method not found",
                        match serde_json::to_value(method) {
                            Ok(value) => Some(value),
                            Err(_) => None,
                        },
                    ),
                ),
            }
        }
    }
}

async fn router(state: StateType) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(state): State<StateType>, payload: Json<serde_json::Value>| async move {
                    let payloads: Vec<Json<RpcRequest<MethodInvocation>>> =
                        match serde_json::from_value::<RpcRequest<MethodInvocation>>(
                            payload.clone().0,
                        ) {
                            Ok(request) => vec![Json(request)],
                            Err(_) => {
                                match serde_json::from_value::<Vec<RpcRequest<MethodInvocation>>>(
                                    payload.clone().0,
                                ) {
                                    Ok(requests) => requests.into_iter().map(Json).collect(),
                                    Err(_) => {
                                        return (
                                            StatusCode::INTERNAL_SERVER_ERROR,
                                            Json(
                                                serde_json::to_value(format!(
                                                    "unsupported JSON body '{:?}'",
                                                    payload.clone().0
                                                ))
                                                .unwrap_or(serde_json::Value::Null),
                                            ),
                                        );
                                    }
                                }
                            }
                        };

                    let responses = {
                        let mut responses: Vec<serde_json::Value> =
                            Vec::with_capacity(payloads.len());
                        for payload in payloads.iter() {
                            match handle_payload(Arc::clone(&state), payload).await {
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
                        Err(s) => (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(
                                serde_json::to_value(format!(
                                    "failed to serialize response data: {s}"
                                ))
                                .unwrap_or(serde_json::Value::Null),
                            ),
                        ),
                    }
                },
            ),
        )
        .with_state(state)
}

/// accepts an address to listen on (which could be a wildcard like 0.0.0.0:0), and a set of
/// initial accounts to initialize the state.
/// returns the address that the server is listening on (with any input wildcards resolved).
pub async fn serve(
    address: SocketAddr,
    config: RpcHardhatNetworkConfig,
    genesis_accounts: Option<HashMap<Address, AccountInfo>>,
) -> Result<
    axum::Server<hyper::server::conn::AddrIncoming, axum::routing::IntoMakeService<Router>>,
    std::io::Error,
> {
    let genesis_accounts = genesis_accounts.unwrap_or(TEST_ACCOUNTS.iter().fold(
        HashMap::default(),
        |mut genesis_accounts, account| {
            use std::str::FromStr;
            genesis_accounts.insert(
                Address::from_str(account)
                    .map_err(|_| {
                        std::io::Error::new(
                            std::io::ErrorKind::Other,
                            format!("failed to construct Address from string {account}"),
                        )
                    })
                    .unwrap(),
                AccountInfo {
                    balance: U256::from(10000), // copied from Hardhat Network stdout
                    nonce: 0,
                    code: None,
                    code_hash: KECCAK_EMPTY,
                },
            );
            genesis_accounts
        },
    ));

    let listener = TcpListener::bind(address)?;
    event!(Level::INFO, "Listening on {}", address);

    let rethnet_state: StateType = if let Some(config) = config.forking {
        let fork_client = Arc::new(Mutex::new(RpcClient::new(&config.json_rpc_url)));

        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .expect("failed to construct async runtime");

        let hash_generator = rethnet_evm::RandomHashGenerator::with_seed("seed");

        let fork_block_number = match config.block_number {
            Some(block_number) => U256::from(block_number),
            None => fork_client
                .lock()
                .await
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
            fork_client: Some(fork_client),
            fork_block_number: Some(
                fork_block_number
                    .try_into()
                    .expect("fork block number should fit into a usize"),
            ),
        })
    } else {
        Arc::new(AppState {
            rethnet_state: Arc::new(RwLock::new(Box::new(HybridState::with_accounts(
                genesis_accounts,
            )))),
            fork_client: None,
            fork_block_number: None,
        })
    };

    Ok(axum::Server::from_tcp(listener)
        .unwrap()
        .serve(router(rethnet_state).await.into_make_service()))
}
