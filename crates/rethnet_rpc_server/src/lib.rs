use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use axum::{
    extract::{Json, State},
    http::StatusCode,
    Router,
};
use parking_lot::Mutex;
use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        filter::{FilteredEvents, LogOutput},
        jsonrpc,
        jsonrpc::{Response, ResponseData},
        methods::{MethodInvocation as EthMethodInvocation, U256OrUsize},
        BlockSpec, BlockTag, Eip1898BlockSpec,
    },
    serde::{U256WithoutLeadingZeroes, U64WithoutLeadingZeroes, ZeroXPrefixedBytes},
    signature::{public_key_to_address, Signature},
    Address, Bytes, SpecId, B256, U256,
};
use rethnet_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, LocalBlockchain,
        LocalCreationError, SyncBlockchain,
    },
    state::{AccountModifierFn, ForkState, HybridState, StateError, SyncState},
    AccountInfo, Bytecode, CfgEnv, HashMap, HashSet, MemPool, MineBlockError, MineBlockResult,
    RandomHashGenerator, KECCAK_EMPTY,
};
use secp256k1::{Secp256k1, SecretKey};
use sha3::{Digest, Keccak256};
use tokio::sync::RwLock;
use tracing::{event, Level};

mod hardhat_methods;
pub use hardhat_methods::{
    reset::{RpcForkConfig, RpcHardhatNetworkConfig},
    HardhatMethodInvocation,
};

mod config;
pub use config::{AccountConfig, Config};

mod filter;
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

type RethnetStateType = Arc<RwLock<dyn SyncState<StateError>>>;
type BlockchainType = Arc<RwLock<dyn SyncBlockchain<BlockchainError>>>;

struct AppState {
    allow_blocks_with_same_timestamp: bool,
    allow_unlimited_contract_size: bool,
    block_gas_limit: U256,
    blockchain: BlockchainType,
    block_time_offset_seconds: RwLock<U256>,
    rethnet_state: RethnetStateType,
    chain_id: u64,
    coinbase: Address,
    filters: RwLock<HashMap<U256, Filter>>,
    fork_block_number: Option<U256>,
    hardfork: SpecId,
    hash_generator: Arc<Mutex<RandomHashGenerator>>,
    impersonated_accounts: RwLock<HashSet<Address>>,
    last_filter_id: RwLock<U256>,
    local_accounts: HashMap<Address, SecretKey>,
    mem_pool: Arc<RwLock<MemPool>>,
    network_id: u64,
    next_block_timestamp: RwLock<Option<U256>>,
}

impl From<&AppState> for CfgEnv {
    fn from(state: &AppState) -> Self {
        let mut cfg = CfgEnv::default();
        cfg.chain_id = U256::from(state.chain_id);
        cfg.spec_id = state.hardfork;
        cfg.limit_contract_code_size = if state.allow_unlimited_contract_size {
            Some(usize::MAX)
        } else {
            None
        };

        cfg
    }
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

    #[error("The initial date configuration value {0:?} is in the future")]
    InitialDateInFuture(SystemTime),

    #[error(transparent)]
    SystemTime(#[from] SystemTimeError),

    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),

    #[error(transparent)]
    Blockchain(#[from] BlockchainError),

    #[error(
        "The given timestamp {proposed} is lower than the previous block's timestamp {previous}"
    )]
    TimestampLowerThanPrevious { proposed: U256, previous: U256 },
}

