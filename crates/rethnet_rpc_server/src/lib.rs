use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;

use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use hashbrown::{HashMap, HashSet};
use rethnet_eth::remote::ZeroXPrefixedBytes;
use secp256k1::{Secp256k1, SecretKey};
use tokio::sync::RwLock;
use tracing::{event, Level};

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        filter::{FilteredEvents, LogOutput},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::MethodInvocation as EthMethodInvocation,
        BlockSpec, BlockTag, Eip1898BlockSpec,
    },
    signature::{public_key_to_address, Signature},
    Address, Bytes, B256, U256, U64,
};
use rethnet_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, LocalBlockchain,
        LocalCreationError, SyncBlockchain,
    },
    state::{AccountModifierFn, ForkState, HybridState, StateError, SyncState},
    AccountInfo, Bytecode, MemPool, RandomHashGenerator, KECCAK_EMPTY,
};

mod hardhat_methods;
pub use hardhat_methods::{
    reset::{RpcForkConfig, RpcHardhatNetworkConfig},
    HardhatMethodInvocation,
};

mod config;
pub use config::{AccountConfig, Config};

mod filter;
use filter::{new_filter_deadline, Filter};

#[derive(Clone, Copy)]
struct U256WithoutLeadingZeroes(U256);

impl serde::Serialize for U256WithoutLeadingZeroes {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        rethnet_eth::remote::serialize_uint_without_leading_zeroes(&self.0, s)
    }
}

#[derive(Clone, Copy)]
struct U64WithoutLeadingZeroes(U64);

impl serde::Serialize for U64WithoutLeadingZeroes {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        rethnet_eth::remote::serialize_uint_without_leading_zeroes(&self.0, s)
    }
}

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

type RethnetStateType = Arc<RwLock<dyn SyncState<StateError>>>;
type BlockchainType = Arc<RwLock<dyn SyncBlockchain<BlockchainError>>>;

struct AppState {
    blockchain: BlockchainType,
    rethnet_state: RethnetStateType,
    chain_id: U64,
    coinbase: Address,
    filters: RwLock<HashMap<U256, Filter>>,
    fork_block_number: Option<U256>,
    impersonated_accounts: RwLock<HashSet<Address>>,
    last_filter_id: RwLock<U256>,
    local_accounts: HashMap<Address, SecretKey>,
    _mem_pool: Arc<RwLock<MemPool>>,
    network_id: U64,
}

type StateType = Arc<AppState>;

fn error_response_data<T>(code: i16, msg: &str) -> ResponseData<T> {
    event!(Level::INFO, "{}", &msg);
    ResponseData::new_error(code, msg, None)
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

    #[error(transparent)]
    ForkedBlockchainCreation(#[from] ForkedCreationError),

    #[error(transparent)]
    LocalBlockchainCreation(#[from] LocalCreationError<StateError>),
}

/// require_canonical: whether the server should additionally raise a JSON-RPC error if the block
/// is not in the canonical chain
async fn _block_number_from_hash<T>(
    state: &StateType,
    block_hash: &B256,
    _require_canonical: bool,
) -> Result<U256, ResponseData<T>> {
    match state.blockchain.read().await.block_by_hash(block_hash) {
        Ok(Some(block)) => Ok(block.header.number),
        Ok(None) => Err(error_response_data(
            0,
            &format!("Hash {block_hash} does not refer to a known block"),
        )),
        Err(e) => Err(error_response_data(
            0,
            &format!("Failed to retrieve block by hash ({block_hash}): {e}"),
        )),
    }
}

async fn _block_number_from_block_spec<T>(
    state: &StateType,
    block_spec: &BlockSpec,
) -> Result<U256, ResponseData<T>> {
    match block_spec {
        BlockSpec::Number(number) => Ok(*number),
        BlockSpec::Tag(tag) => match tag {
            BlockTag::Earliest => Ok(U256::ZERO),
            BlockTag::Safe | BlockTag::Finalized => {
                confirm_post_merge_hardfork(state)?;
                Ok(state.blockchain.read().await.last_block_number())
            }
            BlockTag::Latest | BlockTag::Pending => {
                Ok(state.blockchain.read().await.last_block_number())
            }
        },
        BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
            block_hash,
            require_canonical,
        }) => _block_number_from_hash(state, block_hash, require_canonical.unwrap_or(false)).await,
        BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Ok(*block_number),
    }
}

