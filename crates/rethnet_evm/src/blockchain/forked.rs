use std::sync::Arc;

use hashbrown::HashMap;
use rethnet_eth::{
    block::DetailedBlock,
    remote::{RpcClient, RpcClientError},
    spec::{chain_name, determine_hardfork},
    B256, U256,
};
use revm::{db::BlockHashRef, primitives::SpecId};
use tokio::runtime::Runtime;

use super::{
    remote::RemoteBlockchain, storage::ContiguousBlockchainStorage, validate_next_block,
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
    /// The specified chain is not supported
    #[error("Chain with ID {chain_id} not supported")]
    UnsupportedChain {
        /// Requested chain id
        chain_id: U256,
    },
}

/// A blockchain that forked from a remote blockchain.
#[derive(Debug)]
pub struct ForkedBlockchain {
    local_storage: ContiguousBlockchainStorage,
    remote: RemoteBlockchain,
    fork_block_number: U256,
    _chain_id: U256,
    _network_id: U256,
}

impl ForkedBlockchain {
    /// Constructs a new instance.
    pub async fn new(
        runtime: Arc<Runtime>,
        // TODO: check whether we need this
        _spec_id: SpecId,
        remote_url: &str,
        fork_block_number: Option<U256>,
    ) -> Result<Self, CreationError> {
        const FALLBACK_MAX_REORG: u64 = 30;

        let rpc_client = RpcClient::new(remote_url);

        let (chain_id, network_id, latest_block_number) = tokio::join!(
            rpc_client.chain_id(),
            rpc_client.network_id(),
            rpc_client.block_number()
        );

        let chain_id = chain_id?;
        let network_id = network_id?;
        let latest_block_number = latest_block_number?;

        let max_reorg =
            largest_possible_reorg(&chain_id).unwrap_or_else(|| U256::from(FALLBACK_MAX_REORG));

        let safe_block_number = latest_block_number.saturating_sub(max_reorg);

        let fork_block_number = if let Some(fork_block_number) = fork_block_number {
            if fork_block_number > latest_block_number {
                return Err(CreationError::InvalidBlockNumber {
                    fork_block_number,
                    latest_block_number,
                });
            }

            if fork_block_number > safe_block_number {
                let num_confirmations = latest_block_number - fork_block_number + U256::from(1);
                let required_confirmations = max_reorg + U256::from(1);
                let missing_confirmations = required_confirmations - num_confirmations;

                log::warn!("You are forking from block {fork_block_number} which has less than {required_confirmations} confirmations, and will affect Hardhat Network's performance. Please use block number {safe_block_number} or wait for the block to get {missing_confirmations} more confirmations.");
            }

            fork_block_number
        } else {
            safe_block_number
        };

        let hardfork = determine_hardfork(&chain_id, &fork_block_number)
            .ok_or(CreationError::UnsupportedChain { chain_id })?;

        if hardfork < SpecId::SPURIOUS_DRAGON {
            return Err(CreationError::InvalidHardfork {
                chain_name: chain_name(&chain_id)
                    .expect("Must succeed since we found its hardfork")
                    .to_string(),
                fork_block_number,
                hardfork,
            });
        }

        Ok(Self {
            local_storage: ContiguousBlockchainStorage::default(),
            remote: RemoteBlockchain::new(rpc_client, runtime),
            fork_block_number,
            _chain_id: chain_id,
            _network_id: network_id,
        })
    }
}

impl BlockHashRef for ForkedBlockchain {
    type Error = BlockchainError;

    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        if number <= self.fork_block_number {
            self.remote.block_by_number(&number).map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(*block.hash()),
            )
        } else {
            let number = usize::try_from(number).or(Err(BlockchainError::BlockNumberTooLarge))?;
            self.local_storage
                .blocks()
                .get(number)
                .map(|block| *block.hash())
                .ok_or(BlockchainError::UnknownBlockNumber)
        }
    }
}

impl Blockchain for ForkedBlockchain {
    type Error = BlockchainError;

    fn block_by_hash(&self, hash: &B256) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        if let Some(block) = self.local_storage.block_by_hash(hash) {
            Ok(Some(block.clone()))
        } else {
            self.remote
                .block_by_hash(hash)
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    fn block_by_number(&self, number: &U256) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        if *number <= self.fork_block_number {
            self.remote.block_by_number(number).map_or_else(
                |e| Err(BlockchainError::JsonRpcError(e)),
                |block| Ok(Some(block)),
            )
        } else {
            let number = usize::try_from(number).or(Err(BlockchainError::BlockNumberTooLarge))?;
            Ok(self.local_storage.blocks().get(number).cloned())
        }
    }

    fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        if let Some(block) = self
            .local_storage
            .block_by_transaction_hash(transaction_hash)
        {
            Ok(Some(block.clone()))
        } else {
            self.remote
                .block_by_transaction_hash(transaction_hash)
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    fn last_block(&self) -> Result<Arc<DetailedBlock>, Self::Error> {
        if let Some(block) = self.local_storage.blocks().last() {
            Ok(block.clone())
        } else {
            self.remote
                .block_by_number(&self.fork_block_number)
                .map_err(BlockchainError::JsonRpcError)
        }
    }

    fn last_block_number(&self) -> U256 {
        self.fork_block_number + U256::from(self.local_storage.blocks().len())
    }

    fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::Error> {
        if let Some(difficulty) = self.local_storage.total_difficulty_by_hash(hash).cloned() {
            Ok(Some(difficulty))
        } else {
            self.remote
                .total_difficulty_by_hash(hash)
                .map_err(BlockchainError::JsonRpcError)
        }
    }
}

impl BlockchainMut for ForkedBlockchain {
    type Error = BlockchainError;

    fn insert_block(&mut self, block: DetailedBlock) -> Result<Arc<DetailedBlock>, Self::Error> {
        let last_block = self.last_block()?;

        validate_next_block(&last_block, &block)?;

        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
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
}

/// Retrieves the largest possible size of a reorg, i.e. ensures a "safe" block.
///
/// # Source
///
/// These numbers were taken from:
/// <https://github.com/NomicFoundation/hardhat/blob/caa504fe0e53c183578f42d66f4740b8ec147051/packages/hardhat-core/src/internal/hardhat-network/provider/utils/reorgs-protection.ts>
fn largest_possible_reorg(chain_id: &U256) -> Option<U256> {
    let mut network_configs = HashMap::new();
    network_configs.insert(U256::from(1), U256::from(5)); // mainnet
    network_configs.insert(U256::from(3), U256::from(100)); // Ropsten
    network_configs.insert(U256::from(4), U256::from(5)); // Rinkeby
    network_configs.insert(U256::from(5), U256::from(5)); // Goerli
    network_configs.insert(U256::from(42), U256::from(5)); // Kovan
    network_configs.insert(U256::from(100), U256::from(38)); // xDai

    network_configs.get(chain_id).cloned()
}
