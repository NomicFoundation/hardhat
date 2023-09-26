use std::mem;
use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use rethnet_eth::remote::{RpcClient, RpcClientError};
use rethnet_eth::U64;
use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        filter::{FilteredEvents, LogOutput},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::{MethodInvocation as EthMethodInvocation, U256OrUsize},
        BlockSpec, BlockTag, Eip1898BlockSpec,
    },
    serde::ZeroXPrefixedBytes,
    signature::{public_key_to_address, Signature},
    Address, Bytes, SpecId, B256, U256,
};
use rethnet_evm::state::{AccountTrie, TrieState};
use rethnet_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, LocalBlockchain,
        LocalCreationError, SyncBlockchain,
    },
    state::{IrregularState, StateError, SyncState},
    AccountInfo, CfgEnv, HashMap, HashSet, MemPool, MineBlockResult, RandomHashGenerator,
    KECCAK_EMPTY,
};
use secp256k1::{Secp256k1, SecretKey};
use sha3::{Digest, Keccak256};
use tokio::sync::RwLock;
use tracing::{event, Level};

mod hardhat_methods;
mod node;
pub use hardhat_methods::{
    reset::{RpcForkConfig, RpcHardhatNetworkConfig},
    HardhatMethodInvocation,
};

mod config;
pub use config::{AccountConfig, Config};

mod filter;
use crate::node::{Node, NodeData, NodeError};
use filter::{new_filter_deadline, Filter};

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

