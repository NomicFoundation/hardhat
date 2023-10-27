use std::num::NonZeroU64;
use std::sync::Arc;

use async_trait::async_trait;
use edr_eth::block::LargestSafeBlockNumberArgs;
use edr_eth::receipt::BlockReceipt;
use edr_eth::spec::chain_hardfork_activations;
use edr_eth::Address;
use edr_eth::{
    block::{largest_safe_block_number, safe_block_depth},
    remote::{RpcClient, RpcClientError},
    spec::{chain_name, HardforkActivations},
    B256, U256,
};
use parking_lot::Mutex;
use revm::primitives::{AccountInfo, HashMap};
use revm::{db::BlockHashRef, primitives::SpecId};
use tokio::runtime;

use crate::state::{ForkState, StateDiff, StateError, SyncState};
use crate::{Block, LocalBlock, RandomHashGenerator, SyncBlock};

use super::compute_state_at_block;
use super::{
    remote::RemoteBlockchain, storage::ReservableSparseBlockchainStorage, validate_next_block,
    Blockchain, BlockchainError, BlockchainMut,
};

/// An error that occurs upon creation of a [`ForkedBlockchain`].
#[derive(Debug, thiserror::Error)]
pub enum CreationError {
    /// JSON-RPC error
    #[error(transparent)]
    JsonRpcError(#[from] RpcClientError),
    /// The requested block number does not exist
    #[error("Trying to initialize a provider with block {fork_block_number} but the current block is {latest_block_number}")]
    InvalidBlockNumber {
        /// Requested fork block number
        fork_block_number: u64,
        /// Latest block number
        latest_block_number: u64,
    },
    /// The detected hardfork is not supported
    #[error("Cannot fork {chain_name} from block {fork_block_number}. The hardfork must be at least Spurious Dragon, but {hardfork:?} was detected.")]
    InvalidHardfork {
        /// Requested fork block number
        fork_block_number: u64,
        /// Chain name
        chain_name: String,
        /// Detected hardfork
        hardfork: SpecId,
    },
}

/// A blockchain that forked from a remote blockchain.
#[derive(Debug)]
pub struct ForkedBlockchain {
    local_storage: ReservableSparseBlockchainStorage<Arc<dyn SyncBlock<Error = BlockchainError>>>,
    // We can force caching here because we only fork from a safe block number.
    remote: RemoteBlockchain<Arc<dyn SyncBlock<Error = BlockchainError>>, true>,
    // The state at the time of forking
    fork_state: ForkState,
    runtime: runtime::Handle,
    fork_block_number: u64,
    chain_id: u64,
    _network_id: U256,
    spec_id: SpecId,
    hardfork_activations: Option<HardforkActivations>,
}

impl ForkedBlockchain {
    /// Constructs a new instance.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn new(
        runtime: runtime::Handle,
        spec_id: SpecId,
        rpc_client: RpcClient,
        fork_block_number: Option<u64>,
        state_root_generator: Arc<Mutex<RandomHashGenerator>>,
        account_overrides: HashMap<Address, AccountInfo>,
        hardfork_activation_overrides: HashMap<u64, HardforkActivations>,
    ) -> Result<Self, CreationError> {
        let (chain_id, network_id, latest_block_number) = tokio::join!(
            rpc_client.chain_id(),
            rpc_client.network_id(),
            rpc_client.block_number()
        );

        let chain_id = chain_id?;
        let network_id = network_id?;
        let latest_block_number = latest_block_number?;

        let safe_block_number = largest_safe_block_number(LargestSafeBlockNumberArgs {
            chain_id,
            latest_block_number,
        });

        let fork_block_number = if let Some(fork_block_number) = fork_block_number {
            if fork_block_number > latest_block_number {
                return Err(CreationError::InvalidBlockNumber {
                    fork_block_number,
                    latest_block_number,
                });
            }

            if fork_block_number > safe_block_number {
                let num_confirmations = latest_block_number - fork_block_number + 1;
                let required_confirmations = safe_block_depth(chain_id) + 1;
                let missing_confirmations = required_confirmations - num_confirmations;

                log::warn!("You are forking from block {fork_block_number} which has less than {required_confirmations} confirmations, and will affect Hardhat Network's performance. Please use block number {safe_block_number} or wait for the block to get {missing_confirmations} more confirmations.");
            }

            fork_block_number
        } else {
            safe_block_number
        };

        let hardfork_activations = hardfork_activation_overrides
            .get(&chain_id)
            .or_else(|| chain_hardfork_activations(chain_id))
            .cloned()
            .and_then(|hardfork_activations| {
                // Ignore empty hardfork activations
                if hardfork_activations.is_empty() {
                    None
                } else {
                    Some(hardfork_activations)
                }
            });

        if let Some(hardfork) = hardfork_activations
            .as_ref()
            .and_then(|hardfork_activations| {
                hardfork_activations.hardfork_at_block_number(fork_block_number)
            })
        {
            if hardfork < SpecId::SPURIOUS_DRAGON {
                return Err(CreationError::InvalidHardfork {
                    chain_name: chain_name(chain_id)
                        .map_or_else(|| "unknown".to_string(), ToString::to_string),
                    fork_block_number,
                    hardfork,
                });
            }
        }

        let rpc_client = Arc::new(rpc_client);
        let fork_state = ForkState::new(
            runtime.clone(),
            rpc_client.clone(),
            state_root_generator,
            fork_block_number,
            account_overrides,
        )
        .await?;

        Ok(Self {
            local_storage: ReservableSparseBlockchainStorage::empty(fork_block_number),
            remote: RemoteBlockchain::new(rpc_client),
            fork_state,
            runtime,
            fork_block_number,
            chain_id,
            _network_id: network_id,
            spec_id,
            hardfork_activations,
        })
    }
}