/// `require_canonical`: whether the server should additionally raise a JSON-RPC error if the block
/// is not in the canonical chain
async fn _block_number_from_hash<T>(
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    block_hash: &B256,
    _require_canonical: bool,
) -> Result<U256, ResponseData<T>> {
    match blockchain.block_by_hash(block_hash) {
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
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    block_spec: &BlockSpec,
) -> Result<U256, ResponseData<T>> {
    match block_spec {
        BlockSpec::Number(number) => Ok(*number),
        BlockSpec::Tag(tag) => match tag {
            BlockTag::Earliest => Ok(U256::ZERO),
            BlockTag::Safe | BlockTag::Finalized => {
                confirm_post_merge_hardfork(blockchain).await?;
                Ok(blockchain.last_block_number())
            }
            BlockTag::Latest | BlockTag::Pending => Ok(blockchain.last_block_number()),
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
    blockchain: &dyn SyncBlockchain<BlockchainError>,
) -> Result<(), ResponseData<T>> {
    let last_block_number = blockchain.last_block_number();
    let post_merge = blockchain.block_supports_spec(&last_block_number, SpecId::MERGE).map_err(|e| error_response_data(0, &format!("Failed to determine whether block {last_block_number} supports the merge hardfork: {e}")))?;
    if post_merge {
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
                                confirm_post_merge_hardfork(&*blockchain).await?;
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
    event!(Level::INFO, "eth_accounts()");
    ResponseData::Success {
        result: state.local_accounts.keys().copied().collect(),
    }
}

async fn handle_block_number(state: StateType) -> ResponseData<U256WithoutLeadingZeroes> {
    event!(Level::INFO, "eth_blockNumber()");
    ResponseData::Success {
        result: state.blockchain.read().await.last_block_number().into(),
    }
}

fn handle_chain_id(state: StateType) -> ResponseData<U64WithoutLeadingZeroes> {
    event!(Level::INFO, "eth_chainId()");
    ResponseData::Success {
        result: state.chain_id.into(),
    }
}

async fn handle_coinbase(state: StateType) -> ResponseData<Address> {
    event!(Level::INFO, "eth_coinbase()");
    ResponseData::Success {
        result: state.coinbase,
    }
}

async fn handle_evm_increase_time(
    state: StateType,
    increment: U256OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_increaseTime({increment:?})");
    let increment: U256 = increment.into();
    let mut offset = state.block_time_offset_seconds.write().await;
    *offset += increment;
    ResponseData::Success {
        result: offset.to_string(),
    }
}

fn log_block(_result: &MineBlockResult, _is_interval_mined: bool) {
    // TODO
}

fn log_hardhat_mined_block(_result: &MineBlockResult) {
    // TODO
}

fn log_interval_mined_block_number(
    _block_number: U256,
    _is_empty: bool,
    _base_fee_per_gas: Option<U256>,
) {
    // TODO
}

async fn mine_block(state: &StateType, timestamp: Option<U256>) -> Result<MineBlockResult, Error> {
    let mut block_time_offset_seconds = state.block_time_offset_seconds.write().await;
    let mut next_block_timestamp = state.next_block_timestamp.write().await;

    let (block_timestamp, new_offset, timestamp_needs_increase): (U256, Option<U256>, bool) = {
        let latest_block = state.blockchain.read().await.last_block()?;
        let (block_timestamp, new_offset) = {
            let current_timestamp =
                U256::from(SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs());
            if let Some(timestamp) = timestamp {
                timestamp.checked_sub(latest_block.header.timestamp).ok_or(
                    Error::TimestampLowerThanPrevious {
                        proposed: timestamp,
                        previous: latest_block.header.timestamp,
                    },
                )?;
                (timestamp, Some(timestamp - current_timestamp))
            } else if let Some(next_block_timestamp) = *next_block_timestamp {
                (
                    next_block_timestamp,
                    Some(next_block_timestamp - current_timestamp),
                )
            } else {
                (current_timestamp + *block_time_offset_seconds, None)
            }
        };

        let timestamp_needs_increase = block_timestamp == latest_block.header.timestamp
            && !state.allow_blocks_with_same_timestamp;

        let block_timestamp = if timestamp_needs_increase {
            block_timestamp + U256::from(1)
        } else {
            block_timestamp
        };

        (block_timestamp, new_offset, timestamp_needs_increase)
    };

    let base_fee = None; // TODO: when we support hardhat_setNextBlockBaseFeePerGas, incorporate
                         // the last-passed value here. (but don't .take() it yet, because we only
                         // want to clear it if the block mining is successful.

    let reward = U256::ZERO; // TODO: https://github.com/NomicFoundation/rethnet/issues/156

    let result = rethnet_evm::mine_block(
        &mut *state.blockchain.write().await,
        &mut *state.rethnet_state.write().await,
        &mut *state.mem_pool.write().await,
        &CfgEnv::from(&**state),
        block_timestamp,
        state.block_gas_limit,
        state.coinbase,
        reward,
        base_fee,
        Some(state.hash_generator.lock().next_value()),
    );

    if result.is_ok() {
        if let Some(new_offset) = new_offset {
            *block_time_offset_seconds = new_offset;
        }

        if timestamp_needs_increase {
            *block_time_offset_seconds += U256::from(1);
        }

        next_block_timestamp.take();

        // TODO: when we support hardhat_setNextBlockBaseFeePerGas, reset the user provided
        // next block base fee per gas to `None`
    }

    result.map_err(Error::MineBlock)
}

async fn handle_evm_mine(state: StateType, timestamp: Option<U256OrUsize>) -> ResponseData<String> {
    event!(Level::INFO, "evm_mine({timestamp:?})");
    let timestamp: Option<U256> = timestamp.map(U256OrUsize::into);

    match mine_block(&state, timestamp).await {
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
    state: StateType,
    timestamp: U256OrUsize,
) -> ResponseData<String> {
    event!(Level::INFO, "evm_setNextBlockTimestamp({timestamp:?})");
    match state.blockchain.read().await.last_block() {
        Ok(latest_block) => {
            match Into::<U256>::into(timestamp.clone()).checked_sub(latest_block.header.timestamp) {
                Some(increment) => {
                    if increment == U256::ZERO && !state.allow_blocks_with_same_timestamp {
                        error_response_data(0, &format!("Timestamp {timestamp:?} is equal to the previous block's timestamp. Enable the 'allowBlocksWithSameTimestamp' option to allow this"))
                    } else {
                        let mut next_block_timestamp = state.next_block_timestamp.write().await;
                        let timestamp: U256 = timestamp.into();
                        *next_block_timestamp = Some(timestamp);
                        ResponseData::Success {
                            result: timestamp.to_string(),
                        }
                    }
                }
                None => error_response_data(
                    -32000,
                    &format!(
                        "Timestamp {:?} is lower than the previous block's timestamp {}",
                        timestamp, latest_block.header.timestamp
                    ),
                ),
            }
        }
        Err(e) => error_response_data(0, &format!("Error: {e}")),
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
                        result: account_info.balance.into(),
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
                                error_response_data(0, &format!("failed to retrieve code: {e}"))
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
                        error_response_data(0, &format!("failed to retrieve storage value: {e}"))
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
                        result: U256::from(account_info.nonce).into(),
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

async fn handle_hardhat_mine(
    state: StateType,
    count: Option<U256>,
    interval: Option<U256>,
) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_mine({count:?}, {interval:?})");

    let mut mine_block_results: Vec<MineBlockResult> = Vec::new();

    let interval = interval.unwrap_or(U256::from(1));
    let count = count.unwrap_or(U256::from(1));

    let mut i = U256::from(1);
    while i <= count {
        let timestamp = match mine_block_results.len() {
            0 => None,
            _ => Some(
                mine_block_results[mine_block_results.len() - 1]
                    .block
                    .header
                    .timestamp
                    + interval,
            ),
        };
        match mine_block(&state, timestamp).await {
            Ok(result) => mine_block_results.push(result),
            Err(e) => {
                let generic_message = &format!("failed to mine the {i}th block in the interval");
                match e {
                    Error::TimestampLowerThanPrevious { proposed, previous } => {
                        return error_response_data(
                            0,
                            &format!(
                                "{generic_message}: {}",
                                Error::TimestampLowerThanPrevious { proposed, previous }
                            ),
                        );
                    }
                    e => {
                        return error_response_data(0, &format!("{generic_message}: {e}"));
                    }
                }
            }
        }
        i += U256::from(1);
    }

    mine_block_results.iter().for_each(log_hardhat_mined_block);

    ResponseData::Success { result: true }
}

async fn handle_interval_mine(state: StateType) -> ResponseData<bool> {
    event!(Level::INFO, "hardhat_intervalMine()");
    match mine_block(&state, None).await {
        Ok(mine_block_result) => {
            if mine_block_result.block.transactions.is_empty() {
                log_interval_mined_block_number(
                    mine_block_result.block.header.number,
                    true,
                    mine_block_result.block.header.base_fee_per_gas,
                );
            } else {
                log_block(&mine_block_result, true);
                log_interval_mined_block_number(mine_block_result.block.header.number, false, None);
            }
            ResponseData::Success { result: true }
        }
        Err(e) => error_response_data(0, &format!("Error mining block: {e}")),
    }
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
        result: state.network_id.to_string(),
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
            *account_balance = balance;
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
            *account_code = Some(Bytecode::new_raw(code_1.clone().into()));
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

fn handle_net_listening() -> ResponseData<bool> {
    event!(Level::INFO, "net_listening()");
    ResponseData::Success { result: true }
}

fn handle_net_peer_count() -> ResponseData<U64WithoutLeadingZeroes> {
    event!(Level::INFO, "net_peerCount()");
    ResponseData::Success { result: 0.into() }
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
        let hardfork = config.hardfork;
        let cache_dir = config.cache_dir;
        let hash_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("EDR")));

        let (rethnet_state, blockchain, fork_block_number): (
            RethnetStateType,
            BlockchainType,
            Option<U256>,
        ) = if let Some(config) = config.rpc_hardhat_network_config.forking {
            let runtime = Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_io()
                    .enable_time()
                    .build()
                    .expect("failed to construct async runtime"),
            );

            let blockchain = ForkedBlockchain::new(
                Arc::clone(&runtime),
                hardfork,
                &config.json_rpc_url,
                cache_dir.clone(),
                config.block_number.map(U256::from),
            )
            .await?;

            let fork_block_number = blockchain.last_block_number();

            let blockchain = Arc::new(RwLock::new(blockchain));

            let rethnet_state = Arc::new(RwLock::new(ForkState::new(
                Arc::clone(&runtime),
                Arc::clone(&hash_generator),
                &config.json_rpc_url,
                cache_dir,
                fork_block_number,
                genesis_accounts,
            )));

            (rethnet_state, blockchain, Some(fork_block_number))
        } else {
            let rethnet_state = HybridState::with_accounts(genesis_accounts);
            let blockchain = Arc::new(RwLock::new(LocalBlockchain::new(
                &rethnet_state,
                U256::from(chain_id),
                hardfork,
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
            )?));
            let rethnet_state = Arc::new(RwLock::new(rethnet_state));
            let fork_block_number = None;
            (rethnet_state, blockchain, fork_block_number)
        };

        let app_state = Arc::new(AppState {
            allow_blocks_with_same_timestamp: config.allow_blocks_with_same_timestamp,
            allow_unlimited_contract_size: config.allow_unlimited_contract_size,
            block_gas_limit: config.block_gas_limit,
            blockchain,
            block_time_offset_seconds: RwLock::new(
                if let Some(initial_date) = config.initial_date {
                    U256::from(
                        SystemTime::now()
                            .duration_since(initial_date)
                            .map_err(|_e| Error::InitialDateInFuture(initial_date))?
                            .as_secs(),
                    )
                } else {
                    U256::ZERO
                },
            ),
            rethnet_state,
            chain_id,
            coinbase: config.coinbase,
            filters: RwLock::new(HashMap::default()),
            fork_block_number,
            hardfork,
            hash_generator,
            impersonated_accounts: RwLock::new(HashSet::new()),
            last_filter_id: RwLock::new(U256::ZERO),
            local_accounts,
            mem_pool: Arc::new(RwLock::new(MemPool::new(config.block_gas_limit))),
            network_id: config.network_id,
            next_block_timestamp: RwLock::default(),
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
