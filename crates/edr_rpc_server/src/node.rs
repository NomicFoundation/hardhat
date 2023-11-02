mod account;
mod node_error;

use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    remote::{
        filter::{FilteredEvents, LogOutput},
        BlockSpec, BlockTag, Eip1898BlockSpec, RpcClient,
    },
    serde::ZeroXPrefixedBytes,
    signature::Signature,
    transaction::{EthTransactionRequest, SignedTransaction},
    Address, Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{Blockchain, BlockchainError, ForkedBlockchain, LocalBlockchain, SyncBlockchain},
    mine_block,
    state::{AccountModifierFn, AccountTrie, IrregularState, StateError, SyncState, TrieState},
    AccountInfo, Block, Bytecode, CfgEnv, HashMap, HashSet, MemPool, MineBlockResult,
    MineBlockResultAndState, MineOrdering, PendingTransaction, RandomHashGenerator, KECCAK_EMPTY,
};
use indexmap::IndexMap;

use self::account::{create_accounts, InitialAccounts};
pub use self::node_error::NodeError;
use crate::{filter::Filter, Config};

pub struct Node {
    pub blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    pub state: Box<dyn SyncState<StateError>>,
    pub irregular_state: IrregularState<StateError, Box<dyn SyncState<StateError>>>,
    pub mem_pool: MemPool,
    pub network_id: u64,
    pub evm_config: CfgEnv,
    pub beneficiary: Address,
    pub min_gas_price: U256,
    pub prevrandao_generator: RandomHashGenerator,
    pub block_time_offset_seconds: u64,
    pub next_block_timestamp: Option<u64>,
    pub allow_blocks_with_same_timestamp: bool,
    // IndexMap to preserve account order for logging.
    pub local_accounts: IndexMap<Address, k256::SecretKey>,
    pub filters: HashMap<U256, Filter>,
    pub last_filter_id: U256,
    pub impersonated_accounts: HashSet<Address>,
}

impl Node {
    pub async fn new(config: &Config) -> Result<Self, NodeError> {
        let InitialAccounts {
            local_accounts,
            genesis_accounts,
        } = create_accounts(config);

        let BlockchainAndState { state, blockchain } =
            create_blockchain_and_state(config, genesis_accounts).await?;

        let evm_config = create_evm_config(config);

        let prevrandao_generator = RandomHashGenerator::with_seed("randomMixHashSeed");

        Ok(Self {
            blockchain,
            state,
            irregular_state: IrregularState::default(),
            mem_pool: MemPool::new(config.block_gas_limit),
            network_id: config.network_id,
            evm_config,
            beneficiary: config.coinbase,
            // TODO: Add config option (https://github.com/NomicFoundation/edr/issues/111)
            min_gas_price: U256::MAX,
            prevrandao_generator,
            block_time_offset_seconds: block_time_offset_seconds(config)?,
            next_block_timestamp: None,
            allow_blocks_with_same_timestamp: config.allow_blocks_with_same_timestamp,
            local_accounts,
            filters: HashMap::default(),
            last_filter_id: U256::ZERO,
            impersonated_accounts: HashSet::new(),
        })
    }

    pub fn accounts(&self) -> impl Iterator<Item = &Address> {
        self.local_accounts.keys()
    }

