mod account;
mod inspector;

use std::{
    cmp::Ordering,
    collections::BTreeMap,
    fmt::Debug,
    sync::Arc,
    time::{Instant, SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    block::BlobGas,
    receipt::BlockReceipt,
    remote::{
        filter::{FilteredEvents, LogOutput, SubscriptionType},
        BlockSpec, BlockTag, Eip1898BlockSpec, RpcClient, RpcClientError,
    },
    rlp::Decodable,
    signature::Signature,
    transaction::{SignedTransaction, TransactionRequestAndSender},
    Address, Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, LocalBlockchain,
        LocalCreationError, SyncBlockchain,
    },
    calculate_next_base_fee,
    db::StateRef,
    guaranteed_dry_run, mempool, mine_block,
    state::{
        AccountModifierFn, IrregularState, StateDiff, StateError, StateOverride, StateOverrides,
        SyncState,
    },
    Account, AccountInfo, BlobExcessGasAndPrice, Block, BlockEnv, Bytecode, CfgEnv,
    ExecutionResult, HashMap, HashSet, MemPool, MineBlockResult, MineBlockResultAndState,
    MineOrdering, PendingTransaction, RandomHashGenerator, StorageSlot, SyncBlock, KECCAK_EMPTY,
};
use indexmap::IndexMap;
use inspector::EvmInspector;
pub use inspector::{InspectorCallbacks, SyncInspectorCallbacks};
use lazy_static::lazy_static;
use tokio::runtime;

use self::account::{create_accounts, InitialAccounts};
use crate::{
    error::TransactionFailure,
    filter::Filter,
    logger::Logger,
    pending::BlockchainWithPending,
    requests::hardhat::rpc_types::{ForkConfig, ForkMetadata},
    snapshot::Snapshot,
    ProviderConfig, ProviderError,
};

