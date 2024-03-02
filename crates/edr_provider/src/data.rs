mod account;
mod call;
mod gas;
mod inspector;

use std::{
    cmp,
    cmp::Ordering,
    collections::BTreeMap,
    fmt::Debug,
    num::NonZeroUsize,
    sync::Arc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    block::{calculate_next_base_fee, miner_reward, BlobGas, BlockOptions},
    log::FilterLog,
    receipt::BlockReceipt,
    remote::{
        client::{HeaderMap, HttpError},
        eth::FeeHistoryResult,
        filter::{FilteredEvents, LogOutput, SubscriptionType},
        BlockSpec, BlockTag, Eip1898BlockSpec, RpcClient, RpcClientError,
    },
    reward_percentile::RewardPercentile,
    signature::{RecoveryMessage, Signature},
    transaction::TransactionRequestAndSender,
    Address, Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, GenesisBlockOptions,
        LocalBlockchain, LocalCreationError, SyncBlockchain,
    },
    db::StateRef,
    debug_trace_transaction, execution_result_to_debug_result, mempool, mine_block,
    state::{
        AccountModifierFn, IrregularState, StateDiff, StateError, StateOverride, StateOverrides,
        SyncState,
    },
    trace::{Trace, TraceCollector},
    Account, AccountInfo, BlobExcessGasAndPrice, Block, BlockEnv, Bytecode, CfgEnv,
    DebugTraceConfig, DebugTraceResult, DualInspector, ExecutableTransaction, ExecutionResult,
    HashMap, HashSet, MemPool, OrderedTransaction, RandomHashGenerator, StorageSlot, SyncBlock,
    TracerEip3155, TxEnv, KECCAK_EMPTY,
};
use ethers_core::types::transaction::eip712::{Eip712, TypedData};
use gas::gas_used_ratio;
use indexmap::IndexMap;
use itertools::izip;
use lazy_static::lazy_static;
use lru::LruCache;
use tokio::runtime;

use self::{
    account::{create_accounts, InitialAccounts},
    gas::{BinarySearchEstimationResult, CheckGasResult},
    inspector::EvmInspector,
};
pub use crate::data::inspector::{CallOverrideResult, SyncCallOverride};
use crate::{
    data::{
        call::{run_call, RunCallArgs},
        gas::{compute_rewards, BinarySearchEstimationArgs, CheckGasLimitArgs},
    },
    debug_mine::{DebugMineBlockResult, DebugMineBlockResultAndState},
    error::{EstimateGasFailure, TransactionFailure, TransactionFailureWithTraces},
    filter::{bloom_contains_log_filter, filter_logs, Filter, FilterData, LogFilter},
    logger::SyncLogger,
    pending::BlockchainWithPending,
    requests::hardhat::rpc_types::{ForkConfig, ForkMetadata},
    snapshot::Snapshot,
    MiningConfig, ProviderConfig, ProviderError, SubscriptionEvent, SubscriptionEventData,
    SyncSubscriberCallback,
};

const DEFAULT_INITIAL_BASE_FEE_PER_GAS: u64 = 1_000_000_000;
const MAX_CACHED_STATES: usize = 10;

/// The result of executing an `eth_call`.
#[derive(Clone, Debug)]
pub struct CallResult {
    pub console_log_inputs: Vec<Bytes>,
    pub execution_result: ExecutionResult,
    pub trace: Trace,
}

#[derive(Clone)]
pub struct EstimateGasResult {
    pub estimation: u64,
    pub traces: Vec<Trace>,
}

pub struct SendTransactionResult {
    pub transaction_hash: B256,
    /// Present if the transaction was auto-mined.
    pub transaction_result: Option<(ExecutionResult, Trace)>,
    pub mining_results: Vec<DebugMineBlockResult<BlockchainError>>,
}