struct AppData {
    chain_id: u64,
    filters: RwLock<HashMap<U256, Filter>>,
    impersonated_accounts: RwLock<HashSet<Address>>,
    last_filter_id: RwLock<U256>,
    local_accounts: HashMap<Address, SecretKey>,
    network_id: u64,
    node: Node,
}

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

    #[error("Failed to construct forked state")]
    ForkedStateCreation(RpcClientError),

    #[error(transparent)]
    LocalBlockchainCreation(#[from] LocalCreationError),

    #[error("The initial date configuration value {0:?} is in the future")]
    InitialDateInFuture(SystemTime),

    #[error(transparent)]
    Node(#[from] NodeError),

    #[error(transparent)]
    Blockchain(#[from] BlockchainError),
}

/// `require_canonical`: whether the server should additionally raise a JSON-RPC error if the block
/// is not in the canonical chain
async fn _block_number_from_hash<T>(
    blockchain: &dyn SyncBlockchain<BlockchainError, StateError>,
    block_hash: &B256,
    _require_canonical: bool,
) -> Result<U256, ResponseData<T>> {
    match blockchain.block_by_hash(block_hash).await {
        Ok(Some(block)) => Ok(block.header().number),
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
    blockchain: &dyn SyncBlockchain<BlockchainError, StateError>,
    block_spec: &BlockSpec,
) -> Result<U256, ResponseData<T>> {
    match block_spec {
        BlockSpec::Number(number) => Ok(*number),
        BlockSpec::Tag(tag) => match tag {
            BlockTag::Earliest => Ok(U256::ZERO),
            BlockTag::Safe | BlockTag::Finalized => {
                confirm_post_merge_hardfork(blockchain).await?;
                Ok(blockchain.last_block_number().await)
            }
            BlockTag::Latest | BlockTag::Pending => Ok(blockchain.last_block_number().await),
        },
        BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
            block_hash,
            require_canonical,
        }) => {
            _block_number_from_hash(blockchain, block_hash, require_canonical.unwrap_or(false))
                .await
        }
        BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Ok(*block_number),
    }
}

async fn confirm_post_merge_hardfork<T>(
    blockchain: &dyn SyncBlockchain<BlockchainError, StateError>,
) -> Result<(), ResponseData<T>> {
    let last_block_number = blockchain.last_block_number().await;

    let spec_id = blockchain.spec_at_block_number(&last_block_number).await.map_err(|e| error_response_data(0, &format!("Failed to determine whether block {last_block_number} supports the merge hardfork: {e}")))?;

    if spec_id >= SpecId::MERGE {
        Ok(())
    } else {
        Err(error_response_data(
            0,
            &format!("Block {last_block_number} does not support the merge hardfork"),
        ))
    }
}

/// returns the state root in effect BEFORE setting the block context, so that the caller can
/// restore the context to that state root.
#[allow(clippy::todo)]
async fn set_block_context<T>(
    node_data: &mut NodeData,
    block_spec: Option<BlockSpec>,
) -> Result<Box<dyn SyncState<StateError>>, ResponseData<T>> {
    match block_spec {
        Some(BlockSpec::Tag(BlockTag::Pending)) => {
            // do nothing
            Ok(node_data.state.clone())
        }
        Some(BlockSpec::Tag(BlockTag::Latest)) if node_data.fork_block_number.is_none() => {
            Ok(node_data.state.clone())
        }
        None => Ok(node_data.state.clone()),
        resolvable_block_spec => {
            let latest_block_number = node_data.blockchain.last_block_number().await;
            let block_number = match resolvable_block_spec.clone() {
                Some(BlockSpec::Number(n)) => Ok(n),
                Some(BlockSpec::Eip1898(s)) => match s {
                    Eip1898BlockSpec::Number { block_number: n } => Ok(n),
                    Eip1898BlockSpec::Hash {
                        block_hash,
                        require_canonical: _,
                    } => match node_data.blockchain.block_by_hash(&block_hash).await {
                        Err(e) => Err(error_response_data(
                            0,
                            &format!("failed to get block by hash {block_hash}: {e}"),
                        )),
                        Ok(None) => Err(error_response_data(
                            0,
                            &format!("block hash {block_hash} does not refer to a known block"),
                        )),
                        Ok(Some(block)) => Ok(block.header().number),
                    },
                },
                Some(BlockSpec::Tag(tag)) => match tag {
                    BlockTag::Earliest => Ok(U256::ZERO),
                    BlockTag::Safe | BlockTag::Finalized => {
                        confirm_post_merge_hardfork(&*node_data.blockchain).await?;
                        Ok(latest_block_number)
                    }
                    BlockTag::Latest => Ok(latest_block_number),
                    BlockTag::Pending => unreachable!(),
                },
                None => unreachable!(),
            }?;

            let mut contextual_state = node_data.blockchain.state_at_block_number(&block_number).await
            .map_err(|e| {
                error_response_data(
                    -32000,
                    &format!(
                        "Received invalid block tag {}. Latest block number is {latest_block_number}. {e}",
                        resolvable_block_spec.unwrap(),
                    ),
                )
            })?;

            mem::swap(&mut node_data.state, &mut contextual_state);

            Ok(contextual_state)
        }
    }
}

async fn get_account_info<T>(
    node_data: &NodeData,
    address: Address,
) -> Result<AccountInfo, ResponseData<T>> {
    match node_data.state.basic(address) {
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

async fn handle_accounts(state: Arc<AppData>) -> ResponseData<Vec<Address>> {
    event!(Level::INFO, "eth_accounts()");
    ResponseData::Success {
        result: state.local_accounts.keys().copied().collect(),
    }
}

async fn handle_block_number(app_data: Arc<AppData>) -> ResponseData<U256> {
    event!(Level::INFO, "eth_blockNumber()");
    let node_data = app_data.node.lock_data().await;
    ResponseData::Success {
        result: node_data.blockchain.last_block_number().await,
    }
}

fn handle_chain_id(state: Arc<AppData>) -> ResponseData<U64> {
    event!(Level::INFO, "eth_chainId()");
    ResponseData::Success {
        result: U64::from(state.chain_id),
    }
}

async fn handle_coinbase(state: Arc<AppData>) -> ResponseData<Address> {
    event!(Level::INFO, "eth_coinbase()");
    ResponseData::Success {
        result: state.node.lock_data().await.beneficiary,
    }
}

async fn handle_evm_increase_time(
    state: Arc<AppData>,
    increment: U256OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_increaseTime({increment:?})");
    let increment: U256 = increment.into();
    let mut node_data = state.node.lock_data().await;
    node_data.block_time_offset_seconds += increment;
    ResponseData::Success {
        result: node_data.block_time_offset_seconds.to_string(),
    }
}

fn log_block(_result: &MineBlockResult<BlockchainError, StateError>, _is_interval_mined: bool) {
    // TODO
}

fn log_hardhat_mined_block(_result: &MineBlockResult<BlockchainError, StateError>) {
    // TODO
}

fn log_interval_mined_block_number(
    _block_number: U256,
    _is_empty: bool,
    _base_fee_per_gas: Option<U256>,
) {
    // TODO
}

async fn handle_evm_mine(
    state: Arc<AppData>,
    timestamp: Option<U256OrUsize>,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_mine({timestamp:?})");
    let timestamp: Option<U256> = timestamp.map(U256OrUsize::into);

    let mut node_data = state.node.lock_data().await;
    match node_data.mine_block(timestamp).await {
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
    app_data: Arc<AppData>,
    timestamp: U256OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_setNextBlockTimestamp({timestamp:?})");
    let mut node_data = app_data.node.lock_data().await;
    match node_data.blockchain.last_block().await {
        Ok(latest_block) => {
            let latest_block_header = latest_block.header();
            match Into::<U256>::into(timestamp.clone()).checked_sub(latest_block_header.timestamp) {
                Some(increment) => {
                    if increment == U256::ZERO && !node_data.allow_blocks_with_same_timestamp {
                        error_response_data(0, &format!("Timestamp {timestamp:?} is equal to the previous block's timestamp. Enable the 'allowBlocksWithSameTimestamp' option to allow this"))
                    } else {
                        let timestamp: U256 = timestamp.into();
                        node_data.next_block_timestamp = Some(timestamp);
                        ResponseData::Success {
                            result: timestamp.to_string(),
                        }
                    }
                }
                None => error_response_data(
                    -32000,
                    &format!(
                        "Timestamp {:?} is lower than the previous block's timestamp {}",
                        timestamp, latest_block_header.timestamp
                    ),
                ),
            }
        }
        Err(e) => error_response_data(0, &format!("Error: {e}")),
    }
}

async fn handle_get_balance(
    app_data: Arc<AppData>,
    address: Address,
    block_spec: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(Level::INFO, "eth_getBalance({address:?}, {block_spec:?})");
    match app_data.node.balance(address, block_spec).await {
        Ok(balance) => ResponseData::Success { result: balance },
        // Internal server error
        Err(e) => error_response_data(-32000, &e.to_string()),
    }
}

async fn handle_get_code(
    app_data: Arc<AppData>,
    address: Address,
    block: Option<BlockSpec>,
) -> ResponseData<ZeroXPrefixedBytes> {
    event!(Level::INFO, "eth_getCode({address:?}, {block:?})");
    let mut node_data = app_data.node.lock_data().await;
    match set_block_context(&mut node_data, block).await {
        Ok(previous_state) => {
            let account_info = get_account_info(&node_data, address).await;

            node_data.state = previous_state;

            match account_info {
                Ok(account_info) => match node_data.state.code_by_hash(account_info.code_hash) {
                    Ok(code) => ResponseData::Success {
                        result: ZeroXPrefixedBytes::from(code.bytecode),
                    },
                    Err(e) => error_response_data(0, &format!("failed to retrieve code: {e}")),
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_get_filter_changes(
    state: Arc<AppData>,
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
    state: Arc<AppData>,
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
    app_data: Arc<AppData>,
    address: Address,
    position: U256,
    block: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getStorageAt({address:?}, {position:?}, {block:?})"
    );
    let mut node_data = app_data.node.lock_data().await;
    match set_block_context(&mut node_data, block).await {
        Ok(previous_state) => {
            let value = node_data.state.storage(address, position);

            node_data.state = previous_state;

            match value {
                Ok(value) => ResponseData::Success { result: value },
                Err(e) => error_response_data(0, &format!("failed to retrieve storage value: {e}")),
            }
        }
        Err(e) => e,
    }
}

async fn handle_get_transaction_count(
    app_data: Arc<AppData>,
    address: Address,
    block: Option<BlockSpec>,
) -> ResponseData<U256> {
    event!(
        Level::INFO,
        "eth_getTransactionCount({address:?}, {block:?})"
    );
    let mut node_data = app_data.node.lock_data().await;
    match set_block_context(&mut node_data, block).await {
        Ok(previous_state) => {
            let account_info = get_account_info(&node_data, address).await;

            node_data.state = previous_state;

            match account_info {
                Ok(account_info) => ResponseData::Success {
                    result: U256::from(account_info.nonce),
                },
                Err(e) => e,
            }
        }
        Err(e) => e,
    }
}

async fn handle_impersonate_account(state: Arc<AppData>, address: Address) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_impersonateAccount({address:?})");
    state.impersonated_accounts.write().await.insert(address);
    ResponseData::Success { result: true }
}

async fn handle_hardhat_mine(
    state: Arc<AppData>,
    count: Option<U256>,
    interval: Option<U256>,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_mine({count:?}, {interval:?})");

    let mut node_data = state.node.lock_data().await;

    let mut mine_block_results: Vec<MineBlockResult<BlockchainError, StateError>> = Vec::new();

    let interval = interval.unwrap_or(U256::from(1));
    let count = count.unwrap_or(U256::from(1));

    let mut i = U256::from(1);
    while i <= count {
        let timestamp = mine_block_results
            .last()
            .map(|result| result.block.header().timestamp + interval);

        match node_data.mine_block(timestamp).await {
            Ok(result) => {
                node_data.state = result.state.clone();

                mine_block_results.push(result);
            }
            Err(e) => {
                let generic_message = &format!("failed to mine the {i}th block in the interval");
                return match e {
                    NodeError::TimestampLowerThanPrevious { proposed, previous } => {
                        error_response_data(
                            0,
                            &format!(
                                "{generic_message}: {}",
                                NodeError::TimestampLowerThanPrevious { proposed, previous }
                            ),
                        )
                    }
                    e => error_response_data(0, &format!("{generic_message}: {e}")),
                };
            }
        }
        i += U256::from(1);
    }

    mine_block_results.iter().for_each(log_hardhat_mined_block);

    ResponseData::Success { result: true }
}

async fn handle_interval_mine(state: Arc<AppData>) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_intervalMine()");
    let mut node_data = state.node.lock_data().await;
    match node_data.mine_block(None).await {
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

async fn get_next_filter_id(state: Arc<AppData>) -> U256 {
    let mut last_filter_id = state.last_filter_id.write().await;
    *last_filter_id = last_filter_id
        .checked_add(U256::from(1))
        .expect("filter ID shouldn't overflow");
    *last_filter_id
}

async fn handle_net_version(state: Arc<AppData>) -> ResponseData<String> {
    event!(Level::INFO, "net_version()");
    ResponseData::Success {
        result: state.network_id.to_string(),
    }
}

async fn handle_new_pending_transaction_filter(state: Arc<AppData>) -> ResponseData<U256> {
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
    app_data: Arc<AppData>,
    address: Address,
    balance: U256,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setBalance({address:?}, {balance:?})");

    match app_data.node.set_balance(address, balance).await {
        // Hardhat always returns true if there is no error.
        Ok(()) => ResponseData::Success { result: true },
        // Internal server error
        Err(e) => error_response_data(-32000, &e.to_string()),
    }
}

async fn handle_set_code(
    app_data: Arc<AppData>,
    address: Address,
    code: ZeroXPrefixedBytes,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setCode({address:?}, {code:?})");

    match app_data.node.set_code(address, code.into()).await {
        // Hardhat always returns true if there is no error.
        Ok(()) => ResponseData::Success { result: true },
        Err(e) => ResponseData::new_error(0, &e.to_string(), None),
    }
}

async fn handle_set_nonce(
    app_data: Arc<AppData>,
    address: Address,
    nonce: U256,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_setNonce({address:?}, {nonce:?})");

    match TryInto::<u64>::try_into(nonce) {
        Ok(nonce) => match app_data.node.set_nonce(address, nonce).await {
            Ok(()) => ResponseData::Success { result: true },
            Err(error) => ResponseData::new_error(0, &error.to_string(), None),
        },
        Err(error) => ResponseData::new_error(0, &error.to_string(), None),
    }
}

async fn handle_set_storage_at(
    app_data: Arc<AppData>,
    address: Address,
    index: U256,
    value: U256,
) -> ResponseData<bool> {
    event!(
        Level::INFO,
        "hardhat_setStorageAt({address:?}, {index:?}, {value:?})"
    );
    match app_data
        .node
        .set_account_storage_slot(address, index, value)
        .await
    {
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

fn handle_sign(
    state: Arc<AppData>,
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
    state: Arc<AppData>,
    address: Address,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_stopImpersonatingAccount({address:?})");
    ResponseData::Success {
        result: state.impersonated_accounts.write().await.remove(&address),
    }
}

async fn remove_filter<const IS_SUBSCRIPTION: bool>(
    state: Arc<AppData>,
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

async fn handle_uninstall_filter(state: Arc<AppData>, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_uninstallFilter({filter_id:?})");
    remove_filter::<false>(state, filter_id).await
}

async fn handle_unsubscribe(state: Arc<AppData>, filter_id: U256) -> ResponseData<bool> {
    event!(Level::INFO, "eth_unsubscribe({filter_id:?})");
    remove_filter::<true>(state, filter_id).await
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
    state: Arc<AppData>,
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
                MethodInvocation::Eth(EthMethodInvocation::BlockNumber()) => {
                    response(id, handle_block_number(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::ChainId()) => {
                    response(id, handle_chain_id(state))
                }
                MethodInvocation::Eth(EthMethodInvocation::Coinbase()) => {
                    response(id, handle_coinbase(state).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmIncreaseTime(increment)) => {
                    response(id, handle_evm_increase_time(state, increment.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmMine(timestamp)) => {
                    response(id, handle_evm_mine(state, timestamp.clone()).await)
                }
                MethodInvocation::Eth(EthMethodInvocation::EvmSetNextBlockTimestamp(timestamp)) => {
                    response(
                        id,
                        handle_evm_set_next_block_timestamp(state, timestamp.clone()).await,
                    )
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
                MethodInvocation::Eth(EthMethodInvocation::NetListening()) => {
                    response(id, handle_net_listening())
                }
                MethodInvocation::Eth(EthMethodInvocation::NetPeerCount()) => {
                    response(id, handle_net_peer_count())
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
                MethodInvocation::Eth(EthMethodInvocation::Web3ClientVersion()) => {
                    response(id, handle_web3_client_version())
                }
                MethodInvocation::Eth(EthMethodInvocation::Web3Sha3(message)) => {
                    response(id, handle_web3_sha3(message.clone()))
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
                MethodInvocation::Hardhat(HardhatMethodInvocation::IntervalMine()) => {
                    response(id, handle_interval_mine(state).await)
                }
                MethodInvocation::Hardhat(HardhatMethodInvocation::Mine(count, interval)) => {
                    response(id, handle_hardhat_mine(state, *count, *interval).await)
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

async fn router(state: Arc<AppData>) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(state): State<Arc<AppData>>, payload: Json<Request>| async move {
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
        let spec_id = config.hardfork;
        let cache_dir = config.cache_dir;
        let prevrandao_generator = RandomHashGenerator::with_seed("randomMixHashSeed");

        #[allow(clippy::type_complexity)]
        let (state, blockchain, fork_block_number): (
            Box<dyn SyncState<StateError>>,
            Box<dyn SyncBlockchain<BlockchainError, StateError>>,
            _,
        ) = if let Some(config) = config.rpc_hardhat_network_config.forking {
            let runtime = Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("failed to construct async runtime"),
            );

            let state_root_generator = Arc::new(parking_lot::Mutex::new(
                RandomHashGenerator::with_seed("seed"),
            ));

            let rpc_client = RpcClient::new(&config.json_rpc_url, cache_dir);

            let blockchain = ForkedBlockchain::new(
                runtime.handle().clone(),
                spec_id,
                rpc_client,
                config.block_number.map(U256::from),
                state_root_generator,
                genesis_accounts,
                // TODO: make hardfork activations configurable (https://github.com/NomicFoundation/rethnet/issues/111)
                HashMap::new(),
            )
            .await?;

            let fork_block_number = blockchain.last_block_number().await;

            let state = blockchain
                .state_at_block_number(&fork_block_number)
                .await
                .expect("Fork state must exist");

            (
                Box::new(state),
                Box::new(blockchain),
                Some(fork_block_number),
            )
        } else {
            let state = TrieState::with_accounts(AccountTrie::with_accounts(&genesis_accounts));

            let blockchain = LocalBlockchain::new(
                state,
                U256::from(chain_id),
                spec_id,
                config.gas,
                config.initial_date.map(|d| {
                    U256::from(
                        d.duration_since(UNIX_EPOCH)
                            .expect("initial date must be after UNIX epoch")
                            .as_secs(),
                    )
                }),
                Some(RandomHashGenerator::with_seed("seed").next_value()),
                config.initial_base_fee_per_gas,
            )?;

            let state = blockchain
                .state_at_block_number(&U256::ZERO)
                .await
                .expect("Genesis state must exist");

            let fork_block_number = None;
            (state, Box::new(blockchain), fork_block_number)
        };

        let block_time_offset_seconds = if let Some(initial_date) = config.initial_date {
            U256::from(
                SystemTime::now()
                    .duration_since(initial_date)
                    .map_err(|_e| Error::InitialDateInFuture(initial_date))?
                    .as_secs(),
            )
        } else {
            U256::ZERO
        };

        let mut evm_config = CfgEnv::default();
        evm_config.chain_id = config.chain_id;
        evm_config.spec_id = config.hardfork;
        evm_config.limit_contract_code_size = if config.allow_unlimited_contract_size {
            Some(usize::MAX)
        } else {
            None
        };

        let node_data = NodeData {
            blockchain,
            state,
            irregular_state: IrregularState::default(),
            mem_pool: MemPool::new(config.block_gas_limit),
            evm_config,
            beneficiary: config.coinbase,
            // TODO: Add config option (https://github.com/NomicFoundation/rethnet/issues/111)
            min_gas_price: U256::MAX,
            prevrandao_generator,
            block_time_offset_seconds,
            next_block_timestamp: None,
            allow_blocks_with_same_timestamp: config.allow_blocks_with_same_timestamp,
            fork_block_number,
        };

        let app_data = Arc::new(AppData {
            chain_id,
            filters: RwLock::new(HashMap::default()),
            impersonated_accounts: RwLock::new(HashSet::new()),
            last_filter_id: RwLock::new(U256::ZERO),
            local_accounts,
            network_id: config.network_id,
            node: Node::new(node_data),
        });

        Ok(Self {
            inner: axum::Server::from_tcp(listener)
                .unwrap()
                .serve(router(app_data).await.into_make_service()),
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
