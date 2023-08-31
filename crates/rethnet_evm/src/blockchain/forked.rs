use std::sync::Arc;
use std::{num::NonZeroUsize, path::PathBuf};

use async_trait::async_trait;
use rethnet_eth::block::LargestSafeBlockNumberArgs;
use rethnet_eth::{
    block::{largest_possible_reorg, largest_safe_block_number, DetailedBlock},
    remote::{RpcClient, RpcClientError},
    spec::{chain_name, determine_hardfork},
    B256, U256,
};
use revm::{db::BlockHashRef, primitives::SpecId};
use tokio::runtime;

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
        fork_block_number: U256,
        /// Latest block number
        latest_block_number: U256,
    },
    /// The detected hardfork is not supported
    #[error("Cannot fork {chain_name} from block {fork_block_number}. The hardfork must be at least Spurious Dragon, but {hardfork:?} was detected.")]
    InvalidHardfork {
        /// Requested fork block number
        fork_block_number: U256,
        /// Chain name
        chain_name: String,
        /// Detected hardfork
        hardfork: SpecId,
    },
}

/// A blockchain that forked from a remote blockchain.
#[derive(Debug)]
pub struct ForkedBlockchain {
    local_storage: ReservableSparseBlockchainStorage,
    remote: RemoteBlockchain,
    runtime: runtime::Handle,
    fork_block_number: U256,
    chain_id: U256,
    _network_id: U256,
    spec_id: SpecId,
}

impl ForkedBlockchain {
    /// Constructs a new instance.
    pub async fn new(
        runtime: runtime::Handle,
        spec_id: SpecId,
        remote_url: &str,
        cache_dir: PathBuf,
        fork_block_number: Option<U256>,
    ) -> Result<Self, CreationError> {
        let rpc_client = RpcClient::new(remote_url, cache_dir);

        let (chain_id, network_id, latest_block_number) = tokio::join!(
            rpc_client.chain_id(),
            rpc_client.network_id(),
            rpc_client.block_number()
        );

        let chain_id = chain_id?;
        let network_id = network_id?;
        let latest_block_number = latest_block_number?;

        let safe_block_number = largest_safe_block_number(LargestSafeBlockNumberArgs {
            chain_id: &chain_id,
            latest_block_number: &latest_block_number,
        });

        let fork_block_number = if let Some(fork_block_number) = fork_block_number {
            if fork_block_number > latest_block_number {
                return Err(CreationError::InvalidBlockNumber {
                    fork_block_number,
                    latest_block_number,
                });
            }

            if fork_block_number > safe_block_number {
                let num_confirmations = latest_block_number - fork_block_number + U256::from(1);
                let required_confirmations = largest_possible_reorg(&chain_id) + U256::from(1);
                let missing_confirmations = required_confirmations - num_confirmations;

                log::warn!("You are forking from block {fork_block_number} which has less than {required_confirmations} confirmations, and will affect Hardhat Network's performance. Please use block number {safe_block_number} or wait for the block to get {missing_confirmations} more confirmations.");
            }

            fork_block_number
        } else {
            safe_block_number
        };

        if let Some(hardfork) = determine_hardfork(&chain_id, &fork_block_number) {
            if hardfork < SpecId::SPURIOUS_DRAGON {
                return Err(CreationError::InvalidHardfork {
                    chain_name: chain_name(&chain_id)
                        .expect("Must succeed since we found its hardfork")
                        .to_string(),
                    fork_block_number,
                    hardfork,
                });
            }
        }

        Ok(Self {
            local_storage: ReservableSparseBlockchainStorage::empty(fork_block_number),
            remote: RemoteBlockchain::new(rpc_client),
            runtime,
            fork_block_number,
            chain_id,
            _network_id: network_id,
            spec_id,
        })
    }
}

impl BlockHashRef for ForkedBlockchain {
    type Error = BlockchainError;

    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        if number <= self.fork_block_number {
            tokio::task::block_in_place(move || {
                self.runtime.block_on(self.remote.block_by_number(&number))
            })
            .map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(block.header.hash()),
            )
        } else {
            self.local_storage
                .block_by_number(&number)
                .map(|block| block.header.hash())
                .ok_or(BlockchainError::UnknownBlockNumber)
        }
    }
}

#[async_trait]
impl Blockchain for ForkedBlockchain {
    type Error = BlockchainError;

    async fn block_by_hash(&self, hash: &B256) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        if let Some(block) = self.local_storage.block_by_hash(hash) {
            Ok(Some(block))
        } else {
            self.remote
                .block_by_hash(hash)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    async fn block_by_number(
        &self,
        number: &U256,
    ) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        if *number <= self.fork_block_number {
            self.remote.block_by_number(number).await.map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(Some(block)),
            )
        } else {
            Ok(self.local_storage.block_by_number(number))
        }
    }

    async fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
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

    async fn block_supports_spec(
        &self,
        number: &U256,
        spec_id: SpecId,
    ) -> Result<bool, Self::Error> {
        if *number <= self.fork_block_number {
            self.remote.block_by_number(number).await.map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| {
                    determine_hardfork(&self.chain_id, &block.header.number).map_or_else(
                        || {
                            Err(BlockchainError::UnsupportedChain {
                                chain_id: self.chain_id,
                            })
                        },
                        |block_spec_id| Ok(spec_id <= block_spec_id),
                    )
                },
            )
        } else {
            Ok(spec_id <= self.spec_id)
        }
    }

    async fn chain_id(&self) -> U256 {
        self.chain_id
    }

    async fn last_block(&self) -> Result<Arc<DetailedBlock>, Self::Error> {
        let last_block_number = self.last_block_number().await;
        if self.fork_block_number < last_block_number {
            Ok(self
                .local_storage
                .block_by_number(&last_block_number)
                .expect("Block must exist"))
        } else {
            self.remote
                .block_by_number(&self.fork_block_number)
                .await
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    async fn last_block_number(&self) -> U256 {
        *self.local_storage.last_block_number()
    }

    async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<rethnet_eth::receipt::BlockReceipt>>, Self::Error> {
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

    async fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::Error> {
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

    async fn insert_block(
        &mut self,
        block: DetailedBlock,
    ) -> Result<Arc<DetailedBlock>, Self::Error> {
        let last_block = self.last_block().await?;

        validate_next_block(self.spec_id, &last_block, &block)?;

        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
            .await
            .expect("No error can occur as it is stored locally")
            .expect("Must exist as its block is stored");

        let total_difficulty = previous_total_difficulty + block.header.difficulty;

        // SAFETY: The block number is guaranteed to be unique, so the block hash must be too.
        let block = unsafe {
            self.local_storage
                .insert_block_unchecked(block, total_difficulty)
        };

        Ok(block.clone())
    }

    async fn reserve_blocks(
        &mut self,
        additional: usize,
        interval: U256,
    ) -> Result<(), Self::Error> {
        let additional = if let Some(additional) = NonZeroUsize::new(additional) {
            additional
        } else {
            return Ok(()); // nothing to do
        };

        let last_block = self.last_block().await?;
        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
            .await?
            .expect("Must exist as its block is stored");

        self.local_storage.reserve_blocks(
            additional,
            interval,
            last_block.header.base_fee_per_gas,
            last_block.header.state_root,
            previous_total_difficulty,
            self.spec_id,
        );

        Ok(())
    }

    async fn revert_to_block(&mut self, block_number: &U256) -> Result<(), Self::Error> {
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