#[derive(Debug, thiserror::Error)]
pub enum CreationError {
    /// A blockchain error
    #[error(transparent)]
    Blockchain(BlockchainError),
    /// An error that occurred while constructing a forked blockchain.
    #[error(transparent)]
    ForkedBlockchainCreation(#[from] ForkedCreationError),
    #[error("Invalid HTTP header name: {0}")]
    InvalidHttpHeaders(HttpError),
    /// Invalid initial date
    #[error("The initial date configuration value {0:?} is before the UNIX epoch")]
    InvalidInitialDate(SystemTime),
    /// An error that occurred while constructing a local blockchain.
    #[error(transparent)]
    LocalBlockchainCreation(#[from] LocalCreationError),
    /// An error that occured while querying the remote state.
    #[error(transparent)]
    RpcClient(#[from] RpcClientError),
}

pub struct ProviderData<LoggerErrorT: Debug> {
    runtime_handle: runtime::Handle,
    initial_config: ProviderConfig,
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    pub irregular_state: IrregularState,
    mem_pool: MemPool,
    beneficiary: Address,
    dao_activation_block: Option<u64>,
    min_gas_price: U256,
    parent_beacon_block_root_generator: RandomHashGenerator,
    prev_randao_generator: RandomHashGenerator,
    block_time_offset_seconds: i64,
    fork_metadata: Option<ForkMetadata>,
    // Must be set if the provider is created with a fork config.
    // Hack to get around the type erasure with the dyn blockchain trait.
    rpc_client: Option<RpcClient>,
    instance_id: B256,
    is_auto_mining: bool,
    next_block_base_fee_per_gas: Option<U256>,
    next_block_timestamp: Option<u64>,
    next_snapshot_id: u64,
    snapshots: BTreeMap<u64, Snapshot>,
    allow_blocks_with_same_timestamp: bool,
    allow_unlimited_contract_size: bool,
    // IndexMap to preserve account order for logging.
    local_accounts: IndexMap<Address, k256::SecretKey>,
    filters: HashMap<U256, Filter>,
    last_filter_id: U256,
    logger: Box<dyn SyncLogger<BlockchainError = BlockchainError, LoggerError = LoggerErrorT>>,
    impersonated_accounts: HashSet<Address>,
    subscriber_callback: Box<dyn SyncSubscriberCallback>,
    call_override: Option<Arc<dyn SyncCallOverride>>,
    // We need the Arc to let us avoid returning references to the cache entries which need &mut
    // self to get.
    block_state_cache: LruCache<StateId, Arc<Box<dyn SyncState<StateError>>>>,
    current_state_id: StateId,
    block_number_to_state_id: BTreeMap<u64, StateId>,
}

impl<LoggerErrorT: Debug> ProviderData<LoggerErrorT> {
    pub fn new(
        runtime_handle: runtime::Handle,
        logger: Box<dyn SyncLogger<BlockchainError = BlockchainError, LoggerError = LoggerErrorT>>,
        subscriber_callback: Box<dyn SyncSubscriberCallback>,
        call_override: Option<Arc<dyn SyncCallOverride>>,
        config: ProviderConfig,
    ) -> Result<Self, CreationError> {
        let InitialAccounts {
            local_accounts,
            genesis_accounts,
        } = create_accounts(&config);

        let BlockchainAndState {
            blockchain,
            fork_metadata,
            rpc_client,
            state,
            irregular_state,
            prev_randao_generator,
            block_time_offset_seconds,
            next_block_base_fee_per_gas,
        } = create_blockchain_and_state(runtime_handle.clone(), &config, genesis_accounts)?;

        let mut block_state_cache =
            LruCache::new(NonZeroUsize::new(MAX_CACHED_STATES).expect("constant is non-zero"));
        let mut block_number_to_state_id = BTreeMap::new();

        let current_state_id = StateId::default();
        block_state_cache.push(current_state_id, Arc::new(state));
        block_number_to_state_id.insert(blockchain.last_block_number(), current_state_id);

        let allow_blocks_with_same_timestamp = config.allow_blocks_with_same_timestamp;
        let allow_unlimited_contract_size = config.allow_unlimited_contract_size;
        let beneficiary = config.coinbase;
        let block_gas_limit = config.block_gas_limit;
        let is_auto_mining = config.mining.auto_mine;
        let min_gas_price = config.min_gas_price;

        let dao_activation_block = config
            .chains
            .get(&config.chain_id)
            .and_then(|config| config.hardfork_activation(SpecId::DAO_FORK));

        let parent_beacon_block_root_generator = if let Some(initial_parent_beacon_block_root) =
            &config.initial_parent_beacon_block_root
        {
            RandomHashGenerator::with_value(*initial_parent_beacon_block_root)
        } else {
            RandomHashGenerator::with_seed("randomParentBeaconBlockRootSeed")
        };

        Ok(Self {
            runtime_handle,
            initial_config: config,
            blockchain,
            irregular_state,
            mem_pool: MemPool::new(block_gas_limit),
            beneficiary,
            dao_activation_block,
            min_gas_price,
            parent_beacon_block_root_generator,
            prev_randao_generator,
            block_time_offset_seconds,
            fork_metadata,
            rpc_client,
            instance_id: B256::random(),
            is_auto_mining,
            next_block_base_fee_per_gas,
            next_block_timestamp: None,
            // Start with 1 to mimic Ganache
            next_snapshot_id: 1,
            snapshots: BTreeMap::new(),
            allow_blocks_with_same_timestamp,
            allow_unlimited_contract_size,
            local_accounts,
            filters: HashMap::default(),
            last_filter_id: U256::ZERO,
            logger,
            impersonated_accounts: HashSet::new(),
            subscriber_callback,
            call_override,
            block_state_cache,
            current_state_id,
            block_number_to_state_id,
        })
    }

    pub fn set_call_override_callback(&mut self, call_override: Option<Arc<dyn SyncCallOverride>>) {
        self.call_override = call_override;
    }

    pub fn reset(&mut self, fork_config: Option<ForkConfig>) -> Result<(), CreationError> {
        let mut config = self.initial_config.clone();
        config.fork = fork_config;

        let mut reset_instance = Self::new(
            self.runtime_handle.clone(),
            self.logger.clone(),
            self.subscriber_callback.clone(),
            self.call_override.clone(),
            config,
        )?;

        std::mem::swap(self, &mut reset_instance);

        Ok(())
    }

    /// Retrieves the last pending nonce of the account corresponding to the
    /// provided address, if it exists.
    pub fn account_next_nonce(
        &mut self,
        address: &Address,
    ) -> Result<u64, ProviderError<LoggerErrorT>> {
        let state = self.current_state()?;
        mempool::account_next_nonce(&self.mem_pool, &*state, address).map_err(Into::into)
    }

    pub fn accounts(&self) -> impl Iterator<Item = &Address> {
        self.local_accounts.keys()
    }

    pub fn allow_unlimited_initcode_size(&self) -> bool {
        self.allow_unlimited_contract_size
    }

    /// Returns whether the miner is mining automatically.
    pub fn is_auto_mining(&self) -> bool {
        self.is_auto_mining
    }

    pub fn balance(
        &mut self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, ProviderError<LoggerErrorT>> {
        self.execute_in_block_context::<Result<U256, ProviderError<LoggerErrorT>>>(
            block_spec,
            move |_blockchain, _block, state| {
                Ok(state
                    .basic(address)?
                    .map_or(U256::ZERO, |account| account.balance))
            },
        )?
    }

    /// Retrieves the gas limit of the next block.
    pub fn block_gas_limit(&self) -> u64 {
        self.mem_pool.block_gas_limit()
    }

    /// Returns the default caller.
    pub fn default_caller(&self) -> Address {
        self.local_accounts
            .keys()
            .next()
            .copied()
            .unwrap_or(Address::ZERO)
    }

    /// Returns the metadata of the forked blockchain, if it exists.
    pub fn fork_metadata(&self) -> Option<&ForkMetadata> {
        self.fork_metadata.as_ref()
    }

    /// Returns the last block in the blockchain.
    pub fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = BlockchainError>>, BlockchainError> {
        self.blockchain.last_block()
    }

    /// Returns the number of the last block in the blockchain.
    pub fn last_block_number(&self) -> u64 {
        self.blockchain.last_block_number()
    }

    /// Adds a filter for new blocks to the provider.
    pub fn add_block_filter<const IS_SUBSCRIPTION: bool>(
        &mut self,
    ) -> Result<U256, ProviderError<LoggerErrorT>> {
        let block_hash = *self.last_block()?.hash();

        let filter_id = self.next_filter_id();
        self.filters.insert(
            filter_id,
            Filter::new_block_filter(block_hash, IS_SUBSCRIPTION),
        );

        Ok(filter_id)
    }

    /// Adds a filter for new logs to the provider.
    pub fn add_log_filter<const IS_SUBSCRIPTION: bool>(
        &mut self,
        criteria: LogFilter,
    ) -> Result<U256, ProviderError<LoggerErrorT>> {
        let logs = self
            .blockchain
            .logs(
                criteria.from_block,
                criteria
                    .to_block
                    .unwrap_or(self.blockchain.last_block_number()),
                &criteria.addresses,
                &criteria.normalized_topics,
            )?
            .iter()
            .map(LogOutput::from)
            .collect();

        let filter_id = self.next_filter_id();
        self.filters.insert(
            filter_id,
            Filter::new_log_filter(criteria, logs, IS_SUBSCRIPTION),
        );
        Ok(filter_id)
    }

    /// Adds a filter for new pending transactions to the provider.
    pub fn add_pending_transaction_filter<const IS_SUBSCRIPTION: bool>(&mut self) -> U256 {
        let filter_id = self.next_filter_id();
        self.filters.insert(
            filter_id,
            Filter::new_pending_transaction_filter(IS_SUBSCRIPTION),
        );
        filter_id
    }

    /// Whether the provider is configured to bail on call failures.
    pub fn bail_on_call_failure(&self) -> bool {
        self.initial_config.bail_on_call_failure
    }

    /// Whether the provider is configured to bail on transaction failures.
    pub fn bail_on_transaction_failure(&self) -> bool {
        self.initial_config.bail_on_transaction_failure
    }

    /// Fetch a block by block spec.
    /// Returns `None` if the block spec is `pending`.
    /// Returns `ProviderError::InvalidBlockSpec` error if the block spec is a
    /// number or a hash and the block isn't found.
    /// Returns `ProviderError::InvalidBlockTag` error if the block tag is safe
    /// or finalized and block spec is pre-merge.
    pub fn block_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, ProviderError<LoggerErrorT>>
    {
        let result = match block_spec {
            BlockSpec::Number(block_number) => Some(
                self.blockchain
                    .block_by_number(*block_number)?
                    .ok_or_else(|| ProviderError::InvalidBlockNumberOrHash {
                        block_spec: block_spec.clone(),
                        latest_block_number: self.blockchain.last_block_number(),
                    })?,
            ),
            BlockSpec::Tag(BlockTag::Earliest) => Some(
                self.blockchain
                    .block_by_number(0)?
                    .expect("genesis block should always exist"),
            ),
            // Matching Hardhat behaviour by returning the last block for finalized and safe.
            // https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1395
            BlockSpec::Tag(tag @ (BlockTag::Finalized | BlockTag::Safe)) => {
                if self.spec_id() >= SpecId::MERGE {
                    Some(self.blockchain.last_block()?)
                } else {
                    return Err(ProviderError::InvalidBlockTag {
                        block_tag: *tag,
                        spec: self.spec_id(),
                    });
                }
            }
            BlockSpec::Tag(BlockTag::Latest) => Some(self.blockchain.last_block()?),
            BlockSpec::Tag(BlockTag::Pending) => None,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash,
                require_canonical: _,
            }) => Some(self.blockchain.block_by_hash(block_hash)?.ok_or_else(|| {
                ProviderError::InvalidBlockNumberOrHash {
                    block_spec: block_spec.clone(),
                    latest_block_number: self.blockchain.last_block_number(),
                }
            })?),
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Some(
                self.blockchain
                    .block_by_number(*block_number)?
                    .ok_or_else(|| ProviderError::InvalidBlockNumberOrHash {
                        block_spec: block_spec.clone(),
                        latest_block_number: self.blockchain.last_block_number(),
                    })?,
            ),
        };

        Ok(result)
    }

    /// Retrieves the block number for the provided block spec, if it exists.
    fn block_number_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<Option<u64>, ProviderError<LoggerErrorT>> {
        let block_number = match block_spec {
            BlockSpec::Number(number) => Some(*number),
            BlockSpec::Tag(BlockTag::Earliest) => Some(0),
            BlockSpec::Tag(tag @ (BlockTag::Finalized | BlockTag::Safe)) => {
                if self.spec_id() >= SpecId::MERGE {
                    Some(self.blockchain.last_block_number())
                } else {
                    return Err(ProviderError::InvalidBlockTag {
                        block_tag: *tag,
                        spec: self.spec_id(),
                    });
                }
            }
            BlockSpec::Tag(BlockTag::Latest) => Some(self.blockchain.last_block_number()),
            BlockSpec::Tag(BlockTag::Pending) => None,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash { block_hash, .. }) => {
                self.blockchain.block_by_hash(block_hash)?.map_or_else(
                    || {
                        Err(ProviderError::InvalidBlockNumberOrHash {
                            block_spec: block_spec.clone(),
                            latest_block_number: self.blockchain.last_block_number(),
                        })
                    },
                    |block| Ok(Some(block.header().number)),
                )?
            }
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Some(*block_number),
        };

        Ok(block_number)
    }

    pub fn block_by_hash(
        &self,
        block_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, ProviderError<LoggerErrorT>>
    {
        self.blockchain
            .block_by_hash(block_hash)
            .map_err(ProviderError::Blockchain)
    }

    pub fn chain_id(&self) -> u64 {
        self.blockchain.chain_id()
    }

    pub fn coinbase(&self) -> Address {
        self.beneficiary
    }

    #[tracing::instrument(level = "trace", skip(self))]
    pub fn debug_trace_transaction(
        &mut self,
        transaction_hash: &B256,
        trace_config: DebugTraceConfig,
    ) -> Result<DebugTraceResult, ProviderError<LoggerErrorT>> {
        let block = self
            .blockchain
            .block_by_transaction_hash(transaction_hash)?
            .ok_or_else(|| ProviderError::InvalidTransactionHash(*transaction_hash))?;

        let header = block.header();
        let block_spec = Some(BlockSpec::Number(header.number));

        let cfg_env = self.create_evm_config(block_spec.as_ref())?;

        let transactions = block.transactions().to_vec();

        let prev_block_number = block.header().number - 1;
        let prev_block_spec = Some(BlockSpec::Number(prev_block_number));

        self.execute_in_block_context(
            prev_block_spec.as_ref(),
            |blockchain, _prev_block, state| {
                let block_env = BlockEnv {
                    number: U256::from(header.number),
                    coinbase: header.beneficiary,
                    timestamp: U256::from(header.timestamp),
                    gas_limit: U256::from(header.gas_limit),
                    basefee: header.base_fee_per_gas.unwrap_or_default(),
                    difficulty: U256::from(header.difficulty),
                    prevrandao: if cfg_env.spec_id >= SpecId::MERGE {
                        Some(header.mix_hash)
                    } else {
                        None
                    },
                    blob_excess_gas_and_price: header
                        .blob_gas
                        .as_ref()
                        .map(|BlobGas { excess_gas, .. }| BlobExcessGasAndPrice::new(*excess_gas)),
                };

                debug_trace_transaction(
                    blockchain,
                    state.clone(),
                    cfg_env,
                    trace_config,
                    block_env,
                    transactions,
                    transaction_hash,
                )
                .map_err(ProviderError::DebugTrace)
            },
        )?
    }

    pub fn debug_trace_call(
        &mut self,
        transaction: ExecutableTransaction,
        block_spec: Option<&BlockSpec>,
        trace_config: DebugTraceConfig,
    ) -> Result<DebugTraceResult, ProviderError<LoggerErrorT>> {
        let cfg_env = self.create_evm_config(block_spec)?;

        let tx_env: TxEnv = transaction.into();

        let mut tracer = TracerEip3155::new(trace_config);

        self.execute_in_block_context(block_spec, |blockchain, block, state| {
            let result = run_call(RunCallArgs {
                blockchain,
                header: block.header(),
                state,
                state_overrides: &StateOverrides::default(),
                cfg_env: cfg_env.clone(),
                tx_env: tx_env.clone(),
                inspector: Some(&mut tracer),
            })?;

            Ok(execution_result_to_debug_result(result, tracer))
        })?
    }

    /// Estimate the gas cost of a transaction. Matches Hardhat behavior.
    pub fn estimate_gas(
        &mut self,
        transaction: ExecutableTransaction,
        block_spec: &BlockSpec,
    ) -> Result<EstimateGasResult, ProviderError<LoggerErrorT>> {
        let cfg_env = self.create_evm_config(Some(block_spec))?;
        // Minimum gas cost that is required for transaction to be included in
        // a block
        let minimum_cost = transaction.initial_cost(self.spec_id());
        let tx_env: TxEnv = transaction.into();

        let state_overrides = StateOverrides::default();

        let mut inspector = DualInspector::new(
            TraceCollector::default(),
            EvmInspector::new(self.call_override.clone()),
        );

        self.execute_in_block_context(Some(block_spec), |blockchain, block, state| {
            let header = block.header();

            // Measure the gas used by the transaction with optional limit from call request
            // defaulting to block limit. Report errors from initial call as if from
            // `eth_call`.
            let result = call::run_call(RunCallArgs {
                blockchain,
                header,
                state,
                state_overrides: &state_overrides,
                cfg_env: cfg_env.clone(),
                tx_env: tx_env.clone(),
                inspector: Some(&mut inspector),
            })?;

            let (tracer, inspector) = inspector.into_parts();
            let trace = tracer.into_trace();

            let mut initial_estimation = match result {
                ExecutionResult::Success { gas_used, .. } => Ok(gas_used),
                ExecutionResult::Revert { output, .. } => {
                    Err(TransactionFailure::revert(output, None, trace.clone()))
                }
                ExecutionResult::Halt { reason, .. } => {
                    Err(TransactionFailure::halt(reason, None, trace.clone()))
                }
            }
            .map_err(|failure| EstimateGasFailure {
                console_log_inputs: inspector.into_console_log_encoded_messages(),
                transaction_failure: TransactionFailureWithTraces {
                    traces: vec![failure.solidity_trace.clone()],
                    failure,
                },
            })?;

            // Ensure that the initial estimation is at least the minimum cost + 1.
            if initial_estimation <= minimum_cost {
                initial_estimation = minimum_cost + 1;
            }

            let mut traces = vec![trace];

            // Test if the transaction would be successful with the initial estimation
            let CheckGasResult { success, trace } = gas::check_gas_limit(CheckGasLimitArgs {
                blockchain,
                header,
                state,
                state_overrides: &state_overrides,
                cfg_env: cfg_env.clone(),
                tx_env: tx_env.clone(),
                gas_limit: initial_estimation,
            })?;

            traces.push(trace);

            // Return the initial estimation if it was successful
            if success {
                return Ok(EstimateGasResult {
                    estimation: initial_estimation,
                    traces,
                });
            }

            // Correct the initial estimation if the transaction failed with the actually
            // used gas limit. This can happen if the execution logic is based
            // on the available gas.
            let BinarySearchEstimationResult {
                estimation,
                traces: mut estimation_traces,
            } = gas::binary_search_estimation(BinarySearchEstimationArgs {
                blockchain,
                header,
                state,
                state_overrides: &state_overrides,
                cfg_env: cfg_env.clone(),
                tx_env: tx_env.clone(),
                lower_bound: initial_estimation,
                upper_bound: header.gas_limit,
            })?;

            traces.append(&mut estimation_traces);

            Ok(EstimateGasResult { estimation, traces })
        })?
    }

    // Matches Hardhat implementation
    pub fn fee_history(
        &mut self,
        block_count: u64,
        newest_block_spec: &BlockSpec,
        percentiles: Option<Vec<RewardPercentile>>,
    ) -> Result<FeeHistoryResult, ProviderError<LoggerErrorT>> {
        if self.spec_id() < SpecId::LONDON {
            return Err(ProviderError::UnmetHardfork {
                actual: self.spec_id(),
                minimum: SpecId::LONDON,
            });
        }

        let latest_block_number = self.last_block_number();
        let pending_block_number = latest_block_number + 1;
        let newest_block_number = self
            .block_by_block_spec(newest_block_spec)?
            // None if pending block
            .map_or(pending_block_number, |block| block.header().number);
        let oldest_block_number = if newest_block_number < block_count {
            0
        } else {
            newest_block_number - block_count + 1
        };
        let last_block_number = newest_block_number + 1;

        let pending_block = if last_block_number >= pending_block_number {
            let DebugMineBlockResultAndState { block, .. } = self.mine_pending_block()?;
            Some(block)
        } else {
            None
        };

        let mut result = FeeHistoryResult::new(oldest_block_number);

        let mut reward_and_percentile = percentiles.and_then(|percentiles| {
            if percentiles.is_empty() {
                None
            } else {
                Some((Vec::default(), percentiles))
            }
        });

        let range_includes_remote_blocks = self.fork_metadata.as_ref().map_or(false, |metadata| {
            oldest_block_number <= metadata.fork_block_number
        });

        if range_includes_remote_blocks {
            let last_remote_block = cmp::min(
                self.fork_metadata
                    .as_ref()
                    .expect("we checked that there is a fork")
                    .fork_block_number,
                last_block_number,
            );
            let remote_block_count = last_remote_block - oldest_block_number + 1;

            let rpc_client = self
                .rpc_client
                .as_ref()
                .expect("we checked that there is a fork");
            let FeeHistoryResult {
                oldest_block: _,
                base_fee_per_gas,
                gas_used_ratio,
                reward: remote_reward,
            } = tokio::task::block_in_place(|| {
                self.runtime_handle.block_on(
                    rpc_client.fee_history(
                        remote_block_count,
                        newest_block_spec.clone(),
                        reward_and_percentile
                            .as_ref()
                            .map(|(_, percentiles)| percentiles.clone()),
                    ),
                )
            })?;

            result.base_fee_per_gas = base_fee_per_gas;
            result.gas_used_ratio = gas_used_ratio;
            if let Some((ref mut reward, _)) = reward_and_percentile.as_mut() {
                if let Some(remote_reward) = remote_reward {
                    *reward = remote_reward;
                }
            }
        }

        let first_local_block = if range_includes_remote_blocks {
            cmp::min(
                self.fork_metadata
                    .as_ref()
                    .expect("we checked that there is a fork")
                    .fork_block_number,
                last_block_number,
            ) + 1
        } else {
            oldest_block_number
        };

        for block_number in first_local_block..=last_block_number {
            if block_number < pending_block_number {
                let block = self
                    .blockchain
                    .block_by_number(block_number)?
                    .expect("Block must exist as i is at most the last block number");

                let header = block.header();
                result
                    .base_fee_per_gas
                    .push(header.base_fee_per_gas.unwrap_or(U256::ZERO));

                if block_number < last_block_number {
                    result
                        .gas_used_ratio
                        .push(gas_used_ratio(header.gas_used, header.gas_limit));

                    if let Some((ref mut reward, percentiles)) = reward_and_percentile.as_mut() {
                        reward.push(compute_rewards(&block, percentiles)?);
                    }
                }
            } else if block_number == pending_block_number {
                let next_block_base_fee_per_gas = self
                    .next_block_base_fee_per_gas()?
                    .expect("We checked that EIP-1559 is active");
                result.base_fee_per_gas.push(next_block_base_fee_per_gas);

                if block_number < last_block_number {
                    let block = pending_block.as_ref().expect("We mined the pending block");
                    let header = block.header();
                    result
                        .gas_used_ratio
                        .push(gas_used_ratio(header.gas_used, header.gas_limit));

                    if let Some((ref mut reward, percentiles)) = reward_and_percentile.as_mut() {
                        // We don't compute this for the pending block, as there's no
                        // effective miner fee yet.
                        reward.push(percentiles.iter().map(|_| U256::ZERO).collect());
                    }
                }
            } else if block_number == pending_block_number + 1 {
                let block = pending_block.as_ref().expect("We mined the pending block");
                result
                    .base_fee_per_gas
                    .push(calculate_next_base_fee(block.header()));
            }
        }

        if let Some((reward, _)) = reward_and_percentile {
            result.reward = Some(reward);
        }

        Ok(result)
    }

    pub fn gas_price(&self) -> Result<U256, ProviderError<LoggerErrorT>> {
        const PRE_EIP_1559_GAS_PRICE: u64 = 8_000_000_000;
        const SUGGESTED_PRIORITY_FEE_PER_GAS: u64 = 1_000_000_000;

        if let Some(next_block_gas_fee_per_gas) = self.next_block_base_fee_per_gas()? {
            Ok(next_block_gas_fee_per_gas + U256::from(SUGGESTED_PRIORITY_FEE_PER_GAS))
        } else {
            // We return a hardcoded value for networks without EIP-1559
            Ok(U256::from(PRE_EIP_1559_GAS_PRICE))
        }
    }

    pub fn get_code(
        &mut self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<Bytes, ProviderError<LoggerErrorT>> {
        self.execute_in_block_context(block_spec, move |_blockchain, _block, state| {
            let code = state
                .basic(address)?
                .map_or(Ok(Bytes::new()), |account_info| {
                    state.code_by_hash(account_info.code_hash).map(|bytecode| {
                        // The `Bytecode` REVM struct pad the bytecode with 33 bytes of 0s for the
                        // `Checked` and `Analysed` variants. `Bytecode::original_bytes` returns
                        // unpadded version.
                        bytecode.original_bytes()
                    })
                })?;

            Ok(code)
        })?
    }

    pub fn get_filter_changes(&mut self, filter_id: &U256) -> Option<FilteredEvents> {
        self.filters.get_mut(filter_id).map(Filter::take_events)
    }

    pub fn get_filter_logs(
        &mut self,
        filter_id: &U256,
    ) -> Result<Option<Vec<LogOutput>>, ProviderError<LoggerErrorT>> {
        self.filters
            .get_mut(filter_id)
            .map(|filter| {
                if let Some(events) = filter.take_log_events() {
                    Ok(events)
                } else {
                    Err(ProviderError::InvalidFilterSubscriptionType {
                        filter_id: *filter_id,
                        expected: SubscriptionType::Logs,
                        actual: filter.data.subscription_type(),
                    })
                }
            })
            .transpose()
    }

    pub fn get_storage_at(
        &mut self,
        address: Address,
        index: U256,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, ProviderError<LoggerErrorT>> {
        self.execute_in_block_context::<Result<U256, ProviderError<LoggerErrorT>>>(
            block_spec,
            move |_blockchain, _block, state| Ok(state.storage(address, index)?),
        )?
    }

    pub fn get_transaction_count(
        &mut self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, ProviderError<LoggerErrorT>> {
        self.execute_in_block_context::<Result<u64, ProviderError<LoggerErrorT>>>(
            block_spec,
            move |_blockchain, _block, state| {
                let nonce = state
                    .basic(address)?
                    .map_or(0, |account_info| account_info.nonce);

                Ok(nonce)
            },
        )?
    }

    pub fn impersonate_account(&mut self, address: Address) {
        self.impersonated_accounts.insert(address);
    }

    pub fn increase_block_time(&mut self, increment: u64) -> i64 {
        self.block_time_offset_seconds += i64::try_from(increment).expect("increment too large");
        self.block_time_offset_seconds
    }

    pub fn instance_id(&self) -> &B256 {
        &self.instance_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn interval_mine(&mut self) -> Result<bool, ProviderError<LoggerErrorT>> {
        let result = self.mine_and_commit_block(BlockOptions::default())?;

        self.logger
            .log_interval_mined(self.spec_id(), &result)
            .map_err(ProviderError::Logger)?;

        Ok(true)
    }

    pub fn logger_mut(
        &mut self,
    ) -> &mut dyn SyncLogger<BlockchainError = BlockchainError, LoggerError = LoggerErrorT> {
        &mut *self.logger
    }

    pub fn logs(&self, filter: LogFilter) -> Result<Vec<FilterLog>, ProviderError<LoggerErrorT>> {
        self.blockchain
            .logs(
                filter.from_block,
                filter
                    .to_block
                    .unwrap_or(self.blockchain.last_block_number()),
                &filter.addresses,
                &filter.normalized_topics,
            )
            .map_err(ProviderError::Blockchain)
    }

    pub fn make_snapshot(&mut self) -> u64 {
        let id = self.next_snapshot_id;
        self.next_snapshot_id += 1;

        let snapshot = Snapshot {
            block_number: self.blockchain.last_block_number(),
            block_number_to_state_id: self.block_number_to_state_id.clone(),
            block_time_offset_seconds: self.block_time_offset_seconds,
            coinbase: self.beneficiary,
            irregular_state: self.irregular_state.clone(),
            mem_pool: self.mem_pool.clone(),
            next_block_base_fee_per_gas: self.next_block_base_fee_per_gas,
            next_block_timestamp: self.next_block_timestamp,
            parent_beacon_block_root_generator: self.parent_beacon_block_root_generator.clone(),
            prev_randao_generator: self.prev_randao_generator.clone(),
            time: Instant::now(),
        };
        self.snapshots.insert(id, snapshot);

        id
    }

    pub fn mine_and_commit_block(
        &mut self,
        mut options: BlockOptions,
    ) -> Result<DebugMineBlockResult<BlockchainError>, ProviderError<LoggerErrorT>> {
        let (block_timestamp, new_offset) = self.next_block_timestamp(options.timestamp)?;
        options.timestamp = Some(block_timestamp);

        if options.mix_hash.is_none() && self.blockchain.spec_id() >= SpecId::MERGE {
            options.mix_hash = Some(self.prev_randao_generator.next_value());
        }

        let result = self.mine_block(options)?;

        let block_and_total_difficulty = self
            .blockchain
            .insert_block(result.block, result.state_diff)
            .map_err(ProviderError::Blockchain)?;

        self.mem_pool
            .update(&result.state)
            .map_err(ProviderError::MemPoolUpdate)?;

        if let Some(new_offset) = new_offset {
            self.block_time_offset_seconds = new_offset;
        }

        // Reset the next block base fee per gas upon successful execution
        self.next_block_base_fee_per_gas.take();

        // Reset next block time stamp
        self.next_block_timestamp.take();

        self.parent_beacon_block_root_generator.generate_next();
        self.prev_randao_generator.generate_next();

        let block = &block_and_total_difficulty.block;
        for (filter_id, filter) in self.filters.iter_mut() {
            match &mut filter.data {
                FilterData::Logs { criteria, logs } => {
                    let bloom = &block.header().logs_bloom;
                    if bloom_contains_log_filter(bloom, criteria) {
                        let receipts = block.transaction_receipts()?;
                        let new_logs = receipts.iter().flat_map(|receipt| receipt.logs());

                        let mut filtered_logs = filter_logs(new_logs, criteria);
                        if filter.is_subscription {
                            (self.subscriber_callback)(SubscriptionEvent {
                                filter_id: *filter_id,
                                result: SubscriptionEventData::Logs(filtered_logs.clone()),
                            });
                        } else {
                            logs.append(&mut filtered_logs);
                        }
                    }
                }
                FilterData::NewHeads(block_hashes) => {
                    if filter.is_subscription {
                        (self.subscriber_callback)(SubscriptionEvent {
                            filter_id: *filter_id,
                            result: SubscriptionEventData::NewHeads(
                                block_and_total_difficulty.clone(),
                            ),
                        });
                    } else {
                        block_hashes.push(*block.hash());
                    }
                }
                FilterData::NewPendingTransactions(_) => (),
            }
        }

        // Remove outdated filters
        self.filters.retain(|_, filter| !filter.has_expired());

        self.add_state_to_cache(result.state, block.header().number);

        Ok(DebugMineBlockResult {
            block: block_and_total_difficulty.block,
            transaction_results: result.transaction_results,
            transaction_traces: result.transaction_traces,
            console_log_inputs: result.console_log_inputs,
        })
    }

    /// Mines `number_of_blocks` blocks with the provided `interval` between
    /// them.
    pub fn mine_and_commit_blocks(
        &mut self,
        number_of_blocks: u64,
        interval: u64,
    ) -> Result<Vec<DebugMineBlockResult<BlockchainError>>, ProviderError<LoggerErrorT>> {
        // There should be at least 2 blocks left for the reservation to work,
        // because we always mine a block after it. But here we use a bigger
        // number to err on the side of safety.
        const MINIMUM_RESERVABLE_BLOCKS: u64 = 6;

        if number_of_blocks == 0 {
            return Ok(Vec::new());
        }

        let mine_block_with_interval =
            |data: &mut ProviderData<LoggerErrorT>,
             mined_blocks: &mut Vec<DebugMineBlockResult<BlockchainError>>|
             -> Result<(), ProviderError<LoggerErrorT>> {
                let previous_timestamp = mined_blocks
                    .last()
                    .expect("at least one block was mined")
                    .block
                    .header()
                    .timestamp;

                let options = BlockOptions {
                    timestamp: Some(previous_timestamp + interval),
                    ..BlockOptions::default()
                };

                let mined_block = data.mine_and_commit_block(options)?;
                mined_blocks.push(mined_block);

                Ok(())
            };

        // Limit the pre-allocated capacity based on the minimum reservable number of
        // blocks to avoid too large allocations.
        let mut mined_blocks = Vec::with_capacity(
            usize::try_from(number_of_blocks.min(2 * MINIMUM_RESERVABLE_BLOCKS))
                .expect("number of blocks exceeds {u64::MAX}"),
        );

        // we always mine the first block, and we don't apply the interval for it
        mined_blocks.push(self.mine_and_commit_block(BlockOptions::default())?);

        while u64::try_from(mined_blocks.len()).expect("usize cannot be larger than u128")
            < number_of_blocks
            && self.mem_pool.has_pending_transactions()
        {
            mine_block_with_interval(self, &mut mined_blocks)?;
        }

        // If there is at least one remaining block, we mine one. This way, we
        // guarantee that there's an empty block immediately before and after the
        // reservation. This makes the logging easier to get right.
        if u64::try_from(mined_blocks.len()).expect("usize cannot be larger than u128")
            < number_of_blocks
        {
            mine_block_with_interval(self, &mut mined_blocks)?;
        }

        let remaining_blocks = number_of_blocks
            - u64::try_from(mined_blocks.len()).expect("usize cannot be larger than u128");

        if remaining_blocks < MINIMUM_RESERVABLE_BLOCKS {
            for _ in 0..remaining_blocks {
                mine_block_with_interval(self, &mut mined_blocks)?;
            }
        } else {
            let current_state = (*self.current_state()?).clone();

            self.blockchain
                .reserve_blocks(remaining_blocks - 1, interval)?;

            // Ensure there is a cache entry for the last reserved block, to avoid
            // recomputation
            self.add_state_to_cache(current_state, self.last_block_number());

            let previous_timestamp = self.blockchain.last_block()?.header().timestamp;
            let options = BlockOptions {
                timestamp: Some(previous_timestamp + interval),
                ..BlockOptions::default()
            };

            let mined_block = self.mine_and_commit_block(options)?;
            mined_blocks.push(mined_block);
        }

        mined_blocks.shrink_to_fit();

        Ok(mined_blocks)
    }

    pub fn network_id(&self) -> String {
        self.initial_config.network_id.to_string()
    }

    /// Calculates the next block's base fee per gas.
    pub fn next_block_base_fee_per_gas(&self) -> Result<Option<U256>, BlockchainError> {
        if self.spec_id() < SpecId::LONDON {
            return Ok(None);
        }

        self.next_block_base_fee_per_gas
            .map_or_else(
                || {
                    let last_block = self.last_block()?;

                    let base_fee = calculate_next_base_fee(last_block.header());

                    Ok(base_fee)
                },
                Ok,
            )
            .map(Some)
    }

    /// Calculates the gas price for the next block.
    pub fn next_gas_price(&self) -> Result<U256, BlockchainError> {
        if let Some(next_block_base_fee_per_gas) = self.next_block_base_fee_per_gas()? {
            let suggested_priority_fee_per_gas = U256::from(1_000_000_000u64);
            Ok(next_block_base_fee_per_gas + suggested_priority_fee_per_gas)
        } else {
            // We return a hardcoded value for networks without EIP-1559
            Ok(U256::from(8_000_000_000u64))
        }
    }

    pub fn nonce(
        &mut self,
        address: &Address,
        block_spec: Option<&BlockSpec>,
        state_overrides: &StateOverrides,
    ) -> Result<u64, ProviderError<LoggerErrorT>> {
        state_overrides
            .account_override(address)
            .and_then(|account_override| account_override.nonce)
            .map_or_else(
                || {
                    if matches!(block_spec, Some(BlockSpec::Tag(BlockTag::Pending))) {
                        self.account_next_nonce(address)
                    } else {
                        self.execute_in_block_context(
                            block_spec,
                            move |_blockchain, _block, state| {
                                let nonce =
                                    state.basic(*address)?.map_or(0, |account| account.nonce);

                                Ok(nonce)
                            },
                        )?
                    }
                },
                Ok,
            )
    }

    pub fn pending_transactions(&self) -> impl Iterator<Item = &ExecutableTransaction> {
        self.mem_pool.transactions()
    }

    pub fn remove_filter(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ false>(filter_id)
    }

    pub fn remove_subscription(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ true>(filter_id)
    }

    /// Removes the transaction with the provided hash from the mem pool, if it
    /// exists.
    pub fn remove_pending_transaction(
        &mut self,
        transaction_hash: &B256,
    ) -> Option<OrderedTransaction> {
        self.mem_pool.remove_transaction(transaction_hash)
    }

    pub fn revert_to_snapshot(&mut self, snapshot_id: u64) -> bool {
        // Ensure that, if the snapshot exists, we also remove all subsequent snapshots,
        // as they can only be used once in Ganache.
        let mut removed_snapshots = self.snapshots.split_off(&snapshot_id);

        if let Some(snapshot) = removed_snapshots.remove(&snapshot_id) {
            let Snapshot {
                block_number,
                block_number_to_state_id,
                block_time_offset_seconds,
                coinbase,
                irregular_state,
                mem_pool,
                next_block_base_fee_per_gas,
                next_block_timestamp,
                parent_beacon_block_root_generator,
                prev_randao_generator,
                time,
            } = snapshot;

            self.block_number_to_state_id = block_number_to_state_id;

            // We compute a new offset such that:
            // now + new_offset == snapshot_date + old_offset
            let duration_since_snapshot = Instant::now().duration_since(time);
            self.block_time_offset_seconds = block_time_offset_seconds
                + i64::try_from(duration_since_snapshot.as_secs()).expect("duration too large");

            self.beneficiary = coinbase;
            self.blockchain
                .revert_to_block(block_number)
                .expect("Snapshotted block should exist");

            self.irregular_state = irregular_state;
            self.mem_pool = mem_pool;
            self.next_block_base_fee_per_gas = next_block_base_fee_per_gas;
            self.next_block_timestamp = next_block_timestamp;
            self.parent_beacon_block_root_generator = parent_beacon_block_root_generator;
            self.prev_randao_generator = prev_randao_generator;

            true
        } else {
            false
        }
    }

    pub fn run_call(
        &mut self,
        transaction: ExecutableTransaction,
        block_spec: Option<&BlockSpec>,
        state_overrides: &StateOverrides,
    ) -> Result<CallResult, ProviderError<LoggerErrorT>> {
        let cfg_env = self.create_evm_config(block_spec)?;
        let tx_env = transaction.into();

        let mut inspector = DualInspector::new(
            TraceCollector::default(),
            EvmInspector::new(self.call_override.clone()),
        );

        self.execute_in_block_context(block_spec, |blockchain, block, state| {
            let execution_result = call::run_call(RunCallArgs {
                blockchain,
                header: block.header(),
                state,
                state_overrides,
                cfg_env,
                tx_env,
                inspector: Some(&mut inspector),
            })?;

            let (tracer, inspector) = inspector.into_parts();

            Ok(CallResult {
                console_log_inputs: inspector.into_console_log_encoded_messages(),
                execution_result,
                trace: tracer.into_trace(),
            })
        })?
    }

    pub fn transaction_receipt(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, ProviderError<LoggerErrorT>> {
        self.blockchain
            .receipt_by_transaction_hash(transaction_hash)
            .map_err(ProviderError::Blockchain)
    }

    pub fn set_min_gas_price(
        &mut self,
        min_gas_price: U256,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        if self.spec_id() >= SpecId::LONDON {
            return Err(ProviderError::SetMinGasPriceUnsupported);
        }

        self.min_gas_price = min_gas_price;

        Ok(())
    }

    pub fn send_transaction(
        &mut self,
        signed_transaction: ExecutableTransaction,
    ) -> Result<SendTransactionResult, ProviderError<LoggerErrorT>> {
        let snapshot_id = if self.is_auto_mining {
            self.validate_auto_mine_transaction(&signed_transaction)?;

            Some(self.make_snapshot())
        } else {
            None
        };

        let transaction_hash =
            self.add_pending_transaction(signed_transaction)
                .map_err(|error| {
                    if let Some(snapshot_id) = snapshot_id {
                        self.revert_to_snapshot(snapshot_id);
                    }

                    error
                })?;

        let mut mining_results = Vec::new();
        let transaction_result = snapshot_id
            .map(
                |snapshot_id| -> Result<(ExecutionResult, Trace), ProviderError<LoggerErrorT>> {
                    let transaction_result = loop {
                        let result = self
                            .mine_and_commit_block(BlockOptions::default())
                            .map_err(|error| {
                                self.revert_to_snapshot(snapshot_id);

                                error
                            })?;

                        let transaction_result = izip!(
                            result.block.transactions().iter(),
                            result.transaction_results.iter(),
                            result.transaction_traces.iter()
                        )
                        .find_map(|(transaction, result, trace)| {
                            if *transaction.hash() == transaction_hash {
                                Some((result.clone(), trace.clone()))
                            } else {
                                None
                            }
                        });

                        mining_results.push(result);

                        if let Some(transaction_result) = transaction_result {
                            break transaction_result;
                        }
                    };

                    while self.mem_pool.has_pending_transactions() {
                        let result = self
                            .mine_and_commit_block(BlockOptions::default())
                            .map_err(|error| {
                                self.revert_to_snapshot(snapshot_id);

                                error
                            })?;

                        mining_results.push(result);
                    }

                    self.snapshots.remove(&snapshot_id);

                    Ok(transaction_result)
                },
            )
            .transpose()?;

        Ok(SendTransactionResult {
            transaction_hash,
            transaction_result,
            mining_results,
        })
    }

    /// Sets whether the miner should mine automatically.
    pub fn set_auto_mining(&mut self, enabled: bool) {
        self.is_auto_mining = enabled;
    }

    pub fn set_balance(
        &mut self,
        address: Address,
        balance: U256,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let mut modified_state = (*self.current_state()?).clone();
        let account_info = modified_state.modify_account(
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
        )?;

        let state_root = modified_state.state_root()?;

        self.mem_pool.update(&modified_state)?;

        let block_number = self.blockchain.last_block_number();
        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        self.add_state_to_cache(modified_state, block_number);

        Ok(())
    }

    /// Sets the gas limit used for mining new blocks.
    pub fn set_block_gas_limit(
        &mut self,
        gas_limit: u64,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let state = self.current_state()?;
        self.mem_pool
            .set_block_gas_limit(&*state, gas_limit)
            .map_err(ProviderError::State)
    }

    pub fn set_code(
        &mut self,
        address: Address,
        code: Bytes,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let code = Bytecode::new_raw(code.clone());
        let default_code = code.clone();
        let irregular_code = code.clone();

        // We clone to automatically revert in case of subsequent errors.
        let mut modified_state = (*self.current_state()?).clone();
        let mut account_info = modified_state.modify_account(
            address,
            AccountModifierFn::new(Box::new(move |_, _, account_code| {
                *account_code = Some(code.clone());
            })),
            &|| {
                Ok(AccountInfo {
                    balance: U256::ZERO,
                    nonce: 0,
                    code: Some(default_code.clone()),
                    code_hash: KECCAK_EMPTY,
                })
            },
        )?;

        // The code was stripped from the account, so we need to re-add it for the
        // irregular state.
        account_info.code = Some(irregular_code.clone());

        let state_root = modified_state.state_root()?;

        let block_number = self.blockchain.last_block_number();
        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        self.add_state_to_cache(modified_state, block_number);

        Ok(())
    }

    /// Sets the coinbase.
    pub fn set_coinbase(&mut self, coinbase: Address) {
        self.beneficiary = coinbase;
    }

    /// Sets the next block's base fee per gas.
    pub fn set_next_block_base_fee_per_gas(
        &mut self,
        base_fee_per_gas: U256,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let spec_id = self.spec_id();
        if spec_id < SpecId::LONDON {
            return Err(ProviderError::SetNextBlockBaseFeePerGasUnsupported { spec_id });
        }

        self.next_block_base_fee_per_gas = Some(base_fee_per_gas);

        Ok(())
    }

    /// Set the next block timestamp.
    pub fn set_next_block_timestamp(
        &mut self,
        timestamp: u64,
    ) -> Result<u64, ProviderError<LoggerErrorT>> {
        let latest_block = self.blockchain.last_block()?;
        let latest_block_header = latest_block.header();

        match timestamp.cmp(&latest_block_header.timestamp) {
            Ordering::Less => Err(ProviderError::TimestampLowerThanPrevious {
                proposed: timestamp,
                previous: latest_block_header.timestamp,
            }),
            Ordering::Equal if !self.allow_blocks_with_same_timestamp => {
                Err(ProviderError::TimestampEqualsPrevious {
                    proposed: timestamp,
                })
            }
            Ordering::Equal | Ordering::Greater => {
                self.next_block_timestamp = Some(timestamp);
                Ok(timestamp)
            }
        }
    }

    /// Sets the next block's prevrandao.
    pub fn set_next_prev_randao(
        &mut self,
        prev_randao: B256,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let spec_id = self.spec_id();
        if spec_id < SpecId::MERGE {
            return Err(ProviderError::SetNextPrevRandaoUnsupported { spec_id });
        }

        self.prev_randao_generator.set_next(prev_randao);

        Ok(())
    }

    pub fn set_nonce(
        &mut self,
        address: Address,
        nonce: u64,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        if mempool::has_transactions(&self.mem_pool) {
            return Err(ProviderError::SetAccountNonceWithPendingTransactions);
        }

        let previous_nonce = self
            .current_state()?
            .basic(address)?
            .map_or(0, |account| account.nonce);

        if nonce < previous_nonce {
            return Err(ProviderError::SetAccountNonceLowerThanCurrent {
                previous: previous_nonce,
                proposed: nonce,
            });
        }

        // We clone to automatically revert in case of subsequent errors.
        let mut modified_state = (*self.current_state()?).clone();
        let account_info = modified_state.modify_account(
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
        )?;

        let state_root = modified_state.state_root()?;

        self.mem_pool.update(&modified_state)?;

        let block_number = self.last_block_number();
        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        self.add_state_to_cache(modified_state, block_number);

        Ok(())
    }

    pub fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        // We clone to automatically revert in case of subsequent errors.
        let mut modified_state = (*self.current_state()?).clone();
        modified_state.set_account_storage_slot(address, index, value)?;

        let old_value = modified_state.set_account_storage_slot(address, index, value)?;

        let slot = StorageSlot::new_changed(old_value, value);
        let account_info = modified_state.basic(address).and_then(|mut account_info| {
            // Retrieve the code if it's not empty. This is needed for the irregular state.
            if let Some(account_info) = &mut account_info {
                if account_info.code_hash != KECCAK_EMPTY {
                    account_info.code = Some(modified_state.code_by_hash(account_info.code_hash)?);
                }
            }

            Ok(account_info)
        })?;

        let state_root = modified_state.state_root()?;

        let block_number = self.blockchain.last_block_number();
        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_storage_change(address, index, slot, account_info);

        self.add_state_to_cache(modified_state, block_number);

        Ok(())
    }

    pub fn sign(
        &self,
        address: &Address,
        message: Bytes,
    ) -> Result<Signature, ProviderError<LoggerErrorT>> {
        match self.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&message[..], secret_key)?),
            None => Err(ProviderError::UnknownAddress { address: *address }),
        }
    }

    pub fn sign_typed_data_v4(
        &self,
        address: &Address,
        message: &TypedData,
    ) -> Result<Signature, ProviderError<LoggerErrorT>> {
        match self.local_accounts.get(address) {
            Some(secret_key) => {
                let hash: B256 = message.encode_eip712()?.into();
                Ok(Signature::new(RecoveryMessage::Hash(hash), secret_key)?)
            }
            None => Err(ProviderError::UnknownAddress { address: *address }),
        }
    }

    pub fn spec_id(&self) -> SpecId {
        self.blockchain.spec_id()
    }

    pub fn stop_impersonating_account(&mut self, address: Address) -> bool {
        self.impersonated_accounts.remove(&address)
    }

    pub fn total_difficulty_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<U256>, ProviderError<LoggerErrorT>> {
        self.blockchain
            .total_difficulty_by_hash(hash)
            .map_err(ProviderError::Blockchain)
    }

    /// Get a transaction by hash from the blockchain or from the mempool if
    /// it's not mined yet.
    pub fn transaction_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<TransactionAndBlock>, ProviderError<LoggerErrorT>> {
        let transaction = if let Some(tx) = self.mem_pool.transaction_by_hash(hash) {
            Some(TransactionAndBlock {
                transaction: tx.pending().clone(),
                block_data: None,
                is_pending: true,
            })
        } else if let Some(block) = self.blockchain.block_by_transaction_hash(hash)? {
            let tx_index_u64 = self
                .blockchain
                .receipt_by_transaction_hash(hash)?
                .expect("If the transaction was inserted in a block, it must have a receipt")
                .transaction_index;
            let tx_index =
                usize::try_from(tx_index_u64).expect("Indices cannot be larger than usize::MAX");

            let transaction = block
                .transactions()
                .get(tx_index)
                .expect("Transaction index must be valid, since it's from the receipt.")
                .clone();

            Some(TransactionAndBlock {
                transaction,
                block_data: Some(BlockDataForTransaction {
                    block,
                    transaction_index: tx_index_u64,
                }),
                is_pending: false,
            })
        } else {
            None
        };

        Ok(transaction)
    }

    fn add_pending_transaction(
        &mut self,
        transaction: ExecutableTransaction,
    ) -> Result<B256, ProviderError<LoggerErrorT>> {
        let transaction_hash = *transaction.hash();

        let state = self.current_state()?;
        // Handles validation
        self.mem_pool.add_transaction(&*state, transaction)?;

        for (filter_id, filter) in self.filters.iter_mut() {
            if let FilterData::NewPendingTransactions(events) = &mut filter.data {
                if filter.is_subscription {
                    (self.subscriber_callback)(SubscriptionEvent {
                        filter_id: *filter_id,
                        result: SubscriptionEventData::NewPendingTransactions(transaction_hash),
                    });
                } else {
                    events.push(transaction_hash);
                }
            }
        }

        Ok(transaction_hash)
    }

    fn create_evm_config(
        &self,
        block_spec: Option<&BlockSpec>,
    ) -> Result<CfgEnv, ProviderError<LoggerErrorT>> {
        let block_number = block_spec
            .map(|block_spec| self.block_number_by_block_spec(block_spec))
            .transpose()?
            .flatten();

        let spec_id = if let Some(block_number) = block_number {
            self.blockchain.spec_at_block_number(block_number)?
        } else {
            self.blockchain.spec_id()
        };

        let mut evm_config = CfgEnv::default();
        evm_config.chain_id = self.blockchain.chain_id();
        evm_config.spec_id = spec_id;
        evm_config.limit_contract_code_size = if self.allow_unlimited_contract_size {
            Some(usize::MAX)
        } else {
            None
        };
        evm_config.disable_eip3607 = true;

        Ok(evm_config)
    }

    fn execute_in_block_context<T>(
        &mut self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(
            &dyn SyncBlockchain<BlockchainError, StateError>,
            &Arc<dyn SyncBlock<Error = BlockchainError>>,
            &Box<dyn SyncState<StateError>>,
        ) -> T,
    ) -> Result<T, ProviderError<LoggerErrorT>> {
        let block = if let Some(block_spec) = block_spec {
            self.block_by_block_spec(block_spec)?
        } else {
            Some(self.blockchain.last_block()?)
        };

        if let Some(block) = block {
            let block_header = block.header();
            let block_number = block_header.number;

            let contextual_state = self.get_or_compute_state(block_number)?;

            Ok(function(&*self.blockchain, &block, &contextual_state))
        } else {
            // Block spec is pending
            let result = self.mine_pending_block()?;

            let blockchain =
                BlockchainWithPending::new(&*self.blockchain, result.block, result.state_diff);

            let block = blockchain
                .last_block()
                .expect("The pending block is the last block");

            Ok(function(&blockchain, &block, &result.state))
        }
    }

    /// Mine a block using the provided options. If an option has not been
    /// specified, it will be set using the provider's configuration values.
    fn mine_block(
        &mut self,
        mut options: BlockOptions,
    ) -> Result<DebugMineBlockResultAndState<StateError>, ProviderError<LoggerErrorT>> {
        options.base_fee = options.base_fee.or(self.next_block_base_fee_per_gas);
        options.beneficiary = Some(options.beneficiary.unwrap_or(self.beneficiary));
        options.gas_limit = Some(
            options
                .gas_limit
                .unwrap_or_else(|| self.mem_pool.block_gas_limit()),
        );

        let evm_config = self.create_evm_config(None)?;

        if evm_config.spec_id >= SpecId::CANCUN {
            options.parent_beacon_block_root = options
                .parent_beacon_block_root
                .or_else(|| Some(self.parent_beacon_block_root_generator.next_value()));
        }

        let mut inspector = EvmInspector::new(self.call_override.clone());

        let state_to_be_modified = (*self.current_state()?).clone();

        let result = mine_block(
            &*self.blockchain,
            state_to_be_modified,
            &self.mem_pool,
            &evm_config,
            options,
            self.min_gas_price,
            self.initial_config.mining.mem_pool.order,
            miner_reward(evm_config.spec_id).unwrap_or(U256::ZERO),
            self.dao_activation_block,
            Some(&mut inspector),
        )?;

        Ok(DebugMineBlockResultAndState::new(
            result,
            inspector.into_console_log_encoded_messages(),
        ))
    }

    /// Mines a pending block, without modifying any values.
    pub fn mine_pending_block(
        &mut self,
    ) -> Result<DebugMineBlockResultAndState<StateError>, ProviderError<LoggerErrorT>> {
        let (block_timestamp, _new_offset) = self.next_block_timestamp(None)?;

        // Mining a pending block shouldn't affect the mix hash.
        self.mine_block(BlockOptions {
            timestamp: Some(block_timestamp),
            ..BlockOptions::default()
        })
    }

    pub fn mining_config(&self) -> &MiningConfig {
        &self.initial_config.mining
    }

    /// Get the timestamp for the next block.
    /// Ported from <https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/node.ts#L1942>
    fn next_block_timestamp(
        &self,
        timestamp: Option<u64>,
    ) -> Result<(u64, Option<i64>), ProviderError<LoggerErrorT>> {
        let latest_block = self.blockchain.last_block()?;
        let latest_block_header = latest_block.header();

        let current_timestamp =
            i64::try_from(SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs())
                .expect("timestamp too large");

        let (mut block_timestamp, mut new_offset) = if let Some(timestamp) = timestamp {
            timestamp.checked_sub(latest_block_header.timestamp).ok_or(
                ProviderError::TimestampLowerThanPrevious {
                    proposed: timestamp,
                    previous: latest_block_header.timestamp,
                },
            )?;

            let offset = i64::try_from(timestamp).expect("timestamp too large") - current_timestamp;
            (timestamp, Some(offset))
        } else if let Some(next_block_timestamp) = self.next_block_timestamp {
            let offset = i64::try_from(next_block_timestamp).expect("timestamp too large")
                - current_timestamp;

            (next_block_timestamp, Some(offset))
        } else {
            let next_timestamp = u64::try_from(current_timestamp + self.block_time_offset_seconds)
                .expect("timestamp must be positive");

            (next_timestamp, None)
        };

        let timestamp_needs_increase = block_timestamp == latest_block_header.timestamp
            && !self.allow_blocks_with_same_timestamp;
        if timestamp_needs_increase {
            block_timestamp += 1;
            if new_offset.is_none() {
                new_offset = Some(self.block_time_offset_seconds + 1);
            }
        }

        Ok((block_timestamp, new_offset))
    }

    fn next_filter_id(&mut self) -> U256 {
        self.last_filter_id = self
            .last_filter_id
            .checked_add(U256::from(1))
            .expect("filter id starts at zero, so it'll never overflow for U256");
        self.last_filter_id
    }

    fn remove_filter_impl<const IS_SUBSCRIPTION: bool>(&mut self, filter_id: &U256) -> bool {
        if let Some(filter) = self.filters.get(filter_id) {
            filter.is_subscription == IS_SUBSCRIPTION && self.filters.remove(filter_id).is_some()
        } else {
            false
        }
    }

    pub fn sign_transaction_request(
        &self,
        transaction_request: TransactionRequestAndSender,
    ) -> Result<ExecutableTransaction, ProviderError<LoggerErrorT>> {
        let TransactionRequestAndSender { request, sender } = transaction_request;

        if self.impersonated_accounts.contains(&sender) {
            let signed_transaction = request.fake_sign(&sender);

            Ok(ExecutableTransaction::with_caller(
                self.blockchain.spec_id(),
                signed_transaction,
                sender,
            )?)
        } else {
            let secret_key = self
                .local_accounts
                .get(&sender)
                .ok_or(ProviderError::UnknownAddress { address: sender })?;

            let signed_transaction = request.sign(secret_key)?;
            Ok(ExecutableTransaction::new(
                self.blockchain.spec_id(),
                signed_transaction,
            )?)
        }
    }

    fn validate_auto_mine_transaction(
        &mut self,
        transaction: &ExecutableTransaction,
    ) -> Result<(), ProviderError<LoggerErrorT>> {
        let next_nonce = { self.account_next_nonce(transaction.caller())? };

        match transaction.nonce().cmp(&next_nonce) {
            Ordering::Less => {
                return Err(ProviderError::AutoMineNonceTooLow {
                    expected: next_nonce,
                    actual: transaction.nonce(),
                })
            }
            Ordering::Equal => (),
            Ordering::Greater => {
                return Err(ProviderError::AutoMineNonceTooHigh {
                    expected: next_nonce,
                    actual: transaction.nonce(),
                })
            }
        }

        // Question: Why do we use the max priority fee per gas as gas price?
        let max_priority_fee_per_gas = transaction
            .max_priority_fee_per_gas()
            .unwrap_or_else(|| transaction.gas_price());

        if max_priority_fee_per_gas < self.min_gas_price {
            return Err(ProviderError::AutoMinePriorityFeeTooLow {
                expected: self.min_gas_price,
                actual: max_priority_fee_per_gas,
            });
        }

        if let Some(next_block_base_fee) = self.next_block_base_fee_per_gas()? {
            if let Some(max_fee_per_gas) = transaction.max_fee_per_gas() {
                if max_fee_per_gas < next_block_base_fee {
                    return Err(ProviderError::AutoMineMaxFeeTooLow {
                        expected: next_block_base_fee,
                        actual: max_fee_per_gas,
                    });
                }
            } else {
                let gas_price = transaction.gas_price();
                if gas_price < next_block_base_fee {
                    return Err(ProviderError::AutoMineGasPriceTooLow {
                        expected: next_block_base_fee,
                        actual: gas_price,
                    });
                }
            }
        }

        Ok(())
    }

    fn current_state(
        &mut self,
    ) -> Result<Arc<Box<dyn SyncState<StateError>>>, ProviderError<LoggerErrorT>> {
        self.get_or_compute_state(self.last_block_number())
    }

    fn get_or_compute_state(
        &mut self,
        block_number: u64,
    ) -> Result<Arc<Box<dyn SyncState<StateError>>>, ProviderError<LoggerErrorT>> {
        if let Some(state_id) = self.block_number_to_state_id.get(&block_number) {
            // We cannot use `LruCache::try_get_or_insert`, because it needs &mut self, but
            // we would need &self in the callback to reference the blockchain.
            if let Some(state) = self.block_state_cache.get(state_id) {
                return Ok(state.clone());
            }
        };

        let state = self
            .blockchain
            .state_at_block_number(block_number, self.irregular_state.state_overrides())?;
        let state_id = self.add_state_to_cache(state, block_number);
        Ok(self
            .block_state_cache
            .get(&state_id)
            // State must exist, since we just inserted it, and we have exclusive access to
            // the cache due to &mut self.
            .expect("State must exist")
            .clone())
    }

    fn add_state_to_cache(
        &mut self,
        state: Box<dyn SyncState<StateError>>,
        block_number: u64,
    ) -> StateId {
        let state_id = self.current_state_id.increment();
        self.block_state_cache.push(state_id, Arc::new(state));
        self.block_number_to_state_id.insert(block_number, state_id);
        state_id
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, Hash, PartialEq)]
#[repr(transparent)]
pub(crate) struct StateId(u64);

impl StateId {
    /// Increment the current state id and return the incremented id.
    fn increment(&mut self) -> Self {
        self.0 += 1;
        *self
    }
}

fn block_time_offset_seconds(config: &ProviderConfig) -> Result<i64, CreationError> {
    config.initial_date.map_or(Ok(0), |initial_date| {
        let initial_timestamp = i64::try_from(
            initial_date
                .duration_since(UNIX_EPOCH)
                .map_err(|_e| CreationError::InvalidInitialDate(initial_date))?
                .as_secs(),
        )
        .expect("initial date must be representable as i64");

        let current_timestamp = i64::try_from(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("current time must be after UNIX epoch")
                .as_secs(),
        )
        .expect("Current timestamp must be representable as i64");

        Ok(initial_timestamp - current_timestamp)
    })
}

struct BlockchainAndState {
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    fork_metadata: Option<ForkMetadata>,
    rpc_client: Option<RpcClient>,
    state: Box<dyn SyncState<StateError>>,
    irregular_state: IrregularState,
    prev_randao_generator: RandomHashGenerator,
    block_time_offset_seconds: i64,
    next_block_base_fee_per_gas: Option<U256>,
}

fn create_blockchain_and_state(
    runtime: runtime::Handle,
    config: &ProviderConfig,
    mut genesis_accounts: HashMap<Address, Account>,
) -> Result<BlockchainAndState, CreationError> {
    let mut prev_randao_generator = RandomHashGenerator::with_seed(edr_defaults::MIX_HASH_SEED);

    if let Some(fork_config) = &config.fork {
        let state_root_generator = Arc::new(parking_lot::Mutex::new(
            RandomHashGenerator::with_seed(edr_defaults::STATE_ROOT_HASH_SEED),
        ));

        let http_headers = fork_config
            .http_headers
            .as_ref()
            .map(|headers| HeaderMap::try_from(headers).map_err(CreationError::InvalidHttpHeaders))
            .transpose()?;

        let (blockchain, mut irregular_state) =
            tokio::task::block_in_place(|| -> Result<_, ForkedCreationError> {
                let mut irregular_state = IrregularState::default();
                let blockchain = runtime.block_on(ForkedBlockchain::new(
                    runtime.clone(),
                    Some(config.chain_id),
                    config.hardfork,
                    RpcClient::new(
                        &fork_config.json_rpc_url,
                        config.cache_dir.clone(),
                        http_headers.clone(),
                    )
                    .expect("url ok"),
                    fork_config.block_number,
                    &mut irregular_state,
                    state_root_generator.clone(),
                    &config.chains,
                ))?;

                Ok((blockchain, irregular_state))
            })?;

        let fork_block_number = blockchain.last_block_number();

        let rpc_client = RpcClient::new(
            &fork_config.json_rpc_url,
            config.cache_dir.clone(),
            http_headers,
        )
        .expect("url ok");

        if !genesis_accounts.is_empty() {
            let genesis_addresses = genesis_accounts.keys().cloned().collect::<Vec<_>>();
            let genesis_account_infos = tokio::task::block_in_place(|| {
                runtime.block_on(rpc_client.get_account_infos(
                    &genesis_addresses,
                    Some(BlockSpec::Number(fork_block_number)),
                ))
            })?;

            // Make sure that the nonce and the code of genesis accounts matches the fork
            // state as we only want to overwrite the balance.
            for (address, account_info) in genesis_addresses.into_iter().zip(genesis_account_infos)
            {
                genesis_accounts.entry(address).and_modify(|account| {
                    let AccountInfo {
                        balance: _,
                        nonce,
                        code,
                        code_hash,
                    } = &mut account.info;

                    *nonce = account_info.nonce;
                    *code = account_info.code;
                    *code_hash = account_info.code_hash;
                });
            }

            irregular_state
                .state_override_at_block_number(fork_block_number)
                .and_modify(|state_override| {
                    // No need to update the state_root, as it could only have been created by the
                    // `ForkedBlockchain` constructor.
                    state_override.diff.apply_diff(genesis_accounts.clone());
                })
                .or_insert_with(|| {
                    let state_root = state_root_generator.lock().next_value();

                    StateOverride {
                        diff: StateDiff::from(genesis_accounts),
                        state_root,
                    }
                });
        }

        let state = blockchain
            .state_at_block_number(fork_block_number, irregular_state.state_overrides())
            .expect("Fork state must exist");

        let block_time_offset_seconds = {
            let fork_block_timestamp = UNIX_EPOCH
                + Duration::from_secs(
                    blockchain
                        .last_block()
                        .map_err(CreationError::Blockchain)?
                        .header()
                        .timestamp,
                );

            let elapsed_time = SystemTime::now()
                .duration_since(fork_block_timestamp)
                .expect("current time must be after fork block")
                .as_secs();

            -i64::try_from(elapsed_time)
                .expect("Elapsed time since fork block must be representable as i64")
        };

        let next_block_base_fee_per_gas = if config.hardfork >= SpecId::LONDON {
            if let Some(base_fee) = config.initial_base_fee_per_gas {
                Some(base_fee)
            } else {
                let previous_base_fee = blockchain
                    .last_block()
                    .map_err(CreationError::Blockchain)?
                    .header()
                    .base_fee_per_gas;

                if previous_base_fee.is_none() {
                    Some(U256::from(DEFAULT_INITIAL_BASE_FEE_PER_GAS))
                } else {
                    None
                }
            }
        } else {
            None
        };

        Ok(BlockchainAndState {
            fork_metadata: Some(ForkMetadata {
                chain_id: blockchain.chain_id(),
                fork_block_number,
                fork_block_hash: *blockchain
                    .block_by_number(fork_block_number)
                    .map_err(CreationError::Blockchain)?
                    .expect("Fork block must exist")
                    .hash(),
            }),
            rpc_client: Some(rpc_client),
            blockchain: Box::new(blockchain),
            state: Box::new(state),
            irregular_state,
            prev_randao_generator,
            block_time_offset_seconds,
            next_block_base_fee_per_gas,
        })
    } else {
        let mix_hash = if config.hardfork >= SpecId::MERGE {
            Some(prev_randao_generator.generate_next())
        } else {
            None
        };

        let blockchain = LocalBlockchain::new(
            StateDiff::from(genesis_accounts),
            config.chain_id,
            config.hardfork,
            GenesisBlockOptions {
                gas_limit: Some(config.block_gas_limit),
                timestamp: config.initial_date.map(|d| {
                    d.duration_since(UNIX_EPOCH)
                        .expect("initial date must be after UNIX epoch")
                        .as_secs()
                }),
                mix_hash,
                base_fee: config.initial_base_fee_per_gas,
                blob_gas: config.initial_blob_gas.clone(),
            },
        )?;

        let irregular_state = IrregularState::default();
        let state = blockchain
            .state_at_block_number(0, irregular_state.state_overrides())
            .expect("Genesis state must exist");

        let block_time_offset_seconds = block_time_offset_seconds(config)?;

        Ok(BlockchainAndState {
            fork_metadata: None,
            rpc_client: None,
            blockchain: Box::new(blockchain),
            state,
            irregular_state,
            block_time_offset_seconds,
            prev_randao_generator,
            // For local blockchain the initial base fee per gas config option is incorporated as
            // part of the genesis block.
            next_block_base_fee_per_gas: None,
        })
    }
}

/// The result returned by requesting a transaction.
#[derive(Debug, Clone)]
pub struct TransactionAndBlock {
    /// The transaction.
    pub transaction: ExecutableTransaction,
    /// Block data in which the transaction is found if it has been mined.
    pub block_data: Option<BlockDataForTransaction>,
    /// Whether the transaction is pending
    pub is_pending: bool,
}

/// Block metadata for a transaction.
#[derive(Debug, Clone)]
pub struct BlockDataForTransaction {
    pub block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    pub transaction_index: u64,
}

lazy_static! {
    static ref CONSOLE_ADDRESS: Address = "0x000000000000000000636F6e736F6c652e6c6f67"
        .parse()
        .expect("static ok");
}

#[cfg(test)]
pub(crate) mod test_utils {
    use std::convert::Infallible;

    use anyhow::anyhow;
    use edr_eth::transaction::{Eip155TransactionRequest, TransactionKind, TransactionRequest};
    use edr_test_utils::env::get_alchemy_url;

    use super::*;
    use crate::{
        test_utils::{create_test_config_with_fork, one_ether, FORK_BLOCK_NUMBER},
        NoopLogger, ProviderConfig,
    };

    pub(crate) struct ProviderTestFixture {
        _runtime: runtime::Runtime,
        pub config: ProviderConfig,
        pub provider_data: ProviderData<Infallible>,
        pub impersonated_account: Address,
    }

    impl ProviderTestFixture {
        pub(crate) fn new_local() -> anyhow::Result<Self> {
            Self::with_fork(None)
        }

        pub(crate) fn new_forked(url: Option<String>) -> anyhow::Result<Self> {
            let fork_url = url.unwrap_or(get_alchemy_url());
            Self::with_fork(Some(fork_url))
        }

        fn with_fork(fork: Option<String>) -> anyhow::Result<Self> {
            let fork = fork.map(|json_rpc_url| {
                ForkConfig {
                    json_rpc_url,
                    // Random recent block for better cache consistency
                    block_number: Some(FORK_BLOCK_NUMBER),
                    http_headers: None,
                }
            });

            let config = create_test_config_with_fork(fork);

            let runtime = runtime::Builder::new_multi_thread()
                .worker_threads(1)
                .enable_all()
                .thread_name("provider-data-test")
                .build()?;

            Self::new(runtime, config)
        }

        pub fn new(
            runtime: tokio::runtime::Runtime,
            mut config: ProviderConfig,
        ) -> anyhow::Result<Self> {
            let logger = Box::<NoopLogger>::default();
            let subscription_callback_noop = Box::new(|_| ());

            let impersonated_account = Address::random();
            config.genesis_accounts.insert(
                impersonated_account,
                AccountInfo {
                    balance: one_ether(),
                    nonce: 0,
                    code: None,
                    code_hash: KECCAK_EMPTY,
                },
            );

            let mut provider_data = ProviderData::new(
                runtime.handle().clone(),
                logger,
                subscription_callback_noop,
                None,
                config.clone(),
            )?;

            provider_data.impersonate_account(impersonated_account);

            Ok(Self {
                _runtime: runtime,
                config,
                provider_data,
                impersonated_account,
            })
        }

        pub fn dummy_transaction_request(
            &self,
            local_account_index: usize,
            gas_limit: u64,
            nonce: Option<u64>,
        ) -> anyhow::Result<TransactionRequestAndSender> {
            let request = TransactionRequest::Eip155(Eip155TransactionRequest {
                kind: TransactionKind::Call(Address::ZERO),
                gas_limit,
                gas_price: U256::from(42_000_000_000_u64),
                value: U256::from(1),
                input: Bytes::default(),
                nonce: nonce.unwrap_or(0),
                chain_id: self.config.chain_id,
            });

            let sender = self.nth_local_account(local_account_index)?;
            Ok(TransactionRequestAndSender { request, sender })
        }

        /// Retrieves the nth local account.
        ///
        /// # Panics
        ///
        /// Panics if there are not enough local accounts
        pub fn nth_local_account(&self, index: usize) -> anyhow::Result<Address> {
            self.provider_data
                .local_accounts
                .keys()
                .nth(index)
                .copied()
                .ok_or(anyhow!("the requested local account does not exist"))
        }

        pub fn impersonated_dummy_transaction(&self) -> anyhow::Result<ExecutableTransaction> {
            let mut transaction = self.dummy_transaction_request(0, 30_000, None)?;
            transaction.sender = self.impersonated_account;

            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }

        pub fn signed_dummy_transaction(
            &self,
            local_account_index: usize,
            nonce: Option<u64>,
        ) -> anyhow::Result<ExecutableTransaction> {
            let transaction = self.dummy_transaction_request(local_account_index, 30_000, nonce)?;
            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::convert::Infallible;

    use alloy_sol_types::{sol, SolCall};
    use anyhow::Context;
    use edr_eth::remote::eth::CallRequest;
    use edr_evm::{hex, MineOrdering, TransactionError};
    use edr_test_utils::env::get_alchemy_url;
    use serde_json::json;

    use super::{test_utils::ProviderTestFixture, *};
    use crate::{
        data::inspector::tests::{deploy_console_log_contract, ConsoleLogTransaction},
        requests::eth::resolve_call_request,
        test_utils::{
            create_test_config, create_test_config_with_fork, one_ether, FORK_BLOCK_NUMBER,
        },
        MemPoolConfig, MiningConfig, ProviderConfig,
    };

    #[test]
    fn test_local_account_balance() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let account = *fixture
            .provider_data
            .local_accounts
            .keys()
            .next()
            .expect("there are local accounts");

        let last_block_number = fixture.provider_data.last_block_number();
        let block_spec = BlockSpec::Number(last_block_number);

        let balance = fixture.provider_data.balance(account, Some(&block_spec))?;

        assert_eq!(balance, one_ether());

        Ok(())
    }

    #[test]
    fn test_local_account_balance_forked() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_forked(None)?;

        let account = *fixture
            .provider_data
            .local_accounts
            .keys()
            .next()
            .expect("there are local accounts");

        let last_block_number = fixture.provider_data.last_block_number();
        let block_spec = BlockSpec::Number(last_block_number);

        let balance = fixture.provider_data.balance(account, Some(&block_spec))?;

        assert_eq!(balance, one_ether());

        Ok(())
    }

    #[test]
    fn test_sign_transaction_request() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let transaction = fixture.signed_dummy_transaction(0, None)?;
        let recovered_address = transaction.recover()?;

        assert!(fixture
            .provider_data
            .local_accounts
            .contains_key(&recovered_address));

        Ok(())
    }

    #[test]
    fn test_sign_transaction_request_impersonated_account() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let transaction = fixture.impersonated_dummy_transaction()?;

        assert_eq!(transaction.caller(), &fixture.impersonated_account);

        Ok(())
    }

    fn test_add_pending_transaction(
        fixture: &mut ProviderTestFixture,
        transaction: ExecutableTransaction,
    ) -> anyhow::Result<()> {
        let filter_id = fixture
            .provider_data
            .add_pending_transaction_filter::<false>();

        let transaction_hash = fixture.provider_data.add_pending_transaction(transaction)?;

        assert!(fixture
            .provider_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_some());

        match fixture
            .provider_data
            .get_filter_changes(&filter_id)
            .unwrap()
        {
            FilteredEvents::NewPendingTransactions(hashes) => {
                assert!(hashes.contains(&transaction_hash));
            }
            _ => panic!("expected pending transaction"),
        };

        assert!(fixture.provider_data.mem_pool.has_pending_transactions());

        Ok(())
    }

    #[test]
    fn add_pending_transaction() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;
        let transaction = fixture.signed_dummy_transaction(0, None)?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[test]
    fn add_pending_transaction_from_impersonated_account() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;
        let transaction = fixture.impersonated_dummy_transaction()?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[test]
    fn block_by_block_spec_earliest() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let block_spec = BlockSpec::Tag(BlockTag::Earliest);

        let block = fixture
            .provider_data
            .block_by_block_spec(&block_spec)?
            .context("block should exist")?;

        assert_eq!(block.header().number, 0);

        Ok(())
    }

