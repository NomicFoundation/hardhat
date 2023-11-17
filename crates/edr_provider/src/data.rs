mod account;

use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    receipt::BlockReceipt,
    remote::{
        filter::{FilteredEvents, LogOutput, SubscriptionType},
        BlockSpec, BlockTag, Eip1898BlockSpec, RpcClient,
    },
    serde::ZeroXPrefixedBytes,
    signature::Signature,
    transaction::{EthTransactionRequest, SignedTransaction},
    Address, Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{
        Blockchain, BlockchainError, ForkedBlockchain, ForkedCreationError, LocalBlockchain,
        LocalCreationError, SyncBlockchain,
    },
    mine_block,
    state::{AccountModifierFn, AccountTrie, IrregularState, StateError, SyncState, TrieState},
    AccountInfo, Block, Bytecode, CfgEnv, HashMap, HashSet, MemPool, MineBlockResult,
    MineBlockResultAndState, MineOrdering, PendingTransaction, RandomHashGenerator, SyncBlock,
    KECCAK_EMPTY,
};
use indexmap::IndexMap;
use rpc_hardhat::ForkMetadata;
use tokio::runtime;

use self::account::{create_accounts, InitialAccounts};
use crate::{filter::Filter, logger::Logger, ProviderConfig, ProviderError};

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
}

pub struct ProviderData {
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    state: Box<dyn SyncState<StateError>>,
    irregular_state: IrregularState<StateError, Box<dyn SyncState<StateError>>>,
    mem_pool: MemPool,
    network_id: u64,
    beneficiary: Address,
    min_gas_price: U256,
    prevrandao_generator: RandomHashGenerator,
    block_time_offset_seconds: u64,
    fork_metadata: Option<ForkMetadata>,
    instance_id: B256,
    is_auto_mining: bool,
    next_block_base_fee_per_gas: Option<U256>,
    next_block_timestamp: Option<u64>,
    allow_blocks_with_same_timestamp: bool,
    allow_unlimited_contract_size: bool,
    // IndexMap to preserve account order for logging.
    local_accounts: IndexMap<Address, k256::SecretKey>,
    filters: HashMap<U256, Filter>,
    last_filter_id: U256,
    logger: Logger,
    impersonated_accounts: HashSet<Address>,
}