impl BlockHashRef for ForkedBlockchain {
    type Error = BlockchainError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        let number =
            u64::try_from(number).map_err(|_error| BlockchainError::BlockNumberTooLarge)?;

        if number <= self.fork_block_number {
            tokio::task::block_in_place(move || {
                self.runtime.block_on(self.remote.block_by_number(number))
            })
            .map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(*block.hash()),
            )
        } else {
            self.local_storage
                .block_by_number(number)
                .map(|block| *block.hash())
                .ok_or(BlockchainError::UnknownBlockNumber)
        }
    }
}

#[async_trait]
impl Blockchain for ForkedBlockchain {
    type BlockchainError = BlockchainError;

    type StateError = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        if let Some(block) = self.local_storage.block_by_hash(hash) {
            Ok(Some(block))
        } else {
            self.remote
                .block_by_hash(hash)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn block_by_number(
        &self,
        number: u64,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        if number <= self.fork_block_number {
            self.remote.block_by_number(number).await.map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(Some(block)),
            )
        } else {
            Ok(self.local_storage.block_by_number(number))
        }
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        if let Some(block) = self
            .local_storage
            .block_by_transaction_hash(transaction_hash)
        {
            Ok(Some(block))
        } else {
            self.remote
                .block_by_transaction_hash(transaction_hash)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    async fn chain_id(&self) -> u64 {
        self.chain_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::BlockchainError>>, Self::BlockchainError> {
        let last_block_number = self.last_block_number().await;
        if self.fork_block_number < last_block_number {
            Ok(self
                .local_storage
                .block_by_number(last_block_number)
                .expect("Block must exist"))
        } else {
            self.remote
                .block_by_number(self.fork_block_number)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    async fn last_block_number(&self) -> u64 {
        self.local_storage.last_block_number()
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, Self::BlockchainError> {
        if let Some(receipt) = self
            .local_storage
            .receipt_by_transaction_hash(transaction_hash)
        {
            Ok(Some(receipt))
        } else {
            self.remote
                .receipt_by_transaction_hash(transaction_hash)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn spec_at_block_number(
        &self,
        block_number: u64,
    ) -> Result<SpecId, Self::BlockchainError> {
        if block_number > self.last_block_number().await {
            return Err(BlockchainError::UnknownBlockNumber);
        }

        if block_number <= self.fork_block_number {
            self.remote.block_by_number(block_number).await.map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| {
                    if let Some(hardfork_activations) = &self.hardfork_activations {
                        hardfork_activations
                            .hardfork_at_block_number(block.header().number)
                            .ok_or(BlockchainError::UnknownBlockSpec {
                                block_number,
                                hardfork_activations: hardfork_activations.clone(),
                            })
                    } else {
                        Err(BlockchainError::MissingHardforkActivations {
                            block_number,
                            fork_block_number: self.fork_block_number,
                        })
                    }
                },
            )
        } else {
            Ok(self.spec_id)
        }
    }

    fn spec_id(&self) -> SpecId {
        self.spec_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn state_at_block_number(
        &self,
        block_number: u64,
    ) -> Result<Box<dyn SyncState<Self::StateError>>, Self::BlockchainError> {
        if block_number > self.last_block_number().await {
            return Err(BlockchainError::UnknownBlockNumber);
        }

        let state = match block_number.cmp(&self.fork_block_number) {
            std::cmp::Ordering::Less => {
                // We don't apply account overrides to pre-fork states
                ForkState::new(
                    self.runtime.clone(),
                    self.remote.client().clone(),
                    self.fork_state.state_root_generator().clone(),
                    block_number,
                    HashMap::new(),
                )
                .await?
            }
            std::cmp::Ordering::Equal => self.fork_state.clone(),
            std::cmp::Ordering::Greater => {
                let mut state = self.fork_state.clone();
                compute_state_at_block(&mut state, &self.local_storage, block_number);
                state
            }
        };

        Ok(Box::new(state))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn total_difficulty_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<U256>, Self::BlockchainError> {
        if let Some(difficulty) = self.local_storage.total_difficulty_by_hash(hash) {
            Ok(Some(difficulty))
        } else {
            self.remote
                .total_difficulty_by_hash(hash)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }
}

#[async_trait]
impl BlockchainMut for ForkedBlockchain {
    type Error = BlockchainError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn insert_block(
        &mut self,
        block: LocalBlock,
        state_diff: StateDiff,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::Error>>, Self::Error> {
        let last_block = self.last_block().await?;

        validate_next_block(self.spec_id, &last_block, &block)?;

        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
            .await
            .expect("No error can occur as it is stored locally")
            .expect("Must exist as its block is stored");

        let total_difficulty = previous_total_difficulty + block.header().difficulty;

        // SAFETY: The block number is guaranteed to be unique, so the block hash must be too.
        let block = unsafe {
            self.local_storage
                .insert_block_unchecked(block, state_diff, total_difficulty)
        };

        Ok(block.clone())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn reserve_blocks(&mut self, additional: u64, interval: u64) -> Result<(), Self::Error> {
        let additional = if let Some(additional) = NonZeroU64::new(additional) {
            additional
        } else {
            return Ok(()); // nothing to do
        };

        let last_block = self.last_block().await?;
        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
            .await?
            .expect("Must exist as its block is stored");

        let last_header = last_block.header();
        self.local_storage.reserve_blocks(
            additional,
            interval,
            last_header.base_fee_per_gas,
            last_header.state_root,
            previous_total_difficulty,
            self.spec_id,
        );

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn revert_to_block(&mut self, block_number: u64) -> Result<(), Self::Error> {
        match block_number.cmp(&self.fork_block_number) {
            std::cmp::Ordering::Less => Err(BlockchainError::CannotDeleteRemote),
            std::cmp::Ordering::Equal => {
                self.local_storage =
                    ReservableSparseBlockchainStorage::empty(self.fork_block_number);

                Ok(())
            }
            std::cmp::Ordering::Greater => {
                if self.local_storage.revert_to_block(block_number) {
                    Ok(())
                } else {
                    Err(BlockchainError::UnknownBlockNumber)
                }
            }
        }
    }
}