#[derive(Debug, thiserror::Error)]
pub enum CreationError {
    /// A blockchain error
    #[error(transparent)]
    Blockchain(BlockchainError),
    /// An error that occurred while constructing a forked blockchain.
    #[error(transparent)]
    ForkedBlockchainCreation(#[from] ForkedCreationError),
    /// Invalid initial date
    #[error("The initial date configuration value {0:?} is in the future")]
    InvalidInitialDate(SystemTime),
    /// An error that occurred while constructing a local blockchain.
    #[error(transparent)]
    LocalBlockchainCreation(#[from] LocalCreationError),
    /// An error that occured while querying the remote state.
    #[error(transparent)]
    RpcClient(#[from] RpcClientError),
}

struct BlockContext {
    pub block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    pub state: Box<dyn SyncState<StateError>>,
}

pub struct ProviderData {
    runtime_handle: runtime::Handle,
    initial_config: ProviderConfig,
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    state: Box<dyn SyncState<StateError>>,
    pub irregular_state: IrregularState,
    mem_pool: MemPool,
    beneficiary: Address,
    min_gas_price: U256,
    prev_randao_generator: RandomHashGenerator,
    block_time_offset_seconds: u64,
    fork_metadata: Option<ForkMetadata>,
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
    logger: Logger,
    impersonated_accounts: HashSet<Address>,
    callbacks: Box<dyn SyncInspectorCallbacks>,
}

impl ProviderData {
    pub fn new(
        runtime_handle: runtime::Handle,
        callbacks: Box<dyn SyncInspectorCallbacks>,
        config: ProviderConfig,
    ) -> Result<Self, CreationError> {
        let InitialAccounts {
            local_accounts,
            genesis_accounts,
        } = create_accounts(&config);

        let BlockchainAndState {
            blockchain,
            fork_metadata,
            state,
            irregular_state,
            next_block_base_fee_per_gas,
        } = create_blockchain_and_state(runtime_handle.clone(), &config, genesis_accounts)?;

        let prev_randao_generator = RandomHashGenerator::with_seed("randomMixHashSeed");

        let allow_blocks_with_same_timestamp = config.allow_blocks_with_same_timestamp;
        let allow_unlimited_contract_size = config.allow_unlimited_contract_size;
        let beneficiary = config.coinbase;
        let block_gas_limit = config.block_gas_limit;
        let block_time_offset_seconds = block_time_offset_seconds(&config)?;
        let is_auto_mining = config.mining.auto_mine;
        let min_gas_price = config.min_gas_price;

        Ok(Self {
            runtime_handle,
            initial_config: config,
            blockchain,
            state,
            irregular_state,
            mem_pool: MemPool::new(block_gas_limit),
            beneficiary,
            min_gas_price,
            prev_randao_generator,
            block_time_offset_seconds,
            fork_metadata,
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
            logger: Logger::new(false),
            impersonated_accounts: HashSet::new(),
            callbacks,
        })
    }

    pub fn reset(&mut self, fork_config: Option<ForkConfig>) -> Result<(), CreationError> {
        let mut config = self.initial_config.clone();
        config.fork = fork_config;

        let mut reset_instance =
            Self::new(self.runtime_handle.clone(), self.callbacks.clone(), config)?;

        std::mem::swap(self, &mut reset_instance);

        Ok(())
    }

    /// Retrieves the last pending nonce of the account corresponding to the
    /// provided address, if it exists.
    pub fn account_next_nonce(&self, address: &Address) -> Result<u64, StateError> {
        mempool::account_next_nonce(&self.mem_pool, &self.state, address)
    }

    pub fn accounts(&self) -> impl Iterator<Item = &Address> {
        self.local_accounts.keys()
    }

    /// Returns whether the miner is mining automatically.
    pub fn is_auto_mining(&self) -> bool {
        self.is_auto_mining
    }

    pub fn balance(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, ProviderError> {
        self.execute_in_block_context::<Result<U256, ProviderError>>(
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

    /// Fetch a block by block spec.
    /// Returns `None` if the block spec is `pending`.
    /// Returns `ProviderError::InvalidBlockSpec` error if the block spec is a
    /// number or a hash and the block isn't found.
    /// Returns `ProviderError::InvalidBlockTag` error if the block tag is safe
    /// or finalized and block spec is pre-merge.
    pub fn block_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, ProviderError> {
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
            BlockSpec::Tag(BlockTag::Finalized | BlockTag::Safe) => {
                if self.spec_id() >= SpecId::MERGE {
                    Some(self.blockchain.last_block()?)
                } else {
                    return Err(ProviderError::InvalidBlockTag {
                        block_spec: block_spec.clone(),
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
    ) -> Result<Option<u64>, ProviderError> {
        let block_number = match block_spec {
            BlockSpec::Number(number) => Some(*number),
            BlockSpec::Tag(BlockTag::Earliest) => Some(0),
            BlockSpec::Tag(BlockTag::Finalized | BlockTag::Safe) => {
                if self.spec_id() >= SpecId::MERGE {
                    Some(self.blockchain.last_block_number())
                } else {
                    return Err(ProviderError::InvalidBlockTag {
                        block_spec: block_spec.clone(),
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
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, ProviderError> {
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

    pub fn get_code(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<Bytes, ProviderError> {
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
    ) -> Result<Option<Vec<LogOutput>>, ProviderError> {
        self.filters
            .get_mut(filter_id)
            .map(|filter| {
                if let Some(events) = filter.take_log_events() {
                    Ok(events)
                } else {
                    Err(ProviderError::InvalidFilterSubscriptionType {
                        filter_id: *filter_id,
                        expected: SubscriptionType::Logs,
                        actual: filter.events.subscription_type(),
                    })
                }
            })
            .transpose()
    }

    pub fn get_storage_at(
        &self,
        address: Address,
        index: U256,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, ProviderError> {
        self.execute_in_block_context::<Result<U256, ProviderError>>(
            block_spec,
            move |_blockchain, _block, state| Ok(state.storage(address, index)?),
        )?
    }

    pub fn get_transaction_count(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, ProviderError> {
        self.execute_in_block_context::<Result<u64, ProviderError>>(
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

    pub fn increase_block_time(&mut self, increment: u64) -> u64 {
        self.block_time_offset_seconds += increment;
        self.block_time_offset_seconds
    }

    pub fn instance_id(&self) -> &B256 {
        &self.instance_id
    }

    pub fn interval_mine(&mut self) -> Result<bool, ProviderError> {
        let result = self.mine_and_commit_block(None)?;

        let header = result.block.header();
        let is_empty = result.block.transactions().is_empty();
        if is_empty {
            self.logger.print_interval_mined_block_number(
                header.number,
                is_empty,
                header.base_fee_per_gas,
            );
        } else {
            log::error!("TODO: interval_mine: log mined block");

            self.logger
                .print_interval_mined_block_number(header.number, is_empty, None);

            if self.logger.print_logs() {
                self.logger.print_empty_line();
            }
        }

        Ok(true)
    }

    pub fn logger(&self) -> &Logger {
        &self.logger
    }

    pub fn make_snapshot(&mut self) -> u64 {
        let id = self.next_snapshot_id;
        self.next_snapshot_id += 1;

        let snapshot = Snapshot {
            block_number: self.blockchain.last_block_number(),
            block_time_offset_seconds: self.block_time_offset_seconds,
            coinbase: self.beneficiary,
            irregular_state: self.irregular_state.clone(),
            mem_pool: self.mem_pool.clone(),
            next_block_base_fee_per_gas: self.next_block_base_fee_per_gas,
            next_block_timestamp: self.next_block_timestamp,
            prev_randao_generator: self.prev_randao_generator.clone(),
            state: self.state.clone(),
            time: Instant::now(),
        };
        self.snapshots.insert(id, snapshot);

        id
    }

    pub fn mine_and_commit_block(
        &mut self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError>, ProviderError> {
        let (block_timestamp, new_offset) = self.next_block_timestamp(timestamp)?;
        let prevrandao = if self.blockchain.spec_id() >= SpecId::MERGE {
            Some(self.prev_randao_generator.next_value())
        } else {
            None
        };

        let result = self.mine_block(block_timestamp, prevrandao)?;

        if let Some(new_offset) = new_offset {
            self.block_time_offset_seconds = new_offset;
        }

        // Reset the next block base fee per gas upon successful execution
        self.next_block_base_fee_per_gas.take();

        // Reset next block time stamp
        self.next_block_timestamp.take();

        let block = self
            .blockchain
            .insert_block(result.block, result.state_diff)
            .map_err(ProviderError::Blockchain)?;

        self.mem_pool
            .update(&result.state)
            .map_err(ProviderError::MemPoolUpdate)?;

        self.state = result.state;

        Ok(MineBlockResult {
            block,
            transaction_results: result.transaction_results,
            transaction_traces: result.transaction_traces,
        })
    }

    pub fn network_id(&self) -> String {
        self.initial_config.network_id.to_string()
    }

    pub fn new_pending_transaction_filter(&mut self) -> U256 {
        let filter_id = self.next_filter_id();
        self.filters.insert(
            filter_id,
            Filter::new(
                FilteredEvents::NewPendingTransactions(Vec::new()),
                /* is_subscription */ false,
            ),
        );
        filter_id
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
        &self,
        address: &Address,
        block_spec: Option<&BlockSpec>,
        state_overrides: &StateOverrides,
    ) -> Result<u64, ProviderError> {
        state_overrides
            .account_override(address)
            .and_then(|account_override| account_override.nonce)
            .map_or_else(
                || {
                    if matches!(block_spec, Some(BlockSpec::Tag(BlockTag::Pending))) {
                        self.account_next_nonce(address)
                            .map_err(ProviderError::State)
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

    pub fn pending_transactions(&self) -> impl Iterator<Item = &PendingTransaction> {
        self.mem_pool.transactions()
    }

    pub fn remove_filter(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ false>(filter_id)
    }

    pub fn remove_subscription(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ true>(filter_id)
    }

    pub fn revert_to_snapshot(&mut self, snapshot_id: u64) -> bool {
        // Ensure that, if the snapshot exists, we also remove all subsequent snapshots,
        // as they can only be used once in Ganache.
        let mut removed_snapshots = self.snapshots.split_off(&snapshot_id);

        if let Some(snapshot) = removed_snapshots.remove(&snapshot_id) {
            let Snapshot {
                block_number,
                block_time_offset_seconds,
                coinbase,
                irregular_state,
                mem_pool,
                next_block_base_fee_per_gas,
                next_block_timestamp,
                prev_randao_generator,
                state,
                time,
            } = snapshot;

            // We compute a new offset such that:
            // now + new_offset == snapshot_date + old_offset
            let duration_since_snapshot = Instant::now().duration_since(time);
            self.block_time_offset_seconds =
                block_time_offset_seconds + duration_since_snapshot.as_secs();

            self.beneficiary = coinbase;
            self.blockchain
                .revert_to_block(block_number)
                .expect("Snapshotted block should exist");

            self.irregular_state = irregular_state;
            self.mem_pool = mem_pool;
            self.next_block_base_fee_per_gas = next_block_base_fee_per_gas;
            self.next_block_timestamp = next_block_timestamp;
            self.prev_randao_generator = prev_randao_generator;
            self.state = state;

            true
        } else {
            false
        }
    }

    pub fn run_call(
        &self,
        transaction: PendingTransaction,
        block_spec: Option<&BlockSpec>,
        state_overrides: &StateOverrides,
    ) -> Result<Bytes, ProviderError> {
        let cfg = self.create_evm_config(block_spec)?;
        let transaction_hash = *transaction.hash();
        let transaction = transaction.into();

        self.execute_in_block_context(block_spec, |blockchain, block, state| {
            let header = block.header();
            let block = BlockEnv {
                number: U256::from(header.number),
                coinbase: header.beneficiary,
                timestamp: U256::from(header.timestamp),
                gas_limit: U256::from(header.gas_limit),
                basefee: U256::from(0),
                difficulty: header.difficulty,
                prevrandao: if cfg.spec_id >= SpecId::MERGE {
                    Some(header.mix_hash)
                } else {
                    None
                },
                blob_excess_gas_and_price: header
                    .blob_gas
                    .as_ref()
                    .map(|BlobGas { excess_gas, .. }| BlobExcessGasAndPrice::new(*excess_gas)),
            };

            let mut inspector = self.evm_inspector();

            let result = guaranteed_dry_run(
                blockchain,
                &state,
                state_overrides,
                cfg,
                transaction,
                block,
                Some(&mut inspector),
            )
            .map_err(ProviderError::RunTransaction)?;

            match result.result {
                ExecutionResult::Success { output, .. } => Ok(output.into_data()),
                ExecutionResult::Revert { output, .. } => {
                    Err(TransactionFailure::revert(output, transaction_hash).into())
                }
                ExecutionResult::Halt { reason, .. } => {
                    Err(TransactionFailure::halt(reason, transaction_hash).into())
                }
            }
        })?
    }

    pub fn transaction_receipt(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, ProviderError> {
        self.blockchain
            .receipt_by_transaction_hash(transaction_hash)
            .map_err(ProviderError::Blockchain)
    }

    pub fn set_min_gas_price(&mut self, min_gas_price: U256) -> Result<(), ProviderError> {
        if self.spec_id() >= SpecId::LONDON {
            return Err(ProviderError::SetMinGasPriceUnsupported);
        }

        self.min_gas_price = min_gas_price;

        Ok(())
    }

    pub fn send_transaction(
        &mut self,
        transaction_request: TransactionRequestAndSender,
    ) -> Result<B256, ProviderError> {
        let signed_transaction = self.sign_transaction_request(transaction_request)?;

        let snapshot_id = if self.is_auto_mining {
            self.validate_auto_mine_transaction(&signed_transaction)?;

            Some(self.make_snapshot())
        } else {
            None
        };

        let tx_hash = self
            .add_pending_transaction(signed_transaction)
            .map_err(|error| {
                if let Some(snapshot_id) = snapshot_id {
                    self.revert_to_snapshot(snapshot_id);
                }

                error
            })?;

        if let Some(snapshot_id) = snapshot_id {
            let transaction_result = loop {
                let result = self.mine_and_commit_block(None).map_err(|error| {
                    self.revert_to_snapshot(snapshot_id);

                    error
                })?;

                let transaction_result = result.block.transactions().iter().enumerate().find_map(
                    |(idx, transaction)| {
                        if *transaction.hash() == tx_hash {
                            Some(result.transaction_results[idx].clone())
                        } else {
                            None
                        }
                    },
                );

                if let Some(transaction_result) = transaction_result {
                    break transaction_result;
                }
            };

            while self.mem_pool.has_pending_transactions() {
                self.mine_and_commit_block(None).map_err(|error| {
                    self.revert_to_snapshot(snapshot_id);

                    error
                })?;
            }

            self.snapshots.remove(&snapshot_id);

            match transaction_result {
                ExecutionResult::Success { .. } => (),
                ExecutionResult::Revert { output, .. } => {
                    return Err(TransactionFailure::revert(output, tx_hash).into());
                }
                ExecutionResult::Halt { reason, .. } => {
                    self.revert_to_snapshot(snapshot_id);

                    return Err(TransactionFailure::halt(reason, tx_hash).into());
                }
            }
        }

        Ok(tx_hash)
    }

    pub fn send_raw_transaction(
        &mut self,
        mut raw_transaction: &[u8],
    ) -> Result<B256, ProviderError> {
        let signed_transaction = SignedTransaction::decode(&mut raw_transaction)?;

        let pending_transaction =
            PendingTransaction::new(self.blockchain.spec_id(), signed_transaction)?;

        self.add_pending_transaction(pending_transaction)
    }

    /// Sets whether the miner should mine automatically.
    pub fn set_auto_mining(&mut self, enabled: bool) {
        self.is_auto_mining = enabled;
    }

    pub fn set_balance(&mut self, address: Address, balance: U256) -> Result<(), ProviderError> {
        let account_info = self.state.modify_account(
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

        let block_number = self.blockchain.last_block_number();
        let state_root = self.state.state_root()?;

        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        self.mem_pool.update(&self.state)?;

        Ok(())
    }

    /// Sets the gas limit used for mining new blocks.
    pub fn set_block_gas_limit(&mut self, gas_limit: u64) -> Result<(), ProviderError> {
        self.mem_pool
            .set_block_gas_limit(&self.state, gas_limit)
            .map_err(ProviderError::State)
    }

    pub fn set_code(&mut self, address: Address, code: Bytes) -> Result<(), ProviderError> {
        let code = Bytecode::new_raw(code.clone());
        let default_code = code.clone();
        let irregular_code = code.clone();

        let mut account_info = self.state.modify_account(
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

        let block_number = self.blockchain.last_block_number();
        let state_root = self.state.state_root()?;

        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        Ok(())
    }

    /// Sets the coinbase.
    pub fn set_coinbase(&mut self, coinbase: Address) {
        self.beneficiary = coinbase;
    }

    /// Sets the next block's base fee per gas.
    pub fn set_next_block_base_fee_per_gas(&mut self, base_fee_per_gas: U256) {
        self.next_block_base_fee_per_gas = Some(base_fee_per_gas);
    }

    /// Set the next block timestamp.
    pub fn set_next_block_timestamp(&mut self, timestamp: u64) -> Result<u64, ProviderError> {
        let latest_block = self.blockchain.last_block()?;
        let latest_block_header = latest_block.header();

        match timestamp.cmp(&latest_block_header.timestamp) {
            Ordering::Less => Err(ProviderError::TimestampLowerThanPrevious {
                proposed: timestamp,
                previous: latest_block_header.timestamp,
            }),
            Ordering::Equal => Err(ProviderError::TimestampEqualsPrevious {
                proposed: timestamp,
            }),
            Ordering::Greater => {
                self.next_block_timestamp = Some(timestamp);
                Ok(timestamp)
            }
        }
    }

    /// Sets the next block's prevrandao.
    pub fn set_next_prev_randao(&mut self, prev_randao: B256) {
        self.prev_randao_generator.set_next(prev_randao);
    }

    pub fn set_nonce(&mut self, address: Address, nonce: u64) -> Result<(), ProviderError> {
        if mempool::has_transactions(&self.mem_pool) {
            return Err(ProviderError::SetAccountNonceWithPendingTransactions);
        }

        let previous_nonce = self
            .state
            .basic(address)?
            .map_or(0, |account| account.nonce);

        if nonce < previous_nonce {
            return Err(ProviderError::SetAccountNonceLowerThanCurrent {
                previous: previous_nonce,
                proposed: nonce,
            });
        }

        let account_info = self.state.modify_account(
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

        let block_number = self.blockchain.last_block_number();
        let state_root = self.state.state_root()?;

        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_account_change(address, account_info.clone());

        self.mem_pool.update(&self.state)?;

        Ok(())
    }

    pub fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), ProviderError> {
        self.state.set_account_storage_slot(address, index, value)?;

        let old_value = self.state.set_account_storage_slot(address, index, value)?;

        let slot = StorageSlot::new_changed(old_value, value);
        let account_info = self.state.basic(address).and_then(|mut account_info| {
            // Retrieve the code if it's not empty. This is needed for the irregular state.
            if let Some(account_info) = &mut account_info {
                if account_info.code_hash != KECCAK_EMPTY {
                    account_info.code = Some(self.state.code_by_hash(account_info.code_hash)?);
                }
            }

            Ok(account_info)
        })?;

        let block_number = self.blockchain.last_block_number();
        let state_root = self.state.state_root()?;

        self.irregular_state
            .state_override_at_block_number(block_number)
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_storage_change(address, index, slot, account_info);

        Ok(())
    }

    pub fn sign(&self, address: &Address, message: Bytes) -> Result<Signature, ProviderError> {
        match self.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&message[..], secret_key)?),
            None => Err(ProviderError::UnknownAddress { address: *address }),
        }
    }

    pub fn spec_id(&self) -> SpecId {
        self.blockchain.spec_id()
    }

    pub fn stop_impersonating_account(&mut self, address: Address) -> bool {
        self.impersonated_accounts.remove(&address)
    }

    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, ProviderError> {
        self.blockchain
            .total_difficulty_by_hash(hash)
            .map_err(ProviderError::Blockchain)
    }

    /// Get a transaction by hash from the blockchain or from the mempool if
    /// it's not mined yet.
    pub fn transaction_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<TransactionAndBlock>, ProviderError> {
        let transaction = if let Some(tx) = self.mem_pool.transaction_by_hash(hash) {
            let signed_transaction = tx.pending().transaction().clone();

            Some(TransactionAndBlock {
                signed_transaction,
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

            let signed_transaction = block
                .transactions()
                .get(tx_index)
                .expect("Transaction index must be valid, since it's from the receipt.")
                .clone();

            Some(TransactionAndBlock {
                signed_transaction,
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
        transaction: PendingTransaction,
    ) -> Result<B256, ProviderError> {
        let transaction_hash = *transaction.hash();

        // Handles validation
        self.mem_pool.add_transaction(&self.state, transaction)?;

        for filter in self.filters.values_mut() {
            if let FilteredEvents::NewPendingTransactions(events) = &mut filter.events {
                events.push(transaction_hash);
            }
        }

        Ok(transaction_hash)
    }
    fn evm_inspector(&self) -> EvmInspector<'_> {
        EvmInspector::new(&*self.callbacks)
    }

    fn create_evm_config(&self, block_spec: Option<&BlockSpec>) -> Result<CfgEnv, ProviderError> {
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
        &self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(
            &dyn SyncBlockchain<BlockchainError, StateError>,
            Arc<dyn SyncBlock<Error = BlockchainError>>,
            Box<dyn SyncState<StateError>>,
        ) -> T,
    ) -> Result<T, ProviderError> {
        let (context, blockchain) = if let Some(context) = self.context_by_block_spec(block_spec)? {
            (context, None)
        } else {
            let result = self.mine_pending_block()?;

            let blockchain =
                BlockchainWithPending::new(&*self.blockchain, result.block, result.state_diff);

            let block = blockchain
                .last_block()
                .expect("The pending block is the last block");

            let context = BlockContext {
                block,
                state: result.state,
            };

            (context, Some(blockchain))
        };

        let blockchain = blockchain
            .as_ref()
            .map_or(&*self.blockchain, |blockchain| blockchain);

        // Execute function in the requested block context.
        let result = function(blockchain, context.block, context.state);

        Ok(result)
    }

    /// Mine a block at a specific timestamp
    fn mine_block(
        &self,
        timestamp: u64,
        prevrandao: Option<B256>,
    ) -> Result<MineBlockResultAndState<StateError>, ProviderError> {
        // TODO: https://github.com/NomicFoundation/edr/issues/156
        let reward = U256::ZERO;

        let evm_config = self.create_evm_config(None)?;

        let mut inspector = self.evm_inspector();

        let result = mine_block(
            &*self.blockchain,
            self.state.clone(),
            &self.mem_pool,
            &evm_config,
            timestamp,
            self.beneficiary,
            self.min_gas_price,
            // TODO: make this configurable (https://github.com/NomicFoundation/edr/issues/111)
            MineOrdering::Fifo,
            reward,
            self.next_block_base_fee_per_gas()?,
            prevrandao,
            Some(&mut inspector),
        )?;

        Ok(result)
    }

    /// Mines a pending block, without modifying any values.
    pub fn mine_pending_block(&self) -> Result<MineBlockResultAndState<StateError>, ProviderError> {
        let (block_timestamp, _new_offset) = self.next_block_timestamp(None)?;
        let prevrandao = if self.blockchain.spec_id() >= SpecId::MERGE {
            Some(self.prev_randao_generator.seed())
        } else {
            None
        };

        self.mine_block(block_timestamp, prevrandao)
    }

    /// Get the timestamp for the next block.
    /// Ported from <https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/node.ts#L1942>
    fn next_block_timestamp(
        &self,
        timestamp: Option<u64>,
    ) -> Result<(u64, Option<u64>), ProviderError> {
        let latest_block = self.blockchain.last_block()?;
        let latest_block_header = latest_block.header();

        let current_timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let (mut block_timestamp, new_offset) = if let Some(timestamp) = timestamp {
            timestamp.checked_sub(latest_block_header.timestamp).ok_or(
                ProviderError::TimestampLowerThanPrevious {
                    proposed: timestamp,
                    previous: latest_block_header.timestamp,
                },
            )?;
            (timestamp, Some(timestamp - current_timestamp))
        } else if let Some(next_block_timestamp) = self.next_block_timestamp {
            (
                next_block_timestamp,
                Some(next_block_timestamp - current_timestamp),
            )
        } else {
            (current_timestamp + self.block_time_offset_seconds, None)
        };

        let timestamp_needs_increase = block_timestamp == latest_block_header.timestamp
            && !self.allow_blocks_with_same_timestamp;
        if timestamp_needs_increase {
            block_timestamp += 1;
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

    fn sign_transaction_request(
        &self,
        transaction_request: TransactionRequestAndSender,
    ) -> Result<PendingTransaction, ProviderError> {
        let TransactionRequestAndSender { request, sender } = transaction_request;

        if self.impersonated_accounts.contains(&sender) {
            let signed_transaction = request.fake_sign(&sender);

            Ok(PendingTransaction::with_caller(
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
            Ok(PendingTransaction::new(
                self.blockchain.spec_id(),
                signed_transaction,
            )?)
        }
    }

    fn context_by_block_spec(
        &self,
        block_spec: Option<&BlockSpec>,
    ) -> Result<Option<BlockContext>, ProviderError> {
        let block = if let Some(block_spec) = block_spec {
            if let Some(block) = self.block_by_block_spec(block_spec)? {
                block
            } else {
                // Block spec is pending
                return Ok(None);
            }
        } else {
            self.blockchain.last_block()?
        };

        let block_header = block.header();

        let contextual_state = self
            .blockchain
            .state_at_block_number(block_header.number, self.irregular_state.state_overrides())?;

        Ok(Some(BlockContext {
            block,
            state: contextual_state,
        }))
    }

    fn validate_auto_mine_transaction(
        &self,
        transaction: &PendingTransaction,
    ) -> Result<(), ProviderError> {
        let next_nonce = self.account_next_nonce(transaction.caller())?;

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
}

fn block_time_offset_seconds(config: &ProviderConfig) -> Result<u64, CreationError> {
    config.initial_date.map_or(Ok(0), |initial_date| {
        Ok(SystemTime::now()
            .duration_since(initial_date)
            .map_err(|_e| CreationError::InvalidInitialDate(initial_date))?
            .as_secs())
    })
}

struct BlockchainAndState {
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    fork_metadata: Option<ForkMetadata>,
    state: Box<dyn SyncState<StateError>>,
    irregular_state: IrregularState,
    next_block_base_fee_per_gas: Option<U256>,
}

fn create_blockchain_and_state(
    runtime: runtime::Handle,
    config: &ProviderConfig,
    mut genesis_accounts: HashMap<Address, Account>,
) -> Result<BlockchainAndState, CreationError> {
    let mut irregular_state = IrregularState::default();

    if let Some(fork_config) = &config.fork {
        let state_root_generator = Arc::new(parking_lot::Mutex::new(
            RandomHashGenerator::with_seed("seed"),
        ));

        let rpc_client = RpcClient::new(&fork_config.json_rpc_url, config.cache_dir.clone());

        let blockchain = tokio::task::block_in_place(|| {
            runtime.block_on(ForkedBlockchain::new(
                runtime.clone(),
                Some(config.chain_id),
                config.hardfork,
                rpc_client,
                fork_config.block_number,
                state_root_generator.clone(),
                // TODO: make hardfork activations configurable (https://github.com/NomicFoundation/edr/issues/111)
                HashMap::new(),
            ))
        })?;

        let fork_block_number = blockchain.last_block_number();

        if !genesis_accounts.is_empty() {
            let rpc_client = RpcClient::new(&fork_config.json_rpc_url, config.cache_dir.clone());

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

            let state_root = state_root_generator.lock().next_value();

            irregular_state
                .state_override_at_block_number(fork_block_number)
                .or_insert(StateOverride {
                    diff: StateDiff::from(genesis_accounts),
                    state_root,
                });
        }

        let state = blockchain
            .state_at_block_number(fork_block_number, irregular_state.state_overrides())
            .expect("Fork state must exist");

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
            blockchain: Box::new(blockchain),
            state: Box::new(state),
            irregular_state,
            // There is no genesis block in a forked blockchain, so we incorporate the initial base
            // fee per gas as the next base fee value.
            next_block_base_fee_per_gas: config.initial_base_fee_per_gas,
        })
    } else {
        let blockchain = LocalBlockchain::new(
            StateDiff::from(genesis_accounts),
            config.chain_id,
            config.hardfork,
            config.block_gas_limit,
            config.initial_date.map(|d| {
                d.duration_since(UNIX_EPOCH)
                    .expect("initial date must be after UNIX epoch")
                    .as_secs()
            }),
            Some(RandomHashGenerator::with_seed("seed").next_value()),
            config.initial_base_fee_per_gas,
            config.initial_blob_gas.clone(),
            config.initial_parent_beacon_block_root,
        )?;

        let state = blockchain
            .state_at_block_number(0, irregular_state.state_overrides())
            .expect("Genesis state must exist");

        Ok(BlockchainAndState {
            fork_metadata: None,
            blockchain: Box::new(blockchain),
            state,
            irregular_state,
            // For local blockchain the initial base fee per gas config option is incorporated as
            // part of the genesis block.
            next_block_base_fee_per_gas: None,
        })
    }
}

/// The result returned by requesting a block by number.
#[derive(Debug, Clone)]
pub struct BlockAndTotalDifficulty {
    /// The block
    pub block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    /// The total difficulty with the block
    pub total_difficulty: Option<U256>,
}

/// The result returned by requesting a transaction.
#[derive(Debug, Clone)]
pub struct TransactionAndBlock {
    /// The signed transaction.
    pub signed_transaction: SignedTransaction,
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
mod tests {
    use anyhow::Context;
    use edr_eth::transaction::{Eip155TransactionRequest, TransactionKind, TransactionRequest};
    use edr_test_utils::env::get_alchemy_url;
    use parking_lot::Mutex;
    use tempfile::TempDir;

    use super::*;
    use crate::{
        data::inspector::tests::{
            deploy_console_log_contract, ConsoleLogTransaction, InspectorCallbacksStub,
        },
        test_utils::{
            create_test_config_with_impersonated_accounts_and_fork, one_ether, FORK_BLOCK_NUMBER,
        },
        ProviderConfig,
    };

    struct ProviderTestFixture {
        // We need to keep the tempdir and runtime alive for the duration of the test
        _cache_dir: TempDir,
        _runtime: runtime::Runtime,
        config: ProviderConfig,
        provider_data: ProviderData,
        impersonated_account: Address,
        console_log_calls: Arc<Mutex<Vec<Bytes>>>,
    }

    impl ProviderTestFixture {
        pub(crate) fn new() -> anyhow::Result<Self> {
            Self::new_with_config(false)
        }

        pub(crate) fn new_forked() -> anyhow::Result<Self> {
            Self::new_with_config(true)
        }

        fn new_with_config(forked: bool) -> anyhow::Result<Self> {
            let cache_dir = TempDir::new()?;

            let impersonated_account = Address::random();
            let config = create_test_config_with_impersonated_accounts_and_fork(
                cache_dir.path().to_path_buf(),
                vec![impersonated_account],
                forked,
            );

            let callbacks = Box::<InspectorCallbacksStub>::default();
            let console_log_calls = callbacks.console_log_calls.clone();

            let runtime = runtime::Builder::new_multi_thread()
                .worker_threads(1)
                .enable_all()
                .thread_name("provider-data-test")
                .build()?;

            let mut provider_data =
                ProviderData::new(runtime.handle().clone(), callbacks, config.clone())?;
            provider_data
                .impersonated_accounts
                .insert(impersonated_account);

            Ok(Self {
                _cache_dir: cache_dir,
                _runtime: runtime,
                config,
                provider_data,
                impersonated_account,
                console_log_calls,
            })
        }

        fn console_log_calls(&self) -> Vec<Bytes> {
            self.console_log_calls.lock().clone()
        }

        fn dummy_transaction_request(&self, nonce: Option<u64>) -> TransactionRequestAndSender {
            let request = TransactionRequest::Eip155(Eip155TransactionRequest {
                kind: TransactionKind::Call(Address::ZERO),
                gas_limit: 100_000,
                gas_price: U256::from(42_000_000_000_u64),
                value: U256::from(1),
                input: Bytes::default(),
                nonce: nonce.unwrap_or(0),
                chain_id: self.config.chain_id,
            });

            TransactionRequestAndSender {
                request,
                sender: self.first_local_account(),
            }
        }

        fn first_local_account(&self) -> Address {
            *self
                .provider_data
                .local_accounts
                .keys()
                .next()
                .expect("there are local accounts")
        }

        fn impersonated_dummy_transaction(&self) -> anyhow::Result<PendingTransaction> {
            let mut transaction = self.dummy_transaction_request(None);
            transaction.sender = self.impersonated_account;

            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }

        fn signed_dummy_transaction(&self) -> anyhow::Result<PendingTransaction> {
            let transaction = self.dummy_transaction_request(None);
            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }
    }

    #[test]
    fn test_local_account_balance() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new()?;

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
        let fixture = ProviderTestFixture::new_forked()?;

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
        let fixture = ProviderTestFixture::new()?;

        let transaction = fixture.signed_dummy_transaction()?;
        let recovered_address = transaction.recover()?;

        assert!(fixture
            .provider_data
            .local_accounts
            .contains_key(&recovered_address));

        Ok(())
    }

    #[test]
    fn test_sign_transaction_request_impersonated_account() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new()?;

        let transaction = fixture.impersonated_dummy_transaction()?;

        assert_eq!(transaction.caller(), &fixture.impersonated_account);

        Ok(())
    }

    fn test_add_pending_transaction(
        fixture: &mut ProviderTestFixture,
        transaction: PendingTransaction,
    ) -> anyhow::Result<()> {
        let filter_id = fixture.provider_data.new_pending_transaction_filter();

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
        let mut fixture = ProviderTestFixture::new()?;
        let transaction = fixture.signed_dummy_transaction()?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[test]
    fn add_pending_transaction_from_impersonated_account() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;
        let transaction = fixture.impersonated_dummy_transaction()?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[test]
    fn block_by_block_spec_earliest() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new()?;

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
        let mut fixture = ProviderTestFixture::new()?;

        // Mine a block to make sure we're not getting the genesis block
        fixture.provider_data.mine_and_commit_block(None)?;
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
        let fixture = ProviderTestFixture::new()?;

        let block_spec = BlockSpec::Tag(BlockTag::Pending);

        let block = fixture.provider_data.block_by_block_spec(&block_spec)?;

        assert!(block.is_none());

        Ok(())
    }

    #[test]
    fn chain_id() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new()?;

        let chain_id = fixture.provider_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[test]
    fn chain_id_fork_mode() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new_forked()?;

        let chain_id = fixture.provider_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[test]
    fn console_log_mine_block() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;
        let ConsoleLogTransaction {
            transaction,
            expected_call_data,
        } = deploy_console_log_contract(&mut fixture.provider_data)?;

        assert_eq!(fixture.console_log_calls().len(), 0);

        fixture.provider_data.set_auto_mining(false);
        fixture.provider_data.send_transaction(transaction)?;
        let (block_timestamp, _) = fixture.provider_data.next_block_timestamp(None)?;
        let prevrandao = fixture.provider_data.prev_randao_generator.next_value();
        fixture
            .provider_data
            .mine_block(block_timestamp, Some(prevrandao))?;

        let console_log_calls = fixture.console_log_calls();
        assert_eq!(console_log_calls.len(), 1);
        assert_eq!(console_log_calls[0], expected_call_data);

        Ok(())
    }

    #[test]
    fn console_log_run_call() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;
        let ConsoleLogTransaction {
            transaction,
            expected_call_data,
        } = deploy_console_log_contract(&mut fixture.provider_data)?;

        assert_eq!(fixture.console_log_calls().len(), 0);

        let pending_transaction = fixture
            .provider_data
            .sign_transaction_request(transaction)?;
        fixture
            .provider_data
            .run_call(pending_transaction, None, &StateOverrides::default())?;

        let console_log_calls = fixture.console_log_calls();
        assert_eq!(console_log_calls.len(), 1);
        assert_eq!(console_log_calls[0], expected_call_data);

        Ok(())
    }

    #[test]
    fn next_filter_id() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;

        let mut prev_filter_id = fixture.provider_data.last_filter_id;
        for _ in 0..10 {
            let filter_id = fixture.provider_data.next_filter_id();
            assert!(prev_filter_id < filter_id);
            prev_filter_id = filter_id;
        }

        Ok(())
    }

    #[test]
    fn set_balance_updates_mem_pool() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;

        let transaction = {
            let mut request = fixture.dummy_transaction_request(None);
            request.sender = fixture.impersonated_account;

            fixture.provider_data.sign_transaction_request(request)?
        };

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
        let fixture = ProviderTestFixture::new()?;

        let non_existing_tx = fixture.provider_data.transaction_by_hash(&B256::ZERO)?;

        assert!(non_existing_tx.is_none());

        Ok(())
    }

    #[test]
    fn pending_transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;

        let transaction_request = fixture.signed_dummy_transaction()?;
        let transaction_hash = fixture
            .provider_data
            .add_pending_transaction(transaction_request)?;

        let transaction_result = fixture
            .provider_data
            .transaction_by_hash(&transaction_hash)?
            .context("transaction not found")?;

        assert_eq!(
            transaction_result.signed_transaction.hash(),
            &transaction_hash
        );

        Ok(())
    }

    #[test]
    fn transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;

        let transaction_request = fixture.signed_dummy_transaction()?;
        let transaction_hash = fixture
            .provider_data
            .add_pending_transaction(transaction_request)?;

        let results = fixture.provider_data.mine_and_commit_block(None)?;

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

        assert_eq!(
            transaction_result.signed_transaction.hash(),
            &transaction_hash
        );

        Ok(())
    }

    #[test]
    fn reset_local_to_forking() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new()?;

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
        let mut fixture = ProviderTestFixture::new_forked()?;

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
}