impl ProviderData {
    pub async fn new(
        runtime: &runtime::Handle,
        config: &ProviderConfig,
    ) -> Result<Self, CreationError> {
        let InitialAccounts {
            local_accounts,
            genesis_accounts,
        } = create_accounts(config);

        let BlockchainAndState {
            blockchain,
            state,
            fork_metadata,
        } = create_blockchain_and_state(runtime, config, genesis_accounts).await?;

        let prevrandao_generator = RandomHashGenerator::with_seed("randomMixHashSeed");

        Ok(Self {
            blockchain,
            state,
            irregular_state: IrregularState::default(),
            mem_pool: MemPool::new(config.block_gas_limit),
            network_id: config.network_id,
            beneficiary: config.coinbase,
            // TODO: Add config option (https://github.com/NomicFoundation/edr/issues/111)
            min_gas_price: U256::from(1),
            prevrandao_generator,
            block_time_offset_seconds: block_time_offset_seconds(config)?,
            fork_metadata,
            instance_id: B256::random(),
            is_auto_mining: config.mining.auto_mine,
            next_block_base_fee_per_gas: None,
            next_block_timestamp: None,
            allow_blocks_with_same_timestamp: config.allow_blocks_with_same_timestamp,
            allow_unlimited_contract_size: config.allow_unlimited_contract_size,
            local_accounts,
            filters: HashMap::default(),
            last_filter_id: U256::ZERO,
            logger: Logger::new(false),
            impersonated_accounts: HashSet::new(),
        })
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
        self.execute_in_block_state::<Result<U256, ProviderError>>(block_spec, move |state| {
            Ok(state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })?
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
    /// Returns `ProviderError::InvalidBlockSpec` if the block spec is a number
    /// or a hash and the block isn't found.
    pub fn block_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, ProviderError> {
        let result = match block_spec {
            BlockSpec::Number(block_number) => Some(
                self.blockchain
                    .block_by_number(*block_number)?
                    .ok_or_else(|| ProviderError::InvalidBlockNumberOrHash(block_spec.clone()))?,
            ),
            BlockSpec::Tag(BlockTag::Earliest) => Some(
                self.blockchain
                    .block_by_number(0)?
                    .expect("genesis block should always exist"),
            ),
            // Matching Hardhat behaviour by returning the last block for finalized and safe.
            // https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1395
            BlockSpec::Tag(BlockTag::Finalized | BlockTag::Safe | BlockTag::Latest) => {
                Some(self.blockchain.last_block()?)
            }
            BlockSpec::Tag(BlockTag::Pending) => None,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash,
                require_canonical: _,
            }) => Some(
                self.blockchain
                    .block_by_hash(block_hash)?
                    .ok_or_else(|| ProviderError::InvalidBlockNumberOrHash(block_spec.clone()))?,
            ),
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Some(
                self.blockchain
                    .block_by_number(*block_number)?
                    .ok_or_else(|| ProviderError::InvalidBlockNumberOrHash(block_spec.clone()))?,
            ),
        };

        Ok(result)
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
        self.execute_in_block_state(block_spec, move |state| {
            let code = state
                .basic(address)?
                .map_or(Ok(Bytes::new()), |account_info| {
                    state
                        .code_by_hash(account_info.code_hash)
                        .map(|bytecode| bytecode.bytecode)
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
        self.execute_in_block_state::<Result<U256, ProviderError>>(block_spec, move |state| {
            Ok(state.storage(address, index)?)
        })?
    }

    pub fn get_transaction_count(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, ProviderError> {
        self.execute_in_block_state::<Result<u64, ProviderError>>(block_spec, move |state| {
            let nonce = state
                .basic(address)?
                .map_or(0, |account_info| account_info.nonce);

            Ok(nonce)
        })?
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

    pub fn logger(&self) -> &Logger {
        &self.logger
    }

    pub fn mine_and_commit_block(
        &mut self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError>, ProviderError> {
        let (block_timestamp, new_offset) = self.next_block_timestamp(timestamp)?;
        let prevrandao = if self.blockchain.spec_id() >= SpecId::MERGE {
            Some(self.prevrandao_generator.next_value())
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
        self.network_id.to_string()
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

    pub fn remove_filter(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ false>(filter_id)
    }

    pub fn remove_subscription(&mut self, filter_id: &U256) -> bool {
        self.remove_filter_impl::</* IS_SUBSCRIPTION */ true>(filter_id)
    }

    pub fn transaction_receipt(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, ProviderError> {
        self.blockchain
            .receipt_by_transaction_hash(transaction_hash)
            .map_err(ProviderError::Blockchain)
    }

    pub fn send_transaction(
        &mut self,
        transaction_request: EthTransactionRequest,
    ) -> Result<B256, ProviderError> {
        let signed_transaction = self.sign_transaction_request(transaction_request)?;

        self.add_pending_transaction(signed_transaction)
    }

    pub fn send_raw_transaction(&mut self, raw_transaction: &[u8]) -> Result<B256, ProviderError> {
        let signed_transaction: SignedTransaction = rlp::decode(raw_transaction)?;

        let pending_transaction =
            PendingTransaction::new(&self.state, self.blockchain.spec_id(), signed_transaction)?;

        self.add_pending_transaction(pending_transaction)
    }

    /// Sets whether the miner should mine automatically.
    pub fn set_auto_mining(&mut self, enabled: bool) {
        self.is_auto_mining = enabled;
    }

    pub fn set_balance(&mut self, address: Address, balance: U256) -> Result<(), ProviderError> {
        self.state.modify_account(
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
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        self.mem_pool.update(&self.state)?;

        Ok(())
    }

    pub fn set_code(&mut self, address: Address, code: Bytes) -> Result<(), ProviderError> {
        let default_code = code.clone();
        self.state.modify_account(
            address,
            AccountModifierFn::new(Box::new(move |_, _, account_code| {
                *account_code = Some(Bytecode::new_raw(code.clone()));
            })),
            &|| {
                Ok(AccountInfo {
                    balance: U256::ZERO,
                    nonce: 0,
                    code: Some(Bytecode::new_raw(default_code.clone())),
                    code_hash: KECCAK_EMPTY,
                })
            },
        )?;

        let block_number = self.blockchain.last_block_number();
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

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
        use std::cmp::Ordering;

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
        self.prevrandao_generator.set_next(prev_randao);
    }

    pub fn set_nonce(&mut self, address: Address, nonce: u64) -> Result<(), ProviderError> {
        self.state.modify_account(
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
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

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

        let block_number = self.blockchain.last_block_number();
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub fn sign(
        &self,
        address: &Address,
        message: ZeroXPrefixedBytes,
    ) -> Result<Signature, ProviderError> {
        match self.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&Bytes::from(message)[..], secret_key)?),
            None => Err(ProviderError::UnknownAddress { address: *address }),
        }
    }

    pub fn spec_id(&self) -> SpecId {
        self.blockchain.spec_id()
    }

    pub fn stop_impersonating_account(&mut self, address: Address) -> bool {
        self.impersonated_accounts.remove(&address)
    }

    /// Get a transaction by hash from the blockchain or from the mempool if
    /// it's not mined yet.
    pub fn transaction_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<GetTransactionResult>, ProviderError> {
        let transaction = if let Some(tx) = self.mem_pool.transaction_by_hash(hash) {
            let signed_transaction = tx.pending().transaction().clone();

            Some(GetTransactionResult {
                signed_transaction,
                spec_id: self.blockchain.spec_id(),
                block_metadata: None,
            })
        } else if let Some(tx_block) = self.blockchain.block_by_transaction_hash(hash)? {
            let tx_index = self
                .blockchain
                .receipt_by_transaction_hash(hash)?
                .expect("If the transaction was inserted in a block, it must have a receipt")
                .transaction_index;

            let tx_index =
                usize::try_from(tx_index).expect("Indices cannot be larger than usize::MAX");

            transaction_from_block(&tx_block, tx_index, self.spec_id())
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

    fn create_evm_config(&self) -> CfgEnv {
        let mut evm_config = CfgEnv::default();
        evm_config.chain_id = self.blockchain.chain_id();
        evm_config.spec_id = self.blockchain.spec_id();
        evm_config.limit_contract_code_size = if self.allow_unlimited_contract_size {
            Some(usize::MAX)
        } else {
            None
        };
        evm_config
    }

    fn execute_in_block_state<T>(
        &self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(Box<dyn SyncState<StateError>>) -> T,
    ) -> Result<T, ProviderError> {
        let contextual_state = self.state_by_block_spec(block_spec)?;

        // Execute function in the requested block context.
        let result = function(contextual_state);

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

        let evm_config = self.create_evm_config();

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
            self.next_block_base_fee_per_gas,
            prevrandao,
            None,
        )?;

        Ok(result)
    }

    /// Mines a pending block, without modifying any values.
    pub fn mine_pending_block(&self) -> Result<MineBlockResultAndState<StateError>, ProviderError> {
        let (block_timestamp, _new_offset) = self.next_block_timestamp(None)?;
        let prevrandao = if self.blockchain.spec_id() >= SpecId::MERGE {
            Some(self.prevrandao_generator.seed())
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
        transaction_request: EthTransactionRequest,
    ) -> Result<PendingTransaction, ProviderError> {
        let sender = transaction_request.from;

        let typed_transaction = transaction_request
            .into_typed_request()
            .ok_or(ProviderError::InvalidTransactionRequest)?;

        if self.impersonated_accounts.contains(&sender) {
            let signed_transaction = typed_transaction.fake_sign(&sender);

            Ok(PendingTransaction::with_caller(
                &*self.state,
                self.blockchain.spec_id(),
                signed_transaction,
                sender,
            )?)
        } else {
            let secret_key = self
                .local_accounts
                .get(&sender)
                .ok_or(ProviderError::UnknownAddress { address: sender })?;

            let signed_transaction = typed_transaction.sign(secret_key)?;
            Ok(PendingTransaction::new(
                &*self.state,
                self.blockchain.spec_id(),
                signed_transaction,
            )?)
        }
    }

    fn state_by_block_spec(
        &self,
        block_spec: Option<&BlockSpec>,
    ) -> Result<Box<dyn SyncState<StateError>>, ProviderError> {
        let block = if let Some(block_spec) = block_spec {
            if let Some(block) = self.block_by_block_spec(block_spec)? {
                block
            } else {
                // Block spec is pending
                let result = self.mine_pending_block()?;
                return Ok(result.state);
            }
        } else {
            self.blockchain.last_block()?
        };

        let block_header = block.header();

        let contextual_state = if let Some(irregular_state) = self
            .irregular_state
            .state_by_block_number(block_header.number)
            .cloned()
        {
            irregular_state
        } else {
            self.blockchain.state_at_block_number(block_header.number)?
        };

        Ok(contextual_state)
    }
}

pub fn transaction_from_block(
    block: &Arc<dyn SyncBlock<Error = BlockchainError>>,
    index: usize,
    spec_id: SpecId,
) -> Option<GetTransactionResult> {
    block.transactions().get(index).map(|tx| {
        let block_metadata = BlockMetadataForTransaction {
            base_fee_per_gas: block.header().base_fee_per_gas,
            block_hash: *block.hash(),
            block_number: block.header().number,
            transaction_index: index.try_into().expect("usize fits into u64"),
        };

        GetTransactionResult {
            signed_transaction: tx.clone(),
            spec_id,
            block_metadata: Some(block_metadata),
        }
    })
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
}

async fn create_blockchain_and_state(
    runtime: &runtime::Handle,
    config: &ProviderConfig,
    genesis_accounts: HashMap<Address, AccountInfo>,
) -> Result<BlockchainAndState, CreationError> {
    if let Some(fork_config) = &config.fork {
        let state_root_generator = Arc::new(parking_lot::Mutex::new(
            RandomHashGenerator::with_seed("seed"),
        ));

        let rpc_client = RpcClient::new(&fork_config.json_rpc_url, config.cache_dir.clone());

        let blockchain = ForkedBlockchain::new(
            runtime.clone(),
            config.hardfork,
            rpc_client,
            fork_config.block_number,
            state_root_generator,
            genesis_accounts,
            // TODO: make hardfork activations configurable (https://github.com/NomicFoundation/edr/issues/111)
            HashMap::new(),
        )
        .await?;

        let fork_block_number = blockchain.last_block_number();

        let state = blockchain
            .state_at_block_number(fork_block_number)
            .expect("Fork state must exist");

        Ok(BlockchainAndState {
            state: Box::new(state),
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
        })
    } else {
        let state = TrieState::with_accounts(AccountTrie::with_accounts(&genesis_accounts));

        let blockchain = LocalBlockchain::new(
            state,
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
        )?;

        let state = blockchain
            .state_at_block_number(0)
            .expect("Genesis state must exist");

        Ok(BlockchainAndState {
            state,
            fork_metadata: None,
            blockchain: Box::new(blockchain),
        })
    }
}

/// The result returned by requesting a transaction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetTransactionResult {
    /// The signed transaction.
    pub signed_transaction: SignedTransaction,
    /// Information about the active hardforks.
    pub spec_id: SpecId,
    /// The block metadata for the transaction. None if the transaction is
    /// pending.
    pub block_metadata: Option<BlockMetadataForTransaction>,
}

/// Block metadata for a transaction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockMetadataForTransaction {
    pub base_fee_per_gas: Option<U256>,
    pub block_hash: B256,
    pub block_number: u64,
    pub transaction_index: u64,
}

#[cfg(test)]
mod tests {
    use anyhow::Context;
    use tempfile::TempDir;

    use super::*;
    use crate::{test_utils::create_test_config_with_impersonated_accounts, ProviderConfig};

    struct ProviderTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        config: ProviderConfig,
        provider_data: ProviderData,
        impersonated_account: Address,
    }

    impl ProviderTestFixture {
        pub(crate) async fn new() -> anyhow::Result<Self> {
            let cache_dir = TempDir::new()?;

            let impersonated_account = Address::random();
            let config = create_test_config_with_impersonated_accounts(
                cache_dir.path().to_path_buf(),
                vec![impersonated_account],
            );

            let runtime = runtime::Handle::try_current()?;
            let mut provider_data = ProviderData::new(&runtime, &config).await?;
            provider_data
                .impersonated_accounts
                .insert(impersonated_account);

            Ok(Self {
                _cache_dir: cache_dir,
                config,
                provider_data,
                impersonated_account,
            })
        }

        fn dummy_transaction_request(&self) -> EthTransactionRequest {
            EthTransactionRequest {
                from: *self
                    .provider_data
                    .local_accounts
                    .keys()
                    .next()
                    .expect("there are local accounts"),
                to: Some(Address::zero()),
                gas: Some(100_000),
                gas_price: Some(U256::from(42_000_000_000_u64)),
                value: Some(U256::from(1)),
                data: None,
                nonce: None,
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                access_list: None,
                transaction_type: None,
            }
        }

        fn signed_dummy_transaction(&self) -> anyhow::Result<PendingTransaction> {
            let transaction = self.dummy_transaction_request();
            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }

        fn impersonated_dummy_transaction(&self) -> anyhow::Result<PendingTransaction> {
            let mut transaction = self.dummy_transaction_request();

            transaction.from = self.impersonated_account;

            Ok(self.provider_data.sign_transaction_request(transaction)?)
        }
    }

    #[tokio::test]
    async fn test_sign_transaction_request() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

        let transaction = fixture.signed_dummy_transaction()?;
        let recovered_address = transaction.recover()?;

        assert!(fixture
            .provider_data
            .local_accounts
            .contains_key(&recovered_address));

        Ok(())
    }

    #[tokio::test]
    async fn test_sign_transaction_request_impersonated_account() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

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

    #[tokio::test]
    async fn add_pending_transaction() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;
        let transaction = fixture.signed_dummy_transaction()?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[tokio::test]
    async fn add_pending_transaction_from_impersonated_account() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;
        let transaction = fixture.impersonated_dummy_transaction()?;

        test_add_pending_transaction(&mut fixture, transaction)
    }

    #[tokio::test]
    async fn block_by_block_spec_earliest() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

        let block_spec = BlockSpec::Tag(BlockTag::Earliest);

        let block = fixture
            .provider_data
            .block_by_block_spec(&block_spec)?
            .context("block should exist")?;

        assert_eq!(block.header().number, 0);

        Ok(())
    }

    #[tokio::test]
    async fn block_by_block_spec_finalized_safe_latest() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

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

    #[tokio::test]
    async fn block_by_block_spec_pending() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

        let block_spec = BlockSpec::Tag(BlockTag::Pending);

        let block = fixture.provider_data.block_by_block_spec(&block_spec)?;

        assert!(block.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn chain_id() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

        let chain_id = fixture.provider_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[tokio::test]
    async fn next_filter_id() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

        let mut prev_filter_id = fixture.provider_data.last_filter_id;
        for _ in 0..10 {
            let filter_id = fixture.provider_data.next_filter_id();
            assert!(prev_filter_id < filter_id);
            prev_filter_id = filter_id;
        }

        Ok(())
    }

    #[tokio::test]
    async fn set_balance_updates_mem_pool() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

        let transaction = {
            let mut request = fixture.dummy_transaction_request();
            request.from = fixture.impersonated_account;

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

    #[tokio::test]
    async fn set_nonce_updates_mem_pool() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

        // Artificially raise the nonce, to ensure the transaction is not rejected
        fixture
            .provider_data
            .set_nonce(fixture.impersonated_account, 1)?;

        let transaction = {
            let mut request = fixture.dummy_transaction_request();
            request.from = fixture.impersonated_account;
            request.nonce = Some(1);

            fixture.provider_data.sign_transaction_request(request)?
        };

        let transaction_hash = fixture.provider_data.add_pending_transaction(transaction)?;

        assert!(fixture
            .provider_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_some());

        // The transaction is a pending transaction, as the nonce is the same as the
        // account
        assert!(fixture.provider_data.mem_pool.has_pending_transactions());
        assert!(!fixture.provider_data.mem_pool.has_future_transactions());

        // Lower the nonce, to ensure the transaction is not rejected
        fixture
            .provider_data
            .set_nonce(fixture.impersonated_account, 0)?;

        assert!(fixture
            .provider_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_some());

        // The pending transaction now is a future transaction, as there is not enough
        // balance
        assert!(!fixture.provider_data.mem_pool.has_pending_transactions());
        assert!(fixture.provider_data.mem_pool.has_future_transactions());

        Ok(())
    }

    #[tokio::test]
    async fn transaction_by_invalid_hash() -> anyhow::Result<()> {
        let fixture = ProviderTestFixture::new().await?;

        let non_existing_tx = fixture.provider_data.transaction_by_hash(&B256::zero())?;

        assert_eq!(non_existing_tx, None);

        Ok(())
    }

    #[tokio::test]
    async fn pending_transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

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

    #[tokio::test]
    async fn transaction_by_hash() -> anyhow::Result<()> {
        let mut fixture = ProviderTestFixture::new().await?;

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
}