fn confirm_post_merge_hardfork<T>(_state: &StateType) -> Result<(), ResponseData<T>> {
    todo!("when we're allowing configuration of hardfork history (that is, when https://github.com/NomicFoundation/rethnet/issues/124 is resolved), if the given block tag is 'safe' or 'finalized', ensure that we're running a hardfork that's after the merge")
}

/// returns the state root in effect BEFORE setting the block context, so that the caller can
/// restore the context to that state root.
async fn set_block_context<T>(
    state: &StateType,
    block_spec: Option<BlockSpec>,
) -> Result<B256, ResponseData<T>> {
    let previous_state_root = state.rethnet_state.read().await.state_root().map_err(|e| {
        error_response_data(0, &format!("Failed to retrieve previous state root: {e}"))
    })?;
    match block_spec {
        Some(BlockSpec::Tag(BlockTag::Pending)) => {
            // do nothing
            Ok(previous_state_root)
        }
        Some(BlockSpec::Tag(BlockTag::Latest)) if state.fork_block_number.is_none() => {
            Ok(previous_state_root)
        }
        None => Ok(previous_state_root),
        resolvable_block_spec => {
            let blockchain = state.blockchain.read().await;
            let latest_block_number = blockchain.last_block_number();
            state
                .rethnet_state
                .write()
                .await
                .set_block_context(
                    &KECCAK_EMPTY,
                    Some(match resolvable_block_spec.clone() {
                        Some(BlockSpec::Number(n)) => Ok(n),
                        Some(BlockSpec::Eip1898(s)) => match s {
                            Eip1898BlockSpec::Number { block_number: n } => Ok(n),
                            Eip1898BlockSpec::Hash {
                                block_hash,
                                require_canonical: _,
                            } => match blockchain.block_by_hash(&block_hash) {
                                Err(e) => Err(error_response_data(0, &format!("failed to get block by hash {block_hash}: {e}"))),
                                Ok(None) => Err(error_response_data(0, &format!("block hash {block_hash} does not refer to a known block"))),
                                Ok(Some(block)) => Ok(block.header.number),
                            }
                        },
                        Some(BlockSpec::Tag(tag)) => match tag {
                            BlockTag::Earliest => Ok(U256::ZERO),
                            BlockTag::Safe | BlockTag::Finalized => {
                                confirm_post_merge_hardfork(state)?;
                                Ok(latest_block_number)
                            }
                            BlockTag::Latest => Ok(latest_block_number),
                            BlockTag::Pending => unreachable!(),
                        },
                        None => unreachable!(),
                    }?),
                )
                .map_err(|e| {
                    error_response_data(
                        -32000,
                        &format!(
                            "Received invalid block tag {}. Latest block number is {latest_block_number}. {e}",
                            resolvable_block_spec.unwrap(),
                        ),
                    )
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
        .map_err(|e| {
            error_response_data(0, &format!("Failed to restore previous block context: {e}"))
        })
}

async fn get_account_info<T>(
    state: &StateType,
    address: Address,
) -> Result<AccountInfo, ResponseData<T>> {
    match state.rethnet_state.read().await.basic(address) {
        Ok(Some(account_info)) => Ok(account_info),
        Ok(None) => Ok(AccountInfo {
            balance: U256::ZERO,
            nonce: 0,
            code: None,
            code_hash: KECCAK_EMPTY,
        }),
        Err(e) => Err(error_response_data(0, &e.to_string())),
    }
}

async fn handle_accounts(state: StateType) -> ResponseData<Vec<Address>> {
    event!(Level::INFO, "eth_accounts");
    ResponseData::Success {
        result: state.local_accounts.keys().copied().collect(),
    }
}

async fn handle_chain_id(state: StateType) -> ResponseData<U64WithoutLeadingZeroes> {
    event!(Level::INFO, "eth_chainId()");
    ResponseData::Success {
        result: U64WithoutLeadingZeroes(U64::from(state.chain_id)),
    }
}

async fn handle_coinbase(state: StateType) -> ResponseData<Address> {
    event!(Level::INFO, "eth_coinbase()");
    ResponseData::Success {
        result: state.coinbase,
    }
}

async fn handle_get_balance(
    state: StateType,
    address: Address,
    block: Option<BlockSpec>,
) -> ResponseData<U256WithoutLeadingZeroes> {
    event!(Level::INFO, "eth_getBalance({address:?}, {block:?})");
    match set_block_context(&state, block).await {
        Ok(previous_state_root) => {
            let account_info = get_account_info(&state, address).await;
            match restore_block_context(&state, previous_state_root).await {
                Ok(()) => match account_info {
                    Ok(account_info) => ResponseData::Success {
                        result: U256WithoutLeadingZeroes(account_info.balance),
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
    block: Option<BlockSpec>,
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
                                error_response_data(0, &format!("failed to retrieve code: {}", e))
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

async fn handle_get_filter_changes(
    state: StateType,
    filter_id: U256,
) -> ResponseData<Option<FilteredEvents>> {
    event!(Level::INFO, "eth_getFilterChanges({filter_id:?})");
    let mut filters = state.filters.write().await;
    ResponseData::Success {
        result: filters.get_mut(&filter_id).and_then(|filter| {
            let events = Some(filter.events.take());
            filter.deadline = new_filter_deadline();
            events
        }),
    }
}

async fn handle_get_filter_logs(
    state: StateType,
    filter_id: U256,
) -> ResponseData<Option<Vec<LogOutput>>> {
    event!(Level::INFO, "eth_getFilterLogs({filter_id:?})");
    let mut filters = state.filters.write().await;
    match filters.get_mut(&filter_id) {
        Some(filter) => match &mut filter.events {
            FilteredEvents::Logs(logs) => {
                let result = Some(std::mem::take(logs));
                filter.deadline = new_filter_deadline();
                ResponseData::Success { result }
            }
            _ => error_response_data(
                0,
                &format!("Subscription {filter_id} is not a logs subscription"),
            ),
        },
        None => ResponseData::Success { result: None },
    }
}

async fn handle_get_storage_at(
    state: StateType,
    address: Address,
    position: U256,
    block: Option<BlockSpec>,
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
                        error_response_data(0, &format!("failed to retrieve storage value: {}", e))
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
    block: Option<BlockSpec>,
) -> ResponseData<U256WithoutLeadingZeroes> {
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
                        result: U256WithoutLeadingZeroes(U256::from(account_info.nonce)),
                    },
                    Err(e) => e,
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_impersonate_account(state: StateType, address: Address) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_impersonateAccount({address:?})");
    state.impersonated_accounts.write().await.insert(address);
    ResponseData::Success { result: true }
}

async fn get_next_filter_id(state: StateType) -> U256 {
    let mut last_filter_id = state.last_filter_id.write().await;
    *last_filter_id = last_filter_id
        .checked_add(U256::from(1))
        .expect("filter ID shouldn't overflow");
    *last_filter_id
}

async fn handle_net_version(state: StateType) -> ResponseData<String> {
    event!(Level::INFO, "net_version()");
    ResponseData::Success {
        result: u64::try_from(state.network_id)
            .expect("should convert U64 to u64")
            .to_string(),
    }
}

async fn handle_new_pending_transaction_filter(state: StateType) -> ResponseData<U256> {
    event!(Level::INFO, "eth_newPendingTransactionFilter()");
    let filter_id = get_next_filter_id(Arc::clone(&state)).await;
    state.filters.write().await.insert(
        filter_id,
        Filter {
            _criteria: None,
            deadline: new_filter_deadline(),
            events: FilteredEvents::NewPendingTransactions(Vec::new()),
            is_subscription: false,
        },
    );
    ResponseData::Success { result: filter_id }
}

async fn handle_set_balance(
    state: StateType,
    address: Address,
    balance: U256,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setBalance({address:?}, {balance:?})");
    let mut state = state.rethnet_state.write().await;
    match state.modify_account(
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
        Ok(()) => {
            state.make_snapshot();
            ResponseData::Success { result: true }
        }
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_code(
    state: StateType,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setCode({address:?}, {code:?})");
    let code_1 = code.clone();
    let code_2 = code.clone();
    let mut state = state.rethnet_state.write().await;
    match state.modify_account(
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
        Ok(()) => {
            state.make_snapshot();
            ResponseData::Success { result: true }
        }
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_nonce(state: StateType, address: Address, nonce: U256) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setNonce({address:?}, {nonce:?})");
    match TryInto::<u64>::try_into(nonce) {
        Ok(nonce) => {
            let mut state = state.rethnet_state.write().await;
            match state.modify_account(
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
                Ok(()) => {
                    state.make_snapshot();
                    ResponseData::Success { result: true }
                }
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
) -> ResponseData<bool> {
    event!(
        Level::INFO,
        "hardhat_setStorageAt({address:?}, {position:?}, {value:?})"
    );
    let mut state = state.rethnet_state.write().await;
    match state.set_account_storage_slot(address, position, value) {
        Ok(()) => {
            state.make_snapshot();
            ResponseData::Success { result: true }
        }
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

fn handle_sign(
    state: StateType,
    address: &Address,
    message: &ZeroXPrefixedBytes,
) -> ResponseData<Signature> {
    event!(Level::INFO, "eth_sign({address:?}, {message:?})");
    match state.local_accounts.get(address) {
        Some(private_key) => ResponseData::Success {
            result: Signature::new(&Bytes::from(message.clone())[..], private_key),
        },
        None => ResponseData::new_error(0, "{address} is not an account owned by this node", None),
    }
}

async fn handle_stop_impersonating_account(
    state: StateType,
    address: Address,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_stopImpersonatingAccount({address:?})");
    ResponseData::Success {
        result: state.impersonated_accounts.write().await.remove(&address),
    }
}

async fn remove_filter<const IS_SUBSCRIPTION: bool>(
    state: StateType,
    filter_id: U256,
) -> ResponseData<bool> {
    let mut filters = state.filters.write().await;
    let result = if let Some(filter) = filters.get(&filter_id) {
        filter.is_subscription == IS_SUBSCRIPTION && filters.remove(&filter_id).is_some()
    } else {
        false
    };
    ResponseData::Success { result }
}

async fn handle_uninstall_filter(state: StateType, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_uninstallFilter({filter_id:?})");
    remove_filter::<false>(state, filter_id).await
}

async fn handle_unsubscribe(state: StateType, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_unsubscribe({filter_id:?})");
    remove_filter::<true>(state, filter_id).await
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
                    response(id, handle_accounts(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::ChainId()) => {
                    response(id, handle_chain_id(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Coinbase()) => {
                    response(id, handle_coinbase(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, block)) => {
                    response(id, handle_get_balance(state, *address, block.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetCode(address, block)) => {
                    response(id, handle_get_code(state, *address, block.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetFilterChanges(filter_id)) => {
                    response(id, handle_get_filter_changes(state, *filter_id).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::GetFilterLogs(filter_id)) => {
                    response(id, handle_get_filter_logs(state, *filter_id).await)
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
                MethodInvocation::Eth(EthMethodInvocation::NetVersion()) => {
                    response(id, handle_net_version(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()) => {
                    response(id, handle_new_pending_transaction_filter(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Sign(address, message)) => {
                    response(id, handle_sign(state, address, message))
                }
                MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(filter_id)) => {
                    response(id, handle_uninstall_filter(state, *filter_id).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::Unsubscribe(subscription_id)) => {
                    response(id, handle_unsubscribe(state, *subscription_id).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(address)) => {
                    response(id, handle_impersonate_account(state, *address).await)
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
                MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(
                    address,
                )) => response(id, handle_stop_impersonating_account(state, *address).await),
                // TODO: after adding all the methods here, eliminate this
                // catch-all match arm:
                _ => {
                    let msg = format!("Method not found for invocation '{:?}'", method,);
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
    pub async fn new(config: Config) -> Result<Self, Error> {
        let listener = TcpListener::bind(config.address).map_err(Error::Listen)?;
        event!(Level::INFO, "Listening on {}", config.address);

        let (local_accounts, genesis_accounts): (
            HashMap<Address, SecretKey>,
            HashMap<Address, AccountInfo>,
        ) = {
            let secp256k1 = Secp256k1::signing_only();
            config
                .accounts
                .iter()
                .enumerate()
                .map(
                    |(
                        i,
                        AccountConfig {
                            private_key,
                            balance,
                        },
                    )| {
                        let address = public_key_to_address(private_key.public_key(&secp256k1));
                        event!(Level::INFO, "Account #{}: {address:?}", i + 1);
                        event!(
                            Level::INFO,
                            "Private Key: 0x{}",
                            hex::encode(private_key.secret_bytes())
                        );
                        let local_account = (address, *private_key);
                        let genesis_account = (
                            address,
                            AccountInfo {
                                balance: *balance,
                                nonce: 0,
                                code: None,
                                code_hash: KECCAK_EMPTY,
                            },
                        );
                        (local_account, genesis_account)
                    },
                )
                .unzip()
        };

        let chain_id = config.chain_id;
        let coinbase = config.coinbase;
        let filters = RwLock::new(HashMap::default());
        let impersonated_accounts = RwLock::new(HashSet::new());
        let last_filter_id = RwLock::new(U256::ZERO);
        let _mem_pool = Arc::new(RwLock::new(MemPool::new(config.block_gas_limit)));
        let network_id = config.network_id;
        let spec_id = config.hardfork;

        let (rethnet_state, blockchain, fork_block_number): (RethnetStateType, BlockchainType, Option<U256>)  =
            if let Some(config) = config.rpc_hardhat_network_config.forking {
                let runtime = Arc::new(
                    tokio::runtime::Builder::new_multi_thread()
                        .enable_io()
                        .enable_time()
                        .build()
                        .expect("failed to construct async runtime"),
                );

                let hash_generator = rethnet_evm::RandomHashGenerator::with_seed("seed");

                let blockchain = ForkedBlockchain::new(
                    Arc::clone(&runtime),
                    spec_id,
                    &config.json_rpc_url,
                    config.block_number.map(U256::from),
                )
                .await?;

                let fork_block_number = blockchain.last_block_number();

                let blockchain = Arc::new(RwLock::new(blockchain));

                let rethnet_state = Arc::new(RwLock::new(Box::new(ForkState::new(
                        Arc::clone(&runtime),
                        Arc::new(parking_lot::Mutex::new(hash_generator)),
                        &config.json_rpc_url,
                        fork_block_number,
                        genesis_accounts,
                    ))));

                (rethnet_state, blockchain, Some(fork_block_number))
            } else {
                let rethnet_state = HybridState::with_accounts(genesis_accounts);
                let blockchain = Arc::new(RwLock::new(LocalBlockchain::new(
                    &rethnet_state,
                    spec_id,
                    config.gas,
                    config.initial_date,
                    Some(RandomHashGenerator::with_seed("seed").next_value()),
                    config.initial_base_fee_per_gas,
                )?));
                let rethnet_state = Arc::new(RwLock::new(Box::new(rethnet_state)));
                let fork_block_number = None;
                (rethnet_state, blockchain, fork_block_number)
            };

        let app_state = Arc::new(AppState {
            blockchain,
            _mem_pool,
            rethnet_state,
            chain_id,
            coinbase,
            filters,
            fork_block_number,
            impersonated_accounts,
            last_filter_id,
            local_accounts,
            network_id,
        });

        Ok(Self {
            inner: axum::Server::from_tcp(listener)
                .unwrap()
                .serve(router(app_state).await.into_make_service()),
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