    pub async fn balance(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_state::<Result<U256, NodeError>>(block_spec, move |state| {
            Ok(state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })
        .await?
    }

    pub async fn block_number(&self) -> u64 {
        self.blockchain.last_block_number().await
    }

    pub fn chain_id(&self) -> u64 {
        self.evm_config.chain_id
    }

    pub fn coinbase(&self) -> Address {
        self.beneficiary
    }

    pub async fn get_code(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<ZeroXPrefixedBytes, NodeError> {
        self.execute_in_block_state::<Result<ZeroXPrefixedBytes, NodeError>>(
            block_spec,
            move |state| {
                let bytecode = state
                    .basic(address)?
                    .map_or(Ok(Bytes::new()), |account_info| {
                        state
                            .code_by_hash(account_info.code_hash)
                            .map(|bytecode| bytecode.bytecode)
                    })?;

                Ok(ZeroXPrefixedBytes::from(bytecode))
            },
        )
        .await?
    }

    pub fn get_filter_changes(&mut self, filter_id: &U256) -> Option<FilteredEvents> {
        self.filters.get_mut(filter_id).map(Filter::take_events)
    }

    pub fn get_filter_logs(
        &mut self,
        filter_id: &U256,
    ) -> Result<Option<Vec<LogOutput>>, NodeError> {
        self.filters
            .get_mut(filter_id)
            .map(|filter| {
                if let Some(events) = filter.take_log_events() {
                    Ok(events)
                } else {
                    Err(NodeError::NotLogSubscription {
                        filter_id: *filter_id,
                    })
                }
            })
            .transpose()
    }

    pub async fn get_storage_at(
        &self,
        address: Address,
        position: U256,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_state::<Result<U256, NodeError>>(block_spec, move |state| {
            Ok(state.storage(address, position)?)
        })
        .await?
    }

    pub async fn get_transaction_count(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, NodeError> {
        self.execute_in_block_state::<Result<u64, NodeError>>(block_spec, move |state| {
            let nonce = state
                .basic(address)?
                .map_or(0, |account_info| account_info.nonce);

            Ok(nonce)
        })
        .await?
    }

    pub fn impersonate_account(&mut self, address: Address) {
        self.impersonated_accounts.insert(address);
    }

    pub fn increase_block_time(&mut self, increment: u64) -> u64 {
        self.block_time_offset_seconds += increment;
        self.block_time_offset_seconds
    }

    pub fn local_accounts(&self) -> impl Iterator<Item = (&Address, &k256::SecretKey)> {
        self.local_accounts.iter()
    }

    pub async fn mine_and_commit_block(
        &mut self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError>, NodeError> {
        let (block_timestamp, new_offset) = self.next_block_timestamp(timestamp).await?;
        let prevrandao = if self.evm_config.spec_id >= SpecId::MERGE {
            Some(self.prevrandao_generator.next_value())
        } else {
            None
        };

        let result = self.mine_block(block_timestamp, prevrandao).await?;

        if let Some(new_offset) = new_offset {
            self.block_time_offset_seconds = new_offset;
        }

        // Reset next block time stamp
        self.next_block_timestamp.take();

        let block = self
            .blockchain
            .insert_block(result.block, result.state_diff)
            .await
            .map_err(NodeError::Blockchain)?;

        self.mem_pool
            .update(&result.state)
            .map_err(NodeError::MemPoolUpdate)?;

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

    pub fn send_transaction(
        &mut self,
        transaction_request: EthTransactionRequest,
    ) -> Result<B256, NodeError> {
        let signed_transaction = self.sign_transaction_request(transaction_request)?;

        self.add_pending_transaction(signed_transaction)
    }

    pub fn send_raw_transaction(&mut self, raw_transaction: &[u8]) -> Result<B256, NodeError> {
        let signed_transaction: SignedTransaction = rlp::decode(raw_transaction)?;

        self.add_pending_transaction(signed_transaction)
    }

    pub async fn set_balance(&mut self, address: Address, balance: U256) -> Result<(), NodeError> {
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

        let block_number = self.blockchain.last_block_number().await;
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_code(&mut self, address: Address, code: Bytes) -> Result<(), NodeError> {
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

        let block_number = self.blockchain.last_block_number().await;
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    /// Set the next block timestamp.
    pub async fn set_next_block_timestamp(&mut self, timestamp: u64) -> Result<u64, NodeError> {
        use std::cmp::Ordering;

        let latest_block = self.blockchain.last_block().await?;
        let latest_block_header = latest_block.header();

        match timestamp.cmp(&latest_block_header.timestamp) {
            Ordering::Less => Err(NodeError::TimestampLowerThanPrevious {
                proposed: timestamp,
                previous: latest_block_header.timestamp,
            }),
            Ordering::Equal => Err(NodeError::TimestampEqualsPrevious {
                proposed: timestamp,
            }),
            Ordering::Greater => {
                self.next_block_timestamp = Some(timestamp);
                Ok(timestamp)
            }
        }
    }

    pub async fn set_nonce(&mut self, address: Address, nonce: u64) -> Result<(), NodeError> {
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

        let block_number = self.blockchain.last_block_number().await;
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), NodeError> {
        self.state.set_account_storage_slot(address, index, value)?;

        let block_number = self.blockchain.last_block_number().await;
        let state = self.state.clone();
        self.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub fn sign(
        &self,
        address: &Address,
        message: ZeroXPrefixedBytes,
    ) -> Result<Signature, NodeError> {
        match self.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&Bytes::from(message)[..], secret_key)?),
            None => Err(NodeError::UnknownAddress { address: *address }),
        }
    }

    pub fn stop_impersonating_account(&mut self, address: Address) -> bool {
        self.impersonated_accounts.remove(&address)
    }

    fn add_pending_transaction(
        &mut self,
        transaction: SignedTransaction,
    ) -> Result<B256, NodeError> {
        let transaction_hash = *transaction.hash();

        let pending_transaction =
            PendingTransaction::new(&self.state, self.evm_config.spec_id, transaction)?;

        // Handles validation
        self.mem_pool
            .add_transaction(&self.state, pending_transaction)?;

        for filter in self.filters.values_mut() {
            if let FilteredEvents::NewPendingTransactions(events) = &mut filter.events {
                events.push(transaction_hash);
            }
        }

        Ok(transaction_hash)
    }

    async fn execute_in_block_state<T>(
        &self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(Box<dyn SyncState<StateError>>) -> T,
    ) -> Result<T, NodeError> {
        let contextual_state = self.state_by_block_spec(block_spec).await?;

        // Execute function in the requested block context.
        let result = function(contextual_state);

        Ok(result)
    }

    /// Mine a block at a specific timestamp
    async fn mine_block(
        &self,
        timestamp: u64,
        prevrandao: Option<B256>,
    ) -> Result<MineBlockResultAndState<StateError>, NodeError> {
        // TODO: when we support hardhat_setNextBlockBaseFeePerGas, incorporate
        // the last-passed value here. (but don't .take() it yet, because we only
        // want to clear it if the block mining is successful.
        // https://github.com/NomicFoundation/edr/issues/145
        let base_fee = None;

        // TODO: https://github.com/NomicFoundation/edr/issues/156
        let reward = U256::ZERO;

        let result = mine_block(
            &*self.blockchain,
            self.state.clone(),
            &self.mem_pool,
            &self.evm_config,
            timestamp,
            self.beneficiary,
            self.min_gas_price,
            // TODO: make this configurable (https://github.com/NomicFoundation/edr/issues/111)
            MineOrdering::Fifo,
            reward,
            base_fee,
            prevrandao,
            None,
        )
        .await?;

        // TODO: when we support hardhat_setNextBlockBaseFeePerGas, reset the user
        // provided next block base fee per gas to `None`
        // https://github.com/NomicFoundation/edr/issues/145

        Ok(result)
    }

    /// Mines a pending block, without modifying any values.
    async fn mine_pending_block(&self) -> Result<MineBlockResultAndState<StateError>, NodeError> {
        let (block_timestamp, _new_offset) = self.next_block_timestamp(None).await?;
        let prevrandao = if self.evm_config.spec_id >= SpecId::MERGE {
            Some(self.prevrandao_generator.seed())
        } else {
            None
        };

        self.mine_block(block_timestamp, prevrandao).await
    }

    /// Get the timestamp for the next block.
    /// Ported from <https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/node.ts#L1942>
    async fn next_block_timestamp(
        &self,
        timestamp: Option<u64>,
    ) -> Result<(u64, Option<u64>), NodeError> {
        let latest_block = self.blockchain.last_block().await?;
        let latest_block_header = latest_block.header();

        let current_timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let (mut block_timestamp, new_offset) = if let Some(timestamp) = timestamp {
            timestamp.checked_sub(latest_block_header.timestamp).ok_or(
                NodeError::TimestampLowerThanPrevious {
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
        transaction: EthTransactionRequest,
    ) -> Result<SignedTransaction, NodeError> {
        let secret_key =
            self.local_accounts
                .get(&transaction.from)
                .ok_or(NodeError::UnknownAddress {
                    address: transaction.from,
                })?;

        let typed_transaction = transaction
            .into_typed_request()
            .ok_or(NodeError::InvalidTransactionRequest)?;

        // TODO handle transactions from impersonated accounts
        // https://github.com/NomicFoundation/edr/issues/222
        Ok(typed_transaction.sign(secret_key)?)
    }

    async fn state_by_block_spec(
        &self,
        block_spec: Option<&BlockSpec>,
    ) -> Result<Box<dyn SyncState<StateError>>, NodeError> {
        let block = if let Some(block_spec) = block_spec {
            match block_spec {
                BlockSpec::Number(block_number) => self
                    .blockchain
                    .block_by_number(*block_number)
                    .await?
                    .ok_or(NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    })?,
                BlockSpec::Tag(BlockTag::Earliest) => self
                    .blockchain
                    .block_by_number(0)
                    .await?
                    .expect("genesis block should always exist"),
                // Matching Hardhat behaviour by returning the last block for finalized and safe.
                // https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1395
                BlockSpec::Tag(BlockTag::Finalized | BlockTag::Safe | BlockTag::Latest) => {
                    self.blockchain.last_block().await?
                }
                BlockSpec::Tag(BlockTag::Pending) => {
                    let result = self.mine_pending_block().await?;
                    return Ok(result.state);
                }
                BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                    block_hash,
                    require_canonical: _,
                }) => self.blockchain.block_by_hash(block_hash).await?.ok_or(
                    NodeError::UnknownBlockHash {
                        block_hash: *block_hash,
                    },
                )?,
                BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => self
                    .blockchain
                    .block_by_number(*block_number)
                    .await?
                    .ok_or(NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    })?,
            }
        } else {
            self.blockchain.last_block().await?
        };

        let block_header = block.header();

        let contextual_state = if let Some(irregular_state) = self
            .irregular_state
            .state_by_block_number(block_header.number)
            .cloned()
        {
            irregular_state
        } else {
            self.blockchain
                .state_at_block_number(block_header.number)
                .await?
        };

        Ok(contextual_state)
    }
}

fn block_time_offset_seconds(config: &Config) -> Result<u64, NodeError> {
    config.initial_date.map_or(Ok(0), |initial_date| {
        Ok(SystemTime::now()
            .duration_since(initial_date)
            .map_err(|_e| NodeError::InitialDateInFuture(initial_date))?
            .as_secs())
    })
}

struct BlockchainAndState {
    blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    state: Box<dyn SyncState<StateError>>,
}

async fn create_blockchain_and_state(
    config: &Config,
    genesis_accounts: HashMap<Address, AccountInfo>,
) -> Result<BlockchainAndState, NodeError> {
    if let Some(fork_config) = &config.rpc_hardhat_network_config.forking {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()
            .expect("failed to construct async runtime");

        let state_root_generator = Arc::new(parking_lot::Mutex::new(
            RandomHashGenerator::with_seed("seed"),
        ));

        let rpc_client = RpcClient::new(&fork_config.json_rpc_url, config.cache_dir.clone());

        let blockchain = ForkedBlockchain::new(
            runtime.handle().clone(),
            config.hardfork,
            rpc_client,
            fork_config.block_number,
            state_root_generator,
            genesis_accounts,
            // TODO: make hardfork activations configurable (https://github.com/NomicFoundation/edr/issues/111)
            HashMap::new(),
        )
        .await?;

        let fork_block_number = blockchain.last_block_number().await;

        let state = blockchain
            .state_at_block_number(fork_block_number)
            .await
            .expect("Fork state must exist");

        Ok(BlockchainAndState {
            state: Box::new(state),
            blockchain: Box::new(blockchain),
        })
    } else {
        let state = TrieState::with_accounts(AccountTrie::with_accounts(&genesis_accounts));

        let blockchain = LocalBlockchain::new(
            state,
            config.chain_id,
            config.hardfork,
            config.gas,
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
            .await
            .expect("Genesis state must exist");

        Ok(BlockchainAndState {
            state,
            blockchain: Box::new(blockchain),
        })
    }
}

fn create_evm_config(config: &Config) -> CfgEnv {
    let mut evm_config = CfgEnv::default();
    evm_config.chain_id = config.chain_id;
    evm_config.spec_id = config.hardfork;
    evm_config.limit_contract_code_size = if config.allow_unlimited_contract_size {
        Some(usize::MAX)
    } else {
        None
    };
    evm_config
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use tempfile::TempDir;

    use super::*;
    use crate::{create_test_config, Config};

    struct NodeTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        config: Config,
        node_data: Node,
    }

    impl NodeTestFixture {
        pub(crate) async fn new() -> Result<Self> {
            let cache_dir = TempDir::new().expect("should create temp dir");
            let config = create_test_config(cache_dir.path().to_path_buf());
            let node_data = Node::new(&config).await?;

            Ok(Self {
                _cache_dir: cache_dir,
                config,
                node_data,
            })
        }

        fn dummy_transaction_request(&self) -> EthTransactionRequest {
            EthTransactionRequest {
                from: *self.node_data.local_accounts.keys().next().unwrap(),
                to: Some(Address::zero()),
                gas: Some(100_000),
                gas_price: Some(U256::from(1)),
                value: Some(U256::from(1)),
                data: None,
                nonce: None,
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                access_list: None,
                transaction_type: None,
            }
        }

        fn signed_dummy_transaction(&self) -> Result<SignedTransaction> {
            let transaction = self.dummy_transaction_request();
            Ok(self.node_data.sign_transaction_request(transaction)?)
        }
    }

    #[tokio::test]
    async fn add_pending_transaction() -> Result<()> {
        let mut fixture = NodeTestFixture::new().await?;
        let transaction = fixture.signed_dummy_transaction()?;

        let filter_id = fixture.node_data.new_pending_transaction_filter();

        let transaction_hash = fixture.node_data.add_pending_transaction(transaction)?;

        assert!(fixture
            .node_data
            .mem_pool
            .transaction_by_hash(&transaction_hash)
            .is_some());

        match fixture.node_data.get_filter_changes(&filter_id).unwrap() {
            FilteredEvents::NewPendingTransactions(hashes) => {
                assert!(hashes.contains(&transaction_hash));
            }
            _ => panic!("expected pending transaction"),
        };

        Ok(())
    }

    #[tokio::test]
    async fn chain_id() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let chain_id = fixture.node_data.chain_id();
        assert_eq!(chain_id, fixture.config.chain_id);

        Ok(())
    }

    #[tokio::test]
    async fn next_filter_id() -> Result<()> {
        let mut fixture = NodeTestFixture::new().await?;

        let mut prev_filter_id = fixture.node_data.last_filter_id;
        for _ in 0..10 {
            let filter_id = fixture.node_data.next_filter_id();
            assert!(prev_filter_id < filter_id);
            prev_filter_id = filter_id;
        }

        Ok(())
    }
}
