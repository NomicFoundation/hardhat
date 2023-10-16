use std::mem;
use std::sync::Arc;
use std::time::{SystemTime, SystemTimeError, UNIX_EPOCH};

use edr_eth::Bytes;
use edr_eth::{
    remote::{BlockSpec, BlockTag, Eip1898BlockSpec},
    Address, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    mine_block,
    state::{AccountModifierFn, IrregularState, StateError, SyncState},
    AccountInfo, CfgEnv, MemPool, MineBlockError, MineBlockResult, RandomHashGenerator,
    KECCAK_EMPTY,
};
use edr_evm::{Block, Bytecode, MineOrdering, SyncBlock};

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

    pub async fn lock_data(&self) -> tokio::sync::MutexGuard<'_, NodeData> {
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
            .state_by_block_number(&block_header.number)
            .cloned()
        {
            irregular_state
        } else {
            data.blockchain
                .state_at_block_number(&block_header.number)
                .await?
        };

        mem::swap(&mut data.state, &mut contextual_state);

        // Execute function in the requested block context.
        let result = function(&mut data);

        // Reset previous state.
        mem::swap(&mut data.state, &mut contextual_state);

        Ok(result)
    }

    pub async fn balance(
        &self,
        address: Address,
        block_spec: Option<BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node| {
            Ok(node
                .state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })
        .await?
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
}

pub(super) struct NodeData {
    pub blockchain: Box<dyn SyncBlockchain<BlockchainError, StateError>>,
    pub state: Box<dyn SyncState<StateError>>,
    pub irregular_state: IrregularState<StateError, Box<dyn SyncState<StateError>>>,
    pub mem_pool: MemPool,
    pub evm_config: CfgEnv,
    pub beneficiary: Address,
    pub min_gas_price: U256,
    pub prevrandao_generator: RandomHashGenerator,
    pub block_time_offset_seconds: U256,
    pub next_block_timestamp: Option<U256>,
    pub allow_blocks_with_same_timestamp: bool,
    pub fork_block_number: Option<U256>,
}

impl NodeData {
    async fn block_by_block_spec(
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
    TimestampLowerThanPrevious { proposed: U256, previous: U256 },
    /// Block hash doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a hash and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block hash: {block_hash}")]
    UnknownBlockHash { block_hash: B256 },
    /// Block number doesn't exist in blockchain
    /// Returned if the block spec is an EIP-1898 block spec for a block number and it's not found
    /// <https://eips.ethereum.org/EIPS/eip-1898>
    #[error("Unknown block number: {block_number}")]
    UnknownBlockNumber { block_number: U256 },

    #[error(transparent)]
    Blockchain(#[from] BlockchainError),

    #[error(transparent)]
    MineBlock(#[from] MineBlockError<BlockchainError, StateError>),

    #[error(transparent)]
    State(#[from] StateError),

    #[error(transparent)]
    SystemTime(#[from] SystemTimeError),
}
