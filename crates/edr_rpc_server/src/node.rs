use std::mem;
use std::sync::Arc;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use edr_eth::{
    remote::{BlockSpec, BlockTag, Eip1898BlockSpec},
    Address, SpecId, B256, U256,
};
use edr_eth::{Bytes, U64};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    mine_block,
    state::{AccountModifierFn, IrregularState, StateError, SyncState},
    AccountInfo, CfgEnv, HashMap, MemPool, MineBlockError, MineBlockResult, RandomHashGenerator,
    KECCAK_EMPTY,
};
use edr_evm::{Block, Bytecode, MineOrdering, SyncBlock};

use edr_eth::{serde::ZeroXPrefixedBytes, signature::Signature};
use tokio::sync::Mutex;

pub(super) struct Node {
    data: Mutex<NodeData>,
}

impl Node {
    pub fn new(state: NodeData) -> Self {
        Self {
            data: Mutex::new(state),
        }
    }

    // TODO make this private once all methods are ported
    // https://github.com/NomicFoundation/edr/issues/141
    pub(crate) async fn lock_data(&self) -> tokio::sync::MutexGuard<'_, NodeData> {
        self.data.lock().await
    }

    async fn execute_in_block_context<T>(
        &self,
        block_spec: Option<BlockSpec>,
        function: impl FnOnce(&mut NodeData) -> T,
    ) -> Result<T, NodeError> {
        let mut data = self.lock_data().await;

        let block = if let Some(block_spec) = block_spec {
            data.block_by_block_spec(&block_spec).await?
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
        block_spec: Option<BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node_data| {
            Ok(node_data
                .state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })
        .await?
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
        block_spec: Option<BlockSpec>,
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

    pub async fn network_id(&self) -> String {
        let node_data = self.lock_data().await;
        node_data.network_id.to_string()
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
        message: &ZeroXPrefixedBytes,
    ) -> Result<Signature, NodeError> {
        let node_data = self.lock_data().await;
        match node_data.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(
                &Bytes::from(message.clone())[..],
                secret_key,
            )?),
            None => Err(NodeError::UnknownAddress { address: *address }),
        }
    }
}

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
    pub fork_block_number: Option<u64>,
    pub local_accounts: HashMap<Address, k256::SecretKey>,
}

impl NodeData {
    async fn block_by_block_spec(
        &mut self,
        block_spec: &BlockSpec,
    ) -> Result<Arc<dyn SyncBlock<Error = BlockchainError>>, NodeError> {
        match block_spec {
            BlockSpec::Number(block_number) => {
                self.blockchain.block_by_number(*block_number).await?.ok_or(
                    NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    },
                )
            }
            BlockSpec::Tag(BlockTag::Earliest) => Ok(self
                .blockchain
                .block_by_number(0)
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
                self.blockchain.block_by_number(*block_number).await?.ok_or(
                    NodeError::UnknownBlockNumber {
                        block_number: *block_number,
                    },
                )
            }
        }
    }

    fn get_account_info(&self, address: Address) -> Result<AccountInfo, NodeError> {
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

    /// Mine a block at a specific timestamp
    pub async fn mine_block(
        &mut self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError, StateError>, NodeError> {
        let (block_timestamp, new_offset) = self.next_block_timestamp(timestamp).await?;

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
}

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    #[error(
        "The given timestamp {proposed} is lower than the previous block's timestamp {previous}"
    )]
    TimestampLowerThanPrevious { proposed: u64, previous: u64 },
    /// The address is not owned by this node.
    #[error("{address} is not owned by this node")]
    UnknownAddress { address: Address },
    /// Block hash doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a hash and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block hash: {block_hash}")]
    UnknownBlockHash { block_hash: B256 },
    /// Block number doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a block number and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block number: {block_number}")]
    UnknownBlockNumber { block_number: u64 },

    #[error(transparent)]
    Blockchain(#[from] BlockchainError),

    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),

    #[error(transparent)]
    Signature(#[from] edr_eth::signature::SignatureError),

    #[error(transparent)]
    State(#[from] StateError),

    #[error(transparent)]
    SystemTime(#[from] SystemTimeError),
}

#[cfg(test)]
pub(crate) mod tests {
    use std::{
        net::{IpAddr, Ipv4Addr, SocketAddr},
        path::PathBuf,
        time::SystemTime,
    };

    use anyhow::Result;
    use tempfile::TempDir;

    use edr_eth::{signature::secret_key_from_str, Address, SpecId, U256, U64};

    use crate::{
        block_time_offset_seconds, create_accounts, create_blockchain_and_state, create_evm_config,
        AccountConfig, BlockchainAndState, Config, InitialAccounts, RpcHardhatNetworkConfig,
    };

    use super::*;

    pub(crate) const SECRET_KEY: &str =
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    pub(crate) struct NodeTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        config: Config,
        node: Node,
    }

    impl NodeTestFixture {
        pub(crate) async fn new() -> Result<Self> {
            let cache_dir = TempDir::new().expect("should create temp dir");
            let config = Self::test_config(cache_dir.path().to_path_buf());
            let node = Self::test_node(&config).await?;

            Ok(Self {
                _cache_dir: cache_dir,
                config,
                node,
            })
        }

        pub(crate) fn test_config(cache_dir: PathBuf) -> Config {
            Config {
                address: SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0),
                allow_blocks_with_same_timestamp: false,
                allow_unlimited_contract_size: false,
                rpc_hardhat_network_config: RpcHardhatNetworkConfig { forking: None },
                accounts: vec![AccountConfig {
                    secret_key: secret_key_from_str(SECRET_KEY)
                        .expect("should construct secret key from string"),
                    balance: U256::ZERO,
                }],
                block_gas_limit: 30_000_000,
                chain_id: 1,
                coinbase: Address::from_low_u64_ne(1),
                gas: 30_000_000,
                hardfork: SpecId::LATEST,
                initial_base_fee_per_gas: Some(U256::from(1000000000)),
                initial_date: Some(SystemTime::now()),
                network_id: 123,
                cache_dir,
            }
        }

        async fn test_node(config: &Config) -> Result<Node> {
            let InitialAccounts {
                local_accounts,
                genesis_accounts,
            } = create_accounts(config);

            let BlockchainAndState {
                state,
                blockchain,
                fork_block_number,
            } = create_blockchain_and_state(config, genesis_accounts).await?;

            let evm_config = create_evm_config(config);

            let prevrandao_generator = RandomHashGenerator::with_seed("randomMixHashSeed");

            let node_data = NodeData {
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
                fork_block_number,
                local_accounts,
            };

            Ok(Node::new(node_data))
        }
    }

    #[tokio::test]
    async fn chain_id() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let chain_id = fixture.node.chain_id().await;
        assert_eq!(chain_id, U64::from(fixture.config.chain_id));

        Ok(())
    }
}
