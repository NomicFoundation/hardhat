mod node_data;
mod node_error;

use std::{mem, sync::Arc};

use edr_eth::{
    receipt::BlockReceipt,
    remote::{
        filter::{FilteredEvents, LogOutput},
        BlockSpec, BlockTag,
    },
    serde::ZeroXPrefixedBytes,
    signature::Signature,
    transaction::SignedTransaction,
    Address, Bytes, B256, U256, U64,
};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{AccountModifierFn, StateError},
    AccountInfo, Block, Bytecode, MineBlockResult, SyncBlock, KECCAK_EMPTY,
};
use k256::SecretKey;
use tokio::sync::Mutex;

pub use self::node_error::NodeError;
use crate::{filter::Filter, node::node_data::NodeData, Config};

pub struct Node {
    data: Mutex<NodeData>,
}

impl Node {
    pub async fn new(config: &Config) -> Result<Self, NodeError> {
        let node_data = NodeData::new(config).await?;
        Ok(Self {
            data: Mutex::new(node_data),
        })
    }

    async fn lock_data(&self) -> tokio::sync::MutexGuard<'_, NodeData> {
        self.data.lock().await
    }

    async fn execute_in_block_context<T>(
        &self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(&mut NodeData) -> T,
    ) -> Result<T, NodeError> {
        let mut data = self.lock_data().await;

        let block = if let Some(block_spec) = block_spec {
            data.block_by_block_spec(block_spec).await?
        } else {
            data.blockchain.last_block().await?
        };

        let block_header = block.header();

        let mut contextual_state = if let Some(irregular_state) = data
            .irregular_state
            .state_by_block_number(block_header.number)
            .cloned()
        {
            irregular_state
        } else {
            data.blockchain
                .state_at_block_number(block_header.number)
                .await?
        };

        mem::swap(&mut data.state, &mut contextual_state);

        // Execute function in the requested block context.
        let result = function(&mut data);

        // Reset previous state.
        mem::swap(&mut data.state, &mut contextual_state);

        Ok(result)
    }

    pub async fn accounts(&self) -> Vec<Address> {
        let node_data = self.lock_data().await;
        node_data.local_accounts.keys().copied().collect()
    }

    pub async fn balance(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node_data| {
            Ok(node_data
                .state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })
        .await?
    }

    pub async fn block_number(&self) -> u64 {
        let node_data = self.lock_data().await;
        node_data.blockchain.last_block_number().await
    }

    pub async fn chain_id(&self) -> U64 {
        let node_data = self.lock_data().await;
        U64::from(node_data.evm_config.chain_id)
    }

    pub async fn coinbase(&self) -> Address {
        let node_data = self.lock_data().await;
        node_data.beneficiary
    }

    pub async fn get_code(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<ZeroXPrefixedBytes, NodeError> {
        self.execute_in_block_context::<Result<ZeroXPrefixedBytes, NodeError>>(
            block_spec,
            move |node_data| {
                let account_info = node_data.get_account_info(address)?;
                let bytecode = account_info
                    .code
                    .map_or_else::<Result<Bytes, NodeError>, _, _>(
                        || {
                            Ok(node_data
                                .state
                                .code_by_hash(account_info.code_hash)?
                                .bytecode)
                        },
                        |code| Ok(code.bytecode),
                    )?;
                Ok(ZeroXPrefixedBytes::from(bytecode))
            },
        )
        .await?
    }

    pub async fn get_filter_changes(&self, filter_id: &U256) -> Option<FilteredEvents> {
        let mut node_data = self.lock_data().await;

        node_data
            .filters
            .get_mut(filter_id)
            .map(Filter::take_events)
    }

    pub async fn get_filter_logs(
        &self,
        filter_id: &U256,
    ) -> Result<Option<Vec<LogOutput>>, NodeError> {
        let mut node_data = self.lock_data().await;

        node_data
            .filters
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
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node_data| {
            Ok(node_data.state.storage(address, position)?)
        })
        .await?
    }

    pub async fn get_transaction_count(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, NodeError> {
        self.execute_in_block_context::<Result<u64, NodeError>>(block_spec, move |node_data| {
            Ok(node_data.get_account_info(address)?.nonce)
        })
        .await?
    }

    pub async fn impersonate_account(&self, address: Address) {
        let mut node_data = self.lock_data().await;

        node_data.impersonated_accounts.insert(address);
    }

    pub async fn increase_block_time(&self, increment: u64) -> u64 {
        let mut node_data = self.lock_data().await;

        node_data.block_time_offset_seconds += increment;
        node_data.block_time_offset_seconds
    }

    pub async fn local_accounts(&self) -> Vec<LocalAccountInfo> {
        let node_data = self.lock_data().await;

        node_data
            .local_accounts
            .iter()
            .map(|(address, secret_key)| LocalAccountInfo {
                address: *address,
                secret_key: secret_key.clone(),
            })
            .collect()
    }

    pub async fn mine_block(
        &self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError, StateError>, NodeError> {
        let mut node_data = self.lock_data().await;
        let result = node_data.mine_block(timestamp).await?;
        Ok(result)
    }

    pub async fn network_id(&self) -> String {
        let node_data = self.lock_data().await;
        node_data.network_id.to_string()
    }

    pub async fn new_pending_transaction_filter(&self) -> U256 {
        let mut node_data = self.lock_data().await;

        let filter_id = node_data.next_filter_id();
        node_data.filters.insert(
            filter_id,
            Filter::new(
                FilteredEvents::NewPendingTransactions(Vec::new()),
                /* is_subscription */ false,
            ),
        );
        filter_id
    }

    pub async fn remove_filter(&self, filter_id: &U256) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.remove_filter::</* IS_SUBSCRIPTION */ false>(filter_id).await
    }

    pub async fn remove_subscription(&self, filter_id: &U256) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.remove_filter::</* IS_SUBSCRIPTION */ true>(filter_id).await
    }

    pub async fn set_balance(&self, address: Address, balance: U256) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data.state.modify_account(
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

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_code(&self, address: Address, code: Bytes) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        let default_code = code.clone();
        node_data.state.modify_account(
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

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    /// Set the next block timestamp.
    pub async fn set_next_block_timestamp(&self, timestamp: u64) -> Result<u64, NodeError> {
        use std::cmp::Ordering;

        let mut node_data = self.lock_data().await;

        let latest_block = node_data.blockchain.last_block().await?;
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
                node_data.next_block_timestamp = Some(timestamp);
                Ok(timestamp)
            }
        }
    }

    pub async fn set_nonce(&self, address: Address, nonce: u64) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data.state.modify_account(
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

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_account_storage_slot(
        &self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data
            .state
            .set_account_storage_slot(address, index, value)?;

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn sign(
        &self,
        address: &Address,
        message: ZeroXPrefixedBytes,
    ) -> Result<Signature, NodeError> {
        let node_data = self.lock_data().await;
        match node_data.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&Bytes::from(message)[..], secret_key)?),
            None => Err(NodeError::UnknownAddress { address: *address }),
        }
    }

    pub async fn stop_impersonating_account(&self, address: Address) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.impersonated_accounts.remove(&address)
    }

    pub async fn block_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<Arc<dyn SyncBlock<Error = BlockchainError>>, NodeError> {
        let mut node_data = self.lock_data().await;

        let block = node_data.block_by_block_spec(block_spec).await?;

        self.workaround_block_by_spec(&mut *node_data.blockchain, block_spec)
            .await?;

        Ok(block)
    }

    pub async fn block_by_hash(
        &self,
        block_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = BlockchainError>>>, BlockchainError> {
        let node_data = self.lock_data().await;

        node_data.blockchain.block_by_hash(block_hash).await
    }

    pub async fn block_transaction_count_by_hash(
        &self,
        block_hash: &B256,
    ) -> Result<Option<usize>, BlockchainError> {
        let node_data = self.lock_data().await;

        Ok(node_data
            .blockchain
            .block_by_hash(block_hash)
            .await?
            .map(|block| block.transactions().len()))
    }

    pub async fn block_transaction_count_by_block_spec(
        &self,
        block_spec: &BlockSpec,
    ) -> Result<usize, NodeError> {
        let mut node_data = self.lock_data().await;

        let count = node_data
            .block_by_block_spec(block_spec)
            .await?
            .transactions()
            .len();

        self.workaround_block_by_spec(&mut *node_data.blockchain, block_spec)
            .await?;

        Ok(count)
    }

    pub async fn transaction_by_block_hash_and_index(
        &self,
        block_hash: &B256,
        index: usize,
    ) -> Result<Option<SignedTransaction>, BlockchainError> {
        let node_data = self.lock_data().await;

        Ok(node_data
            .blockchain
            .block_by_hash(block_hash)
            .await?
            .and_then(|block| block.transactions().get(index).cloned()))
    }

    pub async fn transaction_by_block_spec_and_index(
        &self,
        block_spec: &BlockSpec,
        index: usize,
    ) -> Result<Option<SignedTransaction>, NodeError> {
        let mut node_data = self.lock_data().await;

        let tx = node_data
            .block_by_block_spec(block_spec)
            .await?
            .transactions()
            .get(index)
            .cloned();

        self.workaround_block_by_spec(&mut *node_data.blockchain, block_spec)
            .await?;

        Ok(tx)
    }

    pub async fn transaction_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<SignedTransaction>, BlockchainError> {
        let node_data = self.lock_data().await;

        let transaction = if let Some(tx) = node_data.mem_pool.transaction_by_hash(hash) {
            Some(tx.transaction().transaction().clone())
        } else if let Some(tx_block) = node_data.blockchain.block_by_transaction_hash(hash).await? {
            let tx_index = node_data
                .blockchain
                .receipt_by_transaction_hash(hash)
                .await?
                .expect("If the transaction was inserted in a block, it must have a receipt")
                .transaction_index;

            let tx_index =
                usize::try_from(tx_index).expect("Indices cannot be larger than usize::MAX");
            Some(tx_block.transactions()[tx_index].clone())
        } else {
            None
        };

        Ok(transaction)
    }

    pub async fn transaction_receipt(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, BlockchainError> {
        let node_data = self.lock_data().await;

        node_data.blockchain.receipt_by_transaction_hash(hash).await
    }

    // Temporary workaround until this gets fixed
    // https://github.com/NomicFoundation/edr/issues/186
    async fn workaround_block_by_spec(
        &self,
        blockchain: &mut dyn SyncBlockchain<BlockchainError, StateError>,
        block_spec: &BlockSpec,
    ) -> Result<(), NodeError> {
        if block_spec == &BlockSpec::Tag(BlockTag::Pending) {
            let prev_block_number = blockchain.last_block_number().await - 1;
            blockchain.revert_to_block(prev_block_number).await?;
        }

        Ok(())
    }
}

/// An account in this node.
pub struct LocalAccountInfo {
    pub address: Address,
    pub secret_key: SecretKey,
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use edr_eth::{remote::Eip1898BlockSpec, B256, U64};
    use tempfile::TempDir;

    use super::*;
    use crate::{create_test_config, Config};

    struct NodeTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        config: Config,
        node: Node,
    }

    impl NodeTestFixture {
        pub(crate) async fn new() -> Result<Self> {
            let cache_dir = TempDir::new().expect("should create temp dir");
            let config = create_test_config(cache_dir.path().to_path_buf());
            let node = Node::new(&config).await?;

            Ok(Self {
                _cache_dir: cache_dir,
                config,
                node,
            })
        }
    }

    macro_rules! assert_error {
        ($expression:expr, $pattern:pat => $assertion:expr) => {
            match $expression {
                Err($pattern) => $assertion,
                Err(_) => unreachable!("Expected error to match pattern"),
                Ok(_) => unreachable!("Error expected"),
            }
        };
    }

    #[tokio::test]
    async fn chain_id() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let chain_id = fixture.node.chain_id().await;
        assert_eq!(chain_id, U64::from(fixture.config.chain_id));

        Ok(())
    }

    #[tokio::test]
    async fn block_number() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block_number = fixture.node.block_number().await;
        assert_eq!(block_number, 0);

        fixture.node.lock_data().await.mine_block(None).await?;
        let block_number = fixture.node.block_number().await;
        assert_eq!(block_number, 1);

        Ok(())
    }

    #[tokio::test]
    async fn block_by_block_spec_tags() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        fixture.node.lock_data().await.mine_block(None).await?;
        fixture.node.lock_data().await.mine_block(None).await?;

        async fn assert_block_number(
            fixture: &NodeTestFixture,
            block_tag: BlockTag,
            expected_block_number: u64,
        ) {
            let block = fixture
                .node
                .block_by_block_spec(&BlockSpec::Tag(block_tag))
                .await;

            assert_eq!(block.unwrap().header().number, expected_block_number);
        }

        assert_block_number(&fixture, BlockTag::Earliest, 0).await;

        assert_block_number(&fixture, BlockTag::Latest, 2).await;
        assert_block_number(&fixture, BlockTag::Finalized, 2).await;
        assert_block_number(&fixture, BlockTag::Safe, 2).await;

        assert_block_number(&fixture, BlockTag::Pending, 3).await;
        // Getting the pending block shouldn't mutate the blockchain, so latest should
        // still be 2
        assert_block_number(&fixture, BlockTag::Latest, 2).await;

        Ok(())
    }

    #[tokio::test]
    async fn block_by_block_spec_numbers() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        fixture.node.lock_data().await.mine_block(None).await?;
        fixture.node.lock_data().await.mine_block(None).await?;

        async fn assert_block_number(fixture: &NodeTestFixture, block_number: u64) {
            let block = fixture
                .node
                .block_by_block_spec(&BlockSpec::Number(block_number))
                .await;

            assert_eq!(block.unwrap().header().number, block_number);
        }

        assert_block_number(&fixture, 0).await;
        assert_block_number(&fixture, 1).await;
        assert_block_number(&fixture, 2).await;

        let non_existing_block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Number(3))
            .await;

        assert_error!(
            non_existing_block,
            NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 3)
        );

        Ok(())
    }

    #[tokio::test]
    async fn block_by_block_spec_eip1898_numbers() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        fixture.node.lock_data().await.mine_block(None).await?;
        fixture.node.lock_data().await.mine_block(None).await?;

        async fn assert_block_number(fixture: &NodeTestFixture, block_number: u64) {
            let block = fixture
                .node
                .block_by_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Number {
                    block_number: block_number,
                }))
                .await;

            assert_eq!(block.unwrap().header().number, block_number);
        }

        assert_block_number(&fixture, 0).await;
        assert_block_number(&fixture, 1).await;
        assert_block_number(&fixture, 2).await;

        let non_existing_block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Number(3))
            .await;

        assert_error!(
            non_existing_block,
            NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 3)
        );

        Ok(())
    }

    #[tokio::test]
    async fn block_by_block_spec_eip1898_hashes() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Tag(BlockTag::Earliest))
            .await
            .unwrap();

        let block_hash = block.header().hash();

        async fn assert_block_hash(
            fixture: &NodeTestFixture,
            block_hash: &B256,
            require_canonical: Option<bool>,
        ) {
            let block_by_hash = fixture
                .node
                .block_by_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                    block_hash: *block_hash,
                    require_canonical,
                }))
                .await
                .unwrap();

            assert_eq!(block_by_hash.header().hash(), *block_hash);
        }

        assert_block_hash(&fixture, &block_hash, None).await;
        assert_block_hash(&fixture, &block_hash, Some(true)).await;
        assert_block_hash(&fixture, &block_hash, Some(false)).await;

        let non_existing_block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash: B256::zero(),
                require_canonical: None,
            }))
            .await;

        assert_error!(
            non_existing_block,
            NodeError::UnknownBlockHash { block_hash } => assert_eq!(block_hash, B256::zero())
        );

        Ok(())
    }

    #[tokio::test]
    async fn block_by_hash() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Tag(BlockTag::Earliest))
            .await
            .unwrap();

        let block_hash = block.header().hash();

        let block_by_hash = fixture
            .node
            .block_by_hash(&block_hash)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(block_by_hash.header().hash(), block_hash);

        let non_existing_block = fixture.node.block_by_hash(&B256::zero()).await.unwrap();

        assert!(non_existing_block.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn block_transaction_count_by_hash() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Tag(BlockTag::Earliest))
            .await
            .unwrap();

        let block_hash = block.header().hash();

        let count = fixture
            .node
            .block_transaction_count_by_hash(&block_hash)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(count, 0);

        let non_existing_count = fixture
            .node
            .block_transaction_count_by_hash(&B256::zero())
            .await
            .unwrap();

        assert_eq!(non_existing_count, None);

        Ok(())
    }

    #[tokio::test]
    async fn block_transaction_count_by_block_spec() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Tag(BlockTag::Earliest))
            .await
            .unwrap();

        async fn assert_block_transaction_count(
            fixture: &NodeTestFixture,
            block_spec: BlockSpec,
            expected_count: usize,
        ) {
            let count = fixture
                .node
                .block_transaction_count_by_block_spec(&block_spec)
                .await
                .unwrap();

            assert_eq!(count, expected_count);
        }

        assert_block_transaction_count(&fixture, BlockSpec::Tag(BlockTag::Earliest), 0).await;
        assert_block_transaction_count(&fixture, BlockSpec::Tag(BlockTag::Latest), 0).await;
        assert_block_transaction_count(&fixture, BlockSpec::Tag(BlockTag::Pending), 0).await;
        assert_block_transaction_count(&fixture, BlockSpec::Number(0), 0).await;

        assert_block_transaction_count(
            &fixture,
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number: 0 }),
            0,
        )
        .await;

        assert_block_transaction_count(
            &fixture,
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash: block.header().hash(),
                require_canonical: None,
            }),
            0,
        )
        .await;

        let non_existing_count = fixture
            .node
            .block_transaction_count_by_block_spec(&BlockSpec::Number(1))
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_count = fixture
            .node
            .block_transaction_count_by_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Number {
                block_number: 1,
            }))
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_count = fixture
            .node
            .block_transaction_count_by_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash: B256::zero(),
                require_canonical: None,
            }))
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockHash { block_hash } => assert_eq!(block_hash, B256::zero()));

        Ok(())
    }

    #[tokio::test]
    async fn transaction_by_block_hash_and_index() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let block = fixture
            .node
            .block_by_block_spec(&BlockSpec::Tag(BlockTag::Latest))
            .await?;

        let tx = fixture
            .node
            .transaction_by_block_hash_and_index(&block.header().hash(), 0)
            .await
            .unwrap();

        assert_eq!(tx, None);

        let non_existing_block_tx = fixture
            .node
            .transaction_by_block_hash_and_index(&B256::zero(), 0)
            .await
            .unwrap();

        assert_eq!(non_existing_block_tx, None);

        Ok(())
    }

    #[tokio::test]
    async fn transaction_by_block_spec_and_index() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let tx = fixture
            .node
            .transaction_by_block_spec_and_index(&BlockSpec::Tag(BlockTag::Latest), 0)
            .await
            .unwrap();

        assert_eq!(tx, None);

        let non_existing_block_tx = fixture
            .node
            .transaction_by_block_spec_and_index(&BlockSpec::Number(1), 0)
            .await;

        assert_error!(non_existing_block_tx, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_block_tx = fixture
            .node
            .transaction_by_block_spec_and_index(
                &BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number: 1 }),
                0,
            )
            .await;

        assert_error!(non_existing_block_tx, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_block_tx = fixture
            .node
            .transaction_by_block_spec_and_index(
                &BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                    block_hash: B256::zero(),
                    require_canonical: None,
                }),
                0,
            )
            .await;

        assert_error!(non_existing_block_tx, NodeError::UnknownBlockHash { block_hash } => assert_eq!(block_hash, B256::zero()));
        Ok(())
    }

    #[tokio::test]
    async fn get_transaction_count() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let count = fixture
            .node
            .get_transaction_count(Address::zero(), Some(&BlockSpec::Tag(BlockTag::Earliest)))
            .await
            .unwrap();

        assert_eq!(count, 0);

        let count = fixture
            .node
            .get_transaction_count(Address::zero(), Some(&BlockSpec::Tag(BlockTag::Latest)))
            .await
            .unwrap();

        assert_eq!(count, 0);

        let non_existing_count = fixture
            .node
            .get_transaction_count(Address::zero(), Some(&BlockSpec::Number(1)))
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_count = fixture
            .node
            .get_transaction_count(
                Address::zero(),
                Some(&BlockSpec::Eip1898(Eip1898BlockSpec::Number {
                    block_number: 1,
                })),
            )
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockNumber { block_number } => assert_eq!(block_number, 1));

        let non_existing_count = fixture
            .node
            .get_transaction_count(
                Address::zero(),
                Some(&BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                    block_hash: B256::zero(),
                    require_canonical: None,
                })),
            )
            .await;

        assert_error!(non_existing_count, NodeError::UnknownBlockHash { block_hash } => assert_eq!(block_hash, B256::zero()));

        Ok(())
    }

    #[tokio::test]
    async fn transaction_by_hash() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let non_existing_tx = fixture
            .node
            .transaction_by_hash(&B256::zero())
            .await
            .unwrap();

        assert_eq!(non_existing_tx, None);

        Ok(())
    }

    #[tokio::test]
    async fn transaction_receipt() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let non_existing_receipt = fixture
            .node
            .transaction_receipt(&B256::zero())
            .await
            .unwrap();

        assert_eq!(non_existing_receipt, None);

        Ok(())
    }
}