    #[test]
    fn block_by_block_spec_finalized_safe_latest() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        // Mine a block to make sure we're not getting the genesis block
        fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;
        let last_block_number = fixture.provider_data.last_block_number();
        // Sanity check
        assert!(last_block_number > 0);

        let block_tags = vec![BlockTag::Finalized, BlockTag::Safe, BlockTag::Latest];
        for tag in block_tags {
            let block_spec = BlockSpec::Tag(tag);

            let block = fixture
                .provider_data
                .block_by_block_spec(&block_spec)?
                .context("block should exist")?;

            assert_eq!(block.header().number, last_block_number);
        }

        Ok(())
    }

    #[test]
    fn block_by_block_spec_pending() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let block_spec = BlockSpec::Tag(BlockTag::Pending);

        let block = fixture.provider_data.block_by_block_spec(&block_spec)?;

        assert!(block.is_none());

        Ok(())
    }

    // Make sure executing a transaction in a pending block context doesn't panic.
    #[test]
    fn execute_in_block_context_pending() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let block_spec = Some(BlockSpec::Tag(BlockTag::Pending));

        let mut value = 0;
        let _ =
            fixture
                .provider_data
                .execute_in_block_context(block_spec.as_ref(), |_, _, _| {
                    value += 1;
                    Ok::<(), ProviderError<Infallible>>(())
                })?;

        assert_eq!(value, 1);

        Ok(())
    }

    #[test]
    fn chain_id() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let chain_id = fixture.provider_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[test]
    fn chain_id_fork_mode() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_forked(None)?;

        let chain_id = fixture.provider_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[test]
    fn console_log_mine_block() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;
        let ConsoleLogTransaction {
            transaction,
            expected_call_data,
        } = deploy_console_log_contract(&mut fixture.provider_data)?;

        let signed_transaction = fixture
            .provider_data
            .sign_transaction_request(transaction)?;

        fixture.provider_data.set_auto_mining(false);
        fixture.provider_data.send_transaction(signed_transaction)?;
        let (block_timestamp, _) = fixture.provider_data.next_block_timestamp(None)?;
        let prevrandao = fixture.provider_data.prev_randao_generator.next_value();
        let result = fixture.provider_data.mine_block(BlockOptions {
            timestamp: Some(block_timestamp),
            mix_hash: Some(prevrandao),
            ..BlockOptions::default()
        })?;

        let console_log_inputs = result.console_log_inputs;
        assert_eq!(console_log_inputs.len(), 1);
        assert_eq!(console_log_inputs[0], expected_call_data);

        Ok(())
    }

    #[test]
    fn console_log_run_call() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;
        let ConsoleLogTransaction {
            transaction,
            expected_call_data,
        } = deploy_console_log_contract(&mut fixture.provider_data)?;

        let pending_transaction = fixture
            .provider_data
            .sign_transaction_request(transaction)?;

        let result = fixture.provider_data.run_call(
            pending_transaction,
            None,
            &StateOverrides::default(),
        )?;

        let console_log_inputs = result.console_log_inputs;
        assert_eq!(console_log_inputs.len(), 1);
        assert_eq!(console_log_inputs[0], expected_call_data);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_empty() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let previous_block_number = fixture.provider_data.last_block_number();

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;
        assert!(result.block.transactions().is_empty());

        let current_block_number = fixture.provider_data.last_block_number();
        assert_eq!(current_block_number, previous_block_number + 1);

        let cached_state = fixture
            .provider_data
            .get_or_compute_state(result.block.header().number)?;

        let calculated_state = fixture.provider_data.blockchain.state_at_block_number(
            fixture.provider_data.last_block_number(),
            fixture.provider_data.irregular_state.state_overrides(),
        )?;

        assert_eq!(cached_state.state_root()?, calculated_state.state_root()?);

        Ok(())
    }

    #[test]
    fn mine_and_commit_blocks_empty() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        fixture
            .provider_data
            .mine_and_commit_blocks(1_000_000_000, 1)?;

        let cached_state = fixture
            .provider_data
            .get_or_compute_state(fixture.provider_data.last_block_number())?;

        let calculated_state = fixture.provider_data.blockchain.state_at_block_number(
            fixture.provider_data.last_block_number(),
            fixture.provider_data.irregular_state.state_overrides(),
        )?;

        assert_eq!(cached_state.state_root()?, calculated_state.state_root()?);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_single_transaction() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction = fixture.signed_dummy_transaction(0, None)?;
        let expected = transaction.value();
        let receiver = transaction
            .to()
            .expect("Dummy transaction should have a receiver");

        fixture.provider_data.add_pending_transaction(transaction)?;

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        assert_eq!(result.block.transactions().len(), 1);

        let balance = fixture
            .provider_data
            .balance(receiver, Some(&BlockSpec::latest()))?;

        assert_eq!(balance, expected);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_two_transactions_different_senders() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction1 = fixture.signed_dummy_transaction(0, None)?;
        let transaction2 = fixture.signed_dummy_transaction(1, None)?;

        let receiver = transaction1
            .to()
            .expect("Dummy transaction should have a receiver");

        let expected = transaction1.value() + transaction2.value();

        fixture
            .provider_data
            .add_pending_transaction(transaction1)?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2)?;

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        assert_eq!(result.block.transactions().len(), 2);

        let balance = fixture
            .provider_data
            .balance(receiver, Some(&BlockSpec::latest()))?;

        assert_eq!(balance, expected);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_two_transactions_same_sender() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction1 = fixture.signed_dummy_transaction(0, Some(0))?;
        let transaction2 = fixture.signed_dummy_transaction(0, Some(1))?;

        let receiver = transaction1
            .to()
            .expect("Dummy transaction should have a receiver");

        let expected = transaction1.value() + transaction2.value();

        fixture
            .provider_data
            .add_pending_transaction(transaction1)?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2)?;

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        assert_eq!(result.block.transactions().len(), 2);

        let balance = fixture
            .provider_data
            .balance(receiver, Some(&BlockSpec::latest()))?;

        assert_eq!(balance, expected);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_removes_mined_transactions() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction = fixture.signed_dummy_transaction(0, None)?;

        fixture
            .provider_data
            .add_pending_transaction(transaction.clone())?;

        let num_pending_transactions = fixture.provider_data.pending_transactions().count();
        assert_eq!(num_pending_transactions, 1);

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        assert_eq!(result.block.transactions().len(), 1);

        let num_pending_transactions = fixture.provider_data.pending_transactions().count();
        assert_eq!(num_pending_transactions, 0);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_leaves_unmined_transactions() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;
        fixture.provider_data.set_block_gas_limit(55_000)?;

        // Actual gas usage is 21_000
        let transaction1 = fixture.signed_dummy_transaction(0, Some(0))?;
        let transaction3 = fixture.signed_dummy_transaction(0, Some(1))?;

        // Too expensive to mine
        let transaction2 = {
            let request = fixture.dummy_transaction_request(1, 40_000, None)?;
            fixture.provider_data.sign_transaction_request(request)?
        };

        fixture
            .provider_data
            .add_pending_transaction(transaction1.clone())?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2.clone())?;
        fixture
            .provider_data
            .add_pending_transaction(transaction3.clone())?;

        let pending_transactions = fixture
            .provider_data
            .pending_transactions()
            .cloned()
            .collect::<Vec<_>>();

        assert!(pending_transactions.contains(&transaction1));
        assert!(pending_transactions.contains(&transaction2));
        assert!(pending_transactions.contains(&transaction3));

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        // Check that only the first and third transactions were mined
        assert_eq!(result.block.transactions().len(), 2);
        assert!(fixture
            .provider_data
            .transaction_receipt(transaction1.hash())?
            .is_some());
        assert!(fixture
            .provider_data
            .transaction_receipt(transaction3.hash())?
            .is_some());

        // Check that the second transaction is still pending
        let pending_transactions = fixture
            .provider_data
            .pending_transactions()
            .cloned()
            .collect::<Vec<_>>();

        assert_eq!(pending_transactions, vec![transaction2]);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_fifo_ordering() -> anyhow::Result<()> {
        let default_config = create_test_config();
        let config = ProviderConfig {
            mining: MiningConfig {
                mem_pool: MemPoolConfig {
                    order: MineOrdering::Fifo,
                },
                ..default_config.mining
            },
            ..default_config
        };

        let runtime = runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .thread_name("provider-data-test")
            .build()?;

        let mut fixture = ProviderTestFixture::new(runtime, config)?;

        let transaction1 = fixture.signed_dummy_transaction(0, None)?;
        let transaction2 = fixture.signed_dummy_transaction(1, None)?;

        fixture
            .provider_data
            .add_pending_transaction(transaction1.clone())?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2.clone())?;

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        assert_eq!(result.block.transactions().len(), 2);

        let receipt1 = fixture
            .provider_data
            .transaction_receipt(transaction1.hash())?
            .expect("receipt should exist");

        assert_eq!(receipt1.transaction_index, 0);

        let receipt2 = fixture
            .provider_data
            .transaction_receipt(transaction2.hash())?
            .expect("receipt should exist");

        assert_eq!(receipt2.transaction_index, 1);

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_correct_gas_used() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction1 = fixture.signed_dummy_transaction(0, None)?;
        let transaction2 = fixture.signed_dummy_transaction(1, None)?;

        fixture
            .provider_data
            .add_pending_transaction(transaction1.clone())?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2.clone())?;

        let result = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        let receipt1 = fixture
            .provider_data
            .transaction_receipt(transaction1.hash())?
            .expect("receipt should exist");
        let receipt2 = fixture
            .provider_data
            .transaction_receipt(transaction2.hash())?
            .expect("receipt should exist");

        assert_eq!(receipt1.gas_used, 21_000);
        assert_eq!(receipt2.gas_used, 21_000);
        assert_eq!(
            result.block.header().gas_used,
            receipt1.gas_used + receipt2.gas_used
        );

        Ok(())
    }

    #[test]
    fn mine_and_commit_block_rewards_miner() -> anyhow::Result<()> {
        let default_config = create_test_config();
        let config = ProviderConfig {
            hardfork: SpecId::BERLIN,
            ..default_config
        };

        let runtime = runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .thread_name("provider-data-test")
            .build()?;

        let mut fixture = ProviderTestFixture::new(runtime, config)?;

        let miner = fixture.provider_data.beneficiary;
        let previous_miner_balance = fixture
            .provider_data
            .balance(miner, Some(&BlockSpec::latest()))?;

        let transaction = fixture.signed_dummy_transaction(0, None)?;
        fixture
            .provider_data
            .add_pending_transaction(transaction.clone())?;

        fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        let miner_balance = fixture
            .provider_data
            .balance(miner, Some(&BlockSpec::latest()))?;

        assert!(miner_balance > previous_miner_balance);

        Ok(())
    }

    #[test]
    fn mine_and_commit_blocks_increases_block_number() -> anyhow::Result<()> {
        const NUM_MINED_BLOCKS: u64 = 10;

        let mut fixture = ProviderTestFixture::new_local()?;

        let previous_block_number = fixture.provider_data.last_block_number();

        fixture
            .provider_data
            .mine_and_commit_blocks(NUM_MINED_BLOCKS, 1)?;

        assert_eq!(
            fixture.provider_data.last_block_number(),
            previous_block_number + NUM_MINED_BLOCKS
        );
        assert_eq!(
            fixture.provider_data.last_block()?.header().number,
            previous_block_number + NUM_MINED_BLOCKS
        );

        Ok(())
    }

    #[test]
    fn mine_and_commit_blocks_works_with_snapshots() -> anyhow::Result<()> {
        const NUM_MINED_BLOCKS: u64 = 10;

        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction1 = fixture.signed_dummy_transaction(0, None)?;
        let transaction2 = fixture.signed_dummy_transaction(1, None)?;

        let original_block_number = fixture.provider_data.last_block_number();

        fixture
            .provider_data
            .add_pending_transaction(transaction1.clone())?;

        let snapshot_id = fixture.provider_data.make_snapshot();
        assert_eq!(
            fixture.provider_data.last_block_number(),
            original_block_number
        );

        // Mine block after snapshot
        fixture
            .provider_data
            .mine_and_commit_blocks(NUM_MINED_BLOCKS, 1)?;

        assert_eq!(
            fixture.provider_data.last_block_number(),
            original_block_number + NUM_MINED_BLOCKS
        );

        let reverted = fixture.provider_data.revert_to_snapshot(snapshot_id);
        assert!(reverted);

        assert_eq!(
            fixture.provider_data.last_block_number(),
            original_block_number
        );

        fixture
            .provider_data
            .mine_and_commit_blocks(NUM_MINED_BLOCKS, 1)?;

        let block_number_before_snapshot = fixture.provider_data.last_block_number();

        // Mine block before snapshot
        let snapshot_id = fixture.provider_data.make_snapshot();

        fixture
            .provider_data
            .add_pending_transaction(transaction2.clone())?;

        fixture.provider_data.mine_and_commit_blocks(1, 1)?;

        let reverted = fixture.provider_data.revert_to_snapshot(snapshot_id);
        assert!(reverted);

        assert_eq!(
            fixture.provider_data.last_block_number(),
            block_number_before_snapshot
        );

        Ok(())
    }

    #[test]
    fn next_filter_id() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let mut prev_filter_id = fixture.provider_data.last_filter_id;
        for _ in 0..10 {
            let filter_id = fixture.provider_data.next_filter_id();
            assert!(prev_filter_id < filter_id);
            prev_filter_id = filter_id;
        }

        Ok(())
    }

    #[test]
    fn pending_transactions_returns_pending_and_queued() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local().unwrap();

        let transaction1 = fixture.signed_dummy_transaction(0, Some(0))?;
        fixture
            .provider_data
            .add_pending_transaction(transaction1.clone())?;

        let transaction2 = fixture.signed_dummy_transaction(0, Some(2))?;
        fixture
            .provider_data
            .add_pending_transaction(transaction2.clone())?;

        let transaction3 = fixture.signed_dummy_transaction(0, Some(3))?;
        fixture
            .provider_data
            .add_pending_transaction(transaction3.clone())?;

        let pending_transactions = fixture
            .provider_data
            .pending_transactions()
            .cloned()
            .collect::<Vec<_>>();

        assert_eq!(
            pending_transactions,
            vec![transaction1, transaction2, transaction3]
        );

        Ok(())
    }

    #[test]
    fn set_balance_updates_mem_pool() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction = fixture.impersonated_dummy_transaction()?;
        let transaction_hash = fixture.provider_data.add_pending_transaction(transaction)?;

        assert!(fixture
            .provider_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_some());

        fixture
            .provider_data
            .set_balance(fixture.impersonated_account, U256::from(100))?;

        assert!(fixture
            .provider_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_none());

        Ok(())
    }

    #[test]
    fn transaction_by_invalid_hash() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        let non_existing_tx = fixture.provider_data.transaction_by_hash(&B256::ZERO)?;

        assert!(non_existing_tx.is_none());

        Ok(())
    }

    #[test]
    fn pending_transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction_request = fixture.signed_dummy_transaction(0, None)?;
        let transaction_hash = fixture
            .provider_data
            .add_pending_transaction(transaction_request)?;

        let transaction_result = fixture
            .provider_data
            .transaction_by_hash(&transaction_hash)?
            .context("transaction not found")?;

        assert_eq!(transaction_result.transaction.hash(), &transaction_hash);

        Ok(())
    }

    #[test]
    fn transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let transaction_request = fixture.signed_dummy_transaction(0, None)?;
        let transaction_hash = fixture
            .provider_data
            .add_pending_transaction(transaction_request)?;

        let results = fixture
            .provider_data
            .mine_and_commit_block(BlockOptions::default())?;

        // Make sure transaction was mined successfully.
        assert!(results
            .transaction_results
            .first()
            .context("failed to mine transaction")?
            .is_success());
        // Sanity check that the mempool is empty.
        assert_eq!(fixture.provider_data.mem_pool.transactions().count(), 0);

        let transaction_result = fixture
            .provider_data
            .transaction_by_hash(&transaction_hash)?
            .context("transaction not found")?;

        assert_eq!(transaction_result.transaction.hash(), &transaction_hash);

        Ok(())
    }

    #[test]
    fn reset_local_to_forking() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_local()?;

        let fork_config = Some(ForkConfig {
            json_rpc_url: get_alchemy_url(),
            // Random recent block for better cache consistency
            block_number: Some(FORK_BLOCK_NUMBER),
            http_headers: None,
        });

        let block_spec = BlockSpec::Number(FORK_BLOCK_NUMBER);

        assert_eq!(fixture.provider_data.last_block_number(), 0);

        fixture.provider_data.reset(fork_config)?;

        // We're fetching a specific block instead of the last block number for the
        // forked blockchain, because the last block number query cannot be
        // cached.
        assert!(fixture
            .provider_data
            .block_by_block_spec(&block_spec)?
            .is_some());

        Ok(())
    }

    #[test]
    fn reset_forking_to_local() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new_forked(None)?;

        // We're fetching a specific block instead of the last block number for the
        // forked blockchain, because the last block number query cannot be
        // cached.
        assert!(fixture
            .provider_data
            .block_by_block_spec(&BlockSpec::Number(FORK_BLOCK_NUMBER))?
            .is_some());

        fixture.provider_data.reset(None)?;

        assert_eq!(fixture.provider_data.last_block_number(), 0);

        Ok(())
    }

    #[test]
    fn sign_typed_data_v4() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_local()?;

        // This test was taken from the `eth_signTypedData` example from the
        // EIP-712 specification via Hardhat.
        // <https://eips.ethereum.org/EIPS/eip-712#eth_signtypeddata>

        let address: Address = "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826".parse()?;
        let message = json!({
          "types": {
            "EIP712Domain": [
              { "name": "name", "type": "string" },
              { "name": "version", "type": "string" },
              { "name": "chainId", "type": "uint256" },
              { "name": "verifyingContract", "type": "address" },
            ],
            "Person": [
              { "name": "name", "type": "string" },
              { "name": "wallet", "type": "address" },
            ],
            "Mail": [
              { "name": "from", "type": "Person" },
              { "name": "to", "type": "Person" },
              { "name": "contents", "type": "string" },
            ],
          },
          "primaryType": "Mail",
          "domain": {
            "name": "Ether Mail",
            "version": "1",
            "chainId": 1,
            "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
          },
          "message": {
            "from": {
              "name": "Cow",
              "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
            },
            "to": {
              "name": "Bob",
              "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
            },
            "contents": "Hello, Bob!",
          },
        });
        let message: TypedData = serde_json::from_value(message)?;

        let signature = fixture
            .provider_data
            .sign_typed_data_v4(&address, &message)?;

        let expected_signature = "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c";

        assert_eq!(hex::decode(expected_signature)?, signature.to_vec(),);

        Ok(())
    }

    #[test]
    fn run_call_in_hardfork_context() -> anyhow::Result<()> {
        sol! { function Hello() public pure returns (string); }

        fn assert_decoded_output(result: ExecutionResult) -> anyhow::Result<()> {
            let output = result.into_output().expect("Call must have output");
            let decoded = HelloCall::abi_decode_returns(output.as_ref(), false)?;

            assert_eq!(decoded._0, "Hello World");
            Ok(())
        }

        /// Executes a call to method `Hello` on contract `HelloWorld`,
        /// deployed to mainnet.
        ///
        /// Should return a string `"Hello World"`.
        fn call_hello_world_contract(
            data: &mut ProviderData<Infallible>,
            block_spec: BlockSpec,
            request: CallRequest,
        ) -> Result<CallResult, ProviderError<Infallible>> {
            let state_overrides = StateOverrides::default();

            let transaction =
                resolve_call_request(data, request, Some(&block_spec), &state_overrides)?;

            data.run_call(transaction, Some(&block_spec), &state_overrides)
        }

        const EIP_1559_ACTIVATION_BLOCK: u64 = 12_965_000;
        const HELLO_WORLD_CONTRACT_ADDRESS: &str = "0xe36613A299bA695aBA8D0c0011FCe95e681f6dD3";

        let hello_world_contract_address: Address = HELLO_WORLD_CONTRACT_ADDRESS.parse()?;
        let hello_world_contract_call = HelloCall::new(());

        let runtime = runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .thread_name("provider-data-test")
            .build()?;

        let default_config = create_test_config_with_fork(Some(ForkConfig {
            json_rpc_url: get_alchemy_url(),
            block_number: Some(EIP_1559_ACTIVATION_BLOCK),
            http_headers: None,
        }));

        let config = ProviderConfig {
            block_gas_limit: 1_000_000,
            chain_id: 1,
            coinbase: Address::ZERO,
            hardfork: SpecId::LONDON,
            network_id: 1,
            ..default_config
        };

        let mut fixture = ProviderTestFixture::new(runtime, config)?;

        let default_call = CallRequest {
            from: Some(fixture.nth_local_account(0)?),
            to: Some(hello_world_contract_address),
            gas: Some(1_000_000),
            value: Some(U256::ZERO),
            data: Some(hello_world_contract_call.abi_encode().into()),
            ..CallRequest::default()
        };

        // Should accept post-EIP-1559 gas semantics when running in the context of a
        // post-EIP-1559 block
        let result = call_hello_world_contract(
            &mut fixture.provider_data,
            BlockSpec::Number(EIP_1559_ACTIVATION_BLOCK),
            CallRequest {
                max_fee_per_gas: Some(U256::ZERO),
                ..default_call.clone()
            },
        )?;

        assert_decoded_output(result.execution_result)?;

        // Should accept pre-EIP-1559 gas semantics when running in the context of a
        // pre-EIP-1559 block
        let result = call_hello_world_contract(
            &mut fixture.provider_data,
            BlockSpec::Number(EIP_1559_ACTIVATION_BLOCK - 1),
            CallRequest {
                gas_price: Some(U256::ZERO),
                ..default_call.clone()
            },
        )?;

        assert_decoded_output(result.execution_result)?;

        // Should throw when given post-EIP-1559 gas semantics and when running in the
        // context of a pre-EIP-1559 block
        let result = call_hello_world_contract(
            &mut fixture.provider_data,
            BlockSpec::Number(EIP_1559_ACTIVATION_BLOCK - 1),
            CallRequest {
                max_fee_per_gas: Some(U256::ZERO),
                ..default_call.clone()
            },
        );

        assert!(matches!(
            result,
            Err(ProviderError::RunTransaction(
                TransactionError::Eip1559Unsupported
            ))
        ));

        // Should accept pre-EIP-1559 gas semantics when running in the context of a
        // post-EIP-1559 block
        let result = call_hello_world_contract(
            &mut fixture.provider_data,
            BlockSpec::Number(EIP_1559_ACTIVATION_BLOCK),
            CallRequest {
                gas_price: Some(U256::ZERO),
                ..default_call.clone()
            },
        )?;

        assert_decoded_output(result.execution_result)?;

        // Should support a historical call in the context of a block added via
        // `mine_and_commit_blocks`
        let previous_block_number = fixture.provider_data.last_block_number();

        fixture.provider_data.mine_and_commit_blocks(100, 1)?;

        let result = call_hello_world_contract(
            &mut fixture.provider_data,
            BlockSpec::Number(previous_block_number + 50),
            CallRequest {
                max_fee_per_gas: Some(U256::ZERO),
                ..default_call
            },
        )?;

        assert_decoded_output(result.execution_result)?;

        Ok(())
    }

    macro_rules! impl_full_block_tests {
        ($(
            $name:ident => {
                block_number: $block_number:expr,
                chain_id: $chain_id:expr,
                url: $url:expr,
            },
        )+) => {
            $(
                paste::item! {
                    #[serial_test::serial]
                    #[tokio::test(flavor = "multi_thread")]
                    async fn [<full_block_ $name>]() -> anyhow::Result<()> {
                        let url = $url;

                        crate::test_utils::run_full_block(url, $block_number, $chain_id).await
                    }
                }
            )+
        }
    }

    impl_full_block_tests! {
        mainnet_byzantium => {
            block_number: 4_370_001,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        mainnet_constantinople => {
            block_number: 7_280_001,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        mainnet_istanbul => {
            block_number: 9_069_001,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        mainnet_muir_glacier => {
            block_number: 9_300_077,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        mainnet_shanghai => {
            block_number: 17_050_001,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        // This block contains a sequence of transaction that first raise
        // an empty account's balance and then decrease it
        mainnet_19318016 => {
            block_number: 19_318_016,
            chain_id: 1,
            url: get_alchemy_url(),
        },
        // This block has both EIP-2930 and EIP-1559 transactions
        goerli_merge => {
            block_number: 7_728_449,
            chain_id: 5,
            url: get_alchemy_url().replace("mainnet", "goerli"),
        },
        sepolia_shanghai => {
            block_number: 3_095_000,
            chain_id: 11_155_111,
            url: get_alchemy_url().replace("mainnet", "sepolia"),
        },
    }
}
