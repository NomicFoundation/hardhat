use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    remote::{filter::FilteredEvents, BlockSpec, BlockTag, Eip1898BlockSpec, RpcClient},
    signature::public_key_to_address,
    transaction::EthTransactionRequest,
    Address, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{Blockchain, BlockchainError, ForkedBlockchain, LocalBlockchain, SyncBlockchain},
    mine_block,
    state::{AccountTrie, IrregularState, StateError, SyncState, TrieState},
    AccountInfo, Block, CfgEnv, HashMap, HashSet, MemPool, MineBlockResultAndState, MineOrdering,
    PendingTransaction, RandomHashGenerator, KECCAK_EMPTY,
};
use indexmap::IndexMap;

use crate::{filter::Filter, node::node_error::NodeError, AccountConfig, Config};

pub(super) struct NodeData {
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

impl NodeData {
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
}

// Implement methods on `NodeData` as opposed to on `Node` that are helper
// methods for methods on `Node` as these helper methods shouldn't try to
// acquire the lock in `Node`. That would lead to deadlocks.
impl NodeData {
    pub fn add_pending_transaction(
        &mut self,
        transaction: PendingTransaction,
    ) -> Result<B256, NodeError> {
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

    pub async fn state_by_block_spec(
        &mut self,
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

    pub fn get_account_info(&self, address: Address) -> Result<AccountInfo, NodeError> {
        match self.state.basic(address)? {
            Some(account_info) => Ok(account_info),
            None => Ok(AccountInfo {
                balance: U256::ZERO,
                nonce: 0,
                code: None,
                code_hash: KECCAK_EMPTY,
            }),
        }
    }

    pub fn get_filter_changes(&mut self, filter_id: &U256) -> Option<FilteredEvents> {
        self.filters.get_mut(filter_id).map(Filter::take_events)
    }

    pub fn get_signed_transaction(
        &self,
        transaction_request: EthTransactionRequest,
    ) -> Result<PendingTransaction, NodeError> {
        let sender = transaction_request.from;

        let typed_transaction = transaction_request
            .into_typed_request()
            .ok_or(NodeError::InvalidTransactionRequest)?;

        if self.impersonated_accounts.contains(&sender) {
            let signed_transaction = typed_transaction.fake_sign(&sender);

            Ok(PendingTransaction::with_caller(
                &*self.state,
                self.evm_config.spec_id,
                signed_transaction,
                sender,
            )?)
        } else {
            let secret_key = self
                .local_accounts
                .get(&sender)
                .ok_or(NodeError::UnknownAddress { address: sender })?;

            let signed_transaction = typed_transaction.sign(secret_key)?;
            Ok(PendingTransaction::new(
                &*self.state,
                self.evm_config.spec_id,
                signed_transaction,
            )?)
        }
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

    pub fn next_filter_id(&mut self) -> U256 {
        self.last_filter_id = self
            .last_filter_id
            .checked_add(U256::from(1))
            .expect("filter id starts at zero, so it'll never overflow for U256");
        self.last_filter_id
    }

    /// Get the timestamp for the next block.
    /// Ported from <https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/node.ts#L1942>
    pub async fn next_block_timestamp(
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

    /// Mine a block at a specific timestamp
    pub async fn mine_block(
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

    pub async fn remove_filter<const IS_SUBSCRIPTION: bool>(&mut self, filter_id: &U256) -> bool {
        if let Some(filter) = self.filters.get(filter_id) {
            filter.is_subscription == IS_SUBSCRIPTION && self.filters.remove(filter_id).is_some()
        } else {
            false
        }
    }
}

struct InitialAccounts {
    local_accounts: IndexMap<Address, k256::SecretKey>,
    genesis_accounts: HashMap<Address, AccountInfo>,
}

fn create_accounts(config: &Config) -> InitialAccounts {
    let mut local_accounts = IndexMap::default();
    let mut genesis_accounts = config.genesis_accounts.clone();

    for account_config in &config.accounts {
        let AccountConfig {
            secret_key,
            balance,
        } = account_config;
        let address = public_key_to_address(secret_key.public_key());
        let genesis_account = AccountInfo {
            balance: *balance,
            nonce: 0,
            code: None,
            code_hash: KECCAK_EMPTY,
        };

        local_accounts.insert(address, secret_key.clone());
        genesis_accounts.insert(address, genesis_account);
    }

    InitialAccounts {
        local_accounts,
        genesis_accounts,
    }
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

fn block_time_offset_seconds(config: &Config) -> Result<u64, NodeError> {
    config.initial_date.map_or(Ok(0), |initial_date| {
        Ok(SystemTime::now()
            .duration_since(initial_date)
            .map_err(|_e| NodeError::InitialDateInFuture(initial_date))?
            .as_secs())
    })
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
    use crate::config::test_tools::create_test_config_with_impersonated_accounts;

    struct NodeDataTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        node_data: NodeData,
        impersonated_account: Address,
    }

    impl NodeDataTestFixture {
        async fn new() -> Result<Self> {
            let cache_dir = TempDir::new()?;

            let impersonated_account = Address::random();
            let config = create_test_config_with_impersonated_accounts(
                cache_dir.path().to_path_buf(),
                vec![impersonated_account],
            );

            let mut node_data = NodeData::new(&config).await?;
            node_data.impersonated_accounts.insert(impersonated_account);

            Ok(Self {
                _cache_dir: cache_dir,
                impersonated_account,
                node_data,
            })
        }

        fn dummy_transaction_request(&self) -> EthTransactionRequest {
            EthTransactionRequest {
                from: *self
                    .node_data
                    .local_accounts
                    .keys()
                    .next()
                    .expect("there are local accounts"),
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

        fn signed_dummy_transaction(&self) -> Result<PendingTransaction> {
            let transaction = self.dummy_transaction_request();
            Ok(self.node_data.get_signed_transaction(transaction)?)
        }

        fn impersonated_dummy_transaction(&self) -> Result<PendingTransaction> {
            let mut transaction = self.dummy_transaction_request();

            transaction.from = self.impersonated_account;

            Ok(self.node_data.get_signed_transaction(transaction)?)
        }
    }

    #[tokio::test]
    async fn test_get_signed_transaction() -> Result<()> {
        let fixture = NodeDataTestFixture::new().await?;

        let transaction = fixture.signed_dummy_transaction()?;
        let recovered_address = transaction.recover()?;

        assert!(fixture
            .node_data
            .local_accounts
            .contains_key(&recovered_address));

        Ok(())
    }

    #[tokio::test]
    async fn test_get_signed_transaction_impersonated_account() -> Result<()> {
        let fixture = NodeDataTestFixture::new().await?;

        let transaction = fixture.impersonated_dummy_transaction()?;

        assert_eq!(transaction.caller(), &fixture.impersonated_account);

        Ok(())
    }

    fn test_add_pending_transaction(
        mut fixture: NodeDataTestFixture,
        transaction: PendingTransaction,
    ) -> Result<()> {
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
    async fn add_pending_transaction() -> Result<()> {
        let fixture = NodeDataTestFixture::new().await?;
        let transaction = fixture.signed_dummy_transaction()?;

        test_add_pending_transaction(fixture, transaction)
    }

    #[tokio::test]
    async fn add_pending_transaction_from_impersonated_account() -> Result<()> {
        let fixture = NodeDataTestFixture::new().await?;
        let transaction = fixture.impersonated_dummy_transaction()?;

        test_add_pending_transaction(fixture, transaction)
    }

    #[tokio::test]
    async fn next_filter_id() -> Result<()> {
        let mut fixture = NodeDataTestFixture::new().await?;

        let mut prev_filter_id = fixture.node_data.last_filter_id;
        for _ in 0..10 {
            let filter_id = fixture.node_data.next_filter_id();
            assert!(prev_filter_id < filter_id);
            prev_filter_id = filter_id;
        }

        Ok(())
    }
}
