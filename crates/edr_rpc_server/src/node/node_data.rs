use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use indexmap::IndexMap;

use edr_eth::remote::RpcClient;
use edr_eth::signature::public_key_to_address;
use edr_eth::{
    remote::{BlockSpec, BlockTag, Eip1898BlockSpec},
    Address, SpecId, U256,
};
use edr_evm::blockchain::{Blockchain, ForkedBlockchain, LocalBlockchain};
use edr_evm::state::{AccountTrie, TrieState};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    mine_block,
    state::{IrregularState, StateError, SyncState},
    AccountInfo, Block, CfgEnv, HashMap, HashSet, MemPool, MineBlockResult, MineOrdering,
    RandomHashGenerator, SyncBlock, KECCAK_EMPTY,
};

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
    pub block_time_offset_seconds: U256,
    pub next_block_timestamp: Option<U256>,
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

// Implement methods on `NodeData` as opposed to on `Node` that are helper methods for methods on
// `Node` as these helper methods shouldn't try to acquire the lock in `Node`. That would lead to
// deadlocks.
impl NodeData {
    pub async fn block_by_block_spec(
        &mut self,
        block_spec: &BlockSpec,
    ) -> Result<Arc<dyn SyncBlock<Error = BlockchainError>>, NodeError> {
        match block_spec {
            BlockSpec::Number(block_number) => {
                self.blockchain.block_by_number(block_number).await?.ok_or(
                    NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    },
                )
            }
            BlockSpec::Tag(BlockTag::Earliest) => Ok(self
                .blockchain
                .block_by_number(&U256::ZERO)
                .await?
                .expect("genesis block should always exist")),
            // Matching Hardhat behaviour by returning the last block for finalized and safe.
            // https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/modules/eth.ts#L1395
            BlockSpec::Tag(BlockTag::Finalized | BlockTag::Safe | BlockTag::Latest) => {
                Ok(self.blockchain.last_block().await?)
            }
            BlockSpec::Tag(BlockTag::Pending) => Ok(self.mine_block(None).await?.block),
            BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash,
                require_canonical: _,
            }) => self.blockchain.block_by_hash(block_hash).await?.ok_or(
                NodeError::UnknownBlockHash {
                    block_hash: *block_hash,
                },
            ),
            BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => {
                self.blockchain.block_by_number(block_number).await?.ok_or(
                    NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    },
                )
            }
        }
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

    pub fn next_filter_id(&mut self) -> U256 {
        self.last_filter_id = self
            .last_filter_id
            .checked_add(U256::from(1))
            .expect("filter id starts at zero, so it'll never overflow for U256");
        self.last_filter_id
    }

    /// Get the timestamp for the next block.
    /// Ported from <https://github.com/NomicFoundation/hardhat/blob/b84baf2d9f5d3ea897c06e0ecd5e7084780d8b6c/packages/hardhat-core/src/internal/hardhat-network/provider/node.ts#L1942>
    async fn next_block_timestamp(
        &self,
        timestamp: Option<U256>,
    ) -> Result<(U256, Option<U256>), NodeError> {
        let latest_block = self.blockchain.last_block().await?;
        let latest_block_header = latest_block.header();

        let current_timestamp = U256::from(SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs());
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
            block_timestamp += U256::from(1u64);
        }

        Ok((block_timestamp, new_offset))
    }

    /// Mine a block at a specific timestamp
    pub async fn mine_block(
        &mut self,
        timestamp: Option<U256>,
    ) -> Result<MineBlockResult<BlockchainError, StateError>, NodeError> {
        let _debug = timestamp.map(|ts| {
            let n: u64 = ts.try_into().expect("timestamp should fit into u64");
            n
        });
        let (block_timestamp, new_offset) = self.next_block_timestamp(timestamp).await?;
        // let new_offset = None;

        // TODO: when we support hardhat_setNextBlockBaseFeePerGas, incorporate
        // the last-passed value here. (but don't .take() it yet, because we only
        // want to clear it if the block mining is successful.
        // https://github.com/NomicFoundation/edr/issues/145
        let base_fee = None;

        // TODO: https://github.com/NomicFoundation/edr/issues/156
        let reward = U256::ZERO;
        let prevrandao = if self.evm_config.spec_id >= SpecId::MERGE {
            Some(self.prevrandao_generator.next_value())
        } else {
            None
        };

        let result = mine_block(
            &mut *self.blockchain,
            self.state.clone(),
            &mut self.mem_pool,
            &self.evm_config,
            block_timestamp,
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

        if let Some(new_offset) = new_offset {
            self.block_time_offset_seconds = new_offset;
        }

        // Reset next block time stamp
        self.next_block_timestamp.take();

        // TODO: when we support hardhat_setNextBlockBaseFeePerGas, reset the user provided
        // next block base fee per gas to `None`
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
    let mut genesis_accounts = HashMap::default();

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
            fork_config.block_number.map(U256::from),
            state_root_generator,
            genesis_accounts,
            // TODO: make hardfork activations configurable (https://github.com/NomicFoundation/edr/issues/111)
            HashMap::new(),
        )
        .await?;

        let fork_block_number = blockchain.last_block_number().await;

        let state = blockchain
            .state_at_block_number(&fork_block_number)
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
            U256::from(config.chain_id),
            config.hardfork,
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

        Ok(BlockchainAndState {
            state,
            blockchain: Box::new(blockchain),
        })
    }
}

fn block_time_offset_seconds(config: &Config) -> Result<U256, NodeError> {
    let block_time_offset_seconds = if let Some(initial_date) = config.initial_date {
        U256::from(
            SystemTime::now()
                .duration_since(initial_date)
                .map_err(|_e| NodeError::InitialDateInFuture(initial_date))?
                .as_secs(),
        )
    } else {
        U256::ZERO
    };
    Ok(block_time_offset_seconds)
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

    use crate::config::test_tools::create_test_config;

    use super::*;

    struct NodeDataTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        node_data: NodeData,
    }

    impl NodeDataTestFixture {
        async fn new() -> Result<Self> {
            let cache_dir = TempDir::new()?;
            let config = create_test_config(cache_dir.path().to_path_buf());
            let node_data = NodeData::new(&config).await?;

            Ok(Self {
                _cache_dir: cache_dir,
                node_data,
            })
        }
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
