use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use rethnet_eth::{
    block::{Block, DetailedBlock, PartialHeader},
    trie::KECCAK_NULL_RLP,
    Bytes, B256, B64, U256, U64,
};
use revm::{db::BlockHashRef, primitives::SpecId};

use crate::state::StateDebug;

use super::{storage::ContiguousBlockchainStorage, Blockchain, BlockchainError, BlockchainMut};

/// An error that occurs upon creation of a [`LocalBlockchain`].
#[derive(Debug, thiserror::Error)]
pub enum CreationError<SE> {
    /// Missing base fee per gas for post-merge blockchain
    #[error("Missing base fee per gas for post-merge blockchain")]
    MissingBaseFee,
    /// Missing prevrandao for post-merge blockchain
    #[error("Missing prevrandao for post-merge blockchain")]
    MissingPrevrandao,
    /// State error
    #[error(transparent)]
    State(SE),
}

#[derive(Debug, thiserror::Error)]
pub enum InsertBlockError {
    #[error("Invalid block numnber: ${actual}. Expected: ${expected}")]
    InvalidBlockNumber { actual: U256, expected: U256 },
}

/// A blockchain consisting of locally created blocks.
#[derive(Debug)]
pub struct LocalBlockchain {
    storage: ContiguousBlockchainStorage,
}

impl LocalBlockchain {
    /// Constructs a new instance using the provided arguments to build a genesis block.
    pub fn new<S: StateDebug>(
        state: &S,
        spec_id: SpecId,
        gas_limit: U256,
        timestamp: Option<U256>,
        prevrandao: Option<B256>,
        base_fee: Option<U256>,
    ) -> Result<Self, CreationError<S::Error>> {
        const EXTRA_DATA: &[u8] = b"124";

        let genesis_block = Block::new(
            PartialHeader {
                state_root: state.state_root().map_err(CreationError::State)?,
                receipts_root: KECCAK_NULL_RLP,
                difficulty: if spec_id >= SpecId::MERGE {
                    U256::ZERO
                } else {
                    U256::from(1)
                },
                number: U256::ZERO,
                gas_limit,
                gas_used: U256::ZERO,
                timestamp: timestamp.unwrap_or_else(|| {
                    U256::from(
                        SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .expect("Current time must be after unix epoch")
                            .as_secs(),
                    )
                }),
                extra_data: Bytes::from(EXTRA_DATA),
                mix_hash: if spec_id >= SpecId::MERGE {
                    prevrandao.ok_or(CreationError::MissingPrevrandao)?
                } else {
                    B256::zero()
                },
                nonce: if spec_id >= SpecId::MERGE {
                    B64::ZERO
                } else {
                    B64::from(U64::from(42))
                },
                base_fee: if spec_id >= SpecId::MERGE {
                    Some(base_fee.ok_or(CreationError::MissingBaseFee)?)
                } else {
                    None
                },
                ..PartialHeader::default()
            },
            Vec::new(),
            Vec::new(),
        );

        Ok(unsafe {
            Self::with_genesis_block_unchecked(DetailedBlock::new(
                genesis_block,
                Vec::new(),
                Vec::new(),
            ))
        })
    }

    /// Constructs a new instance with the provided genesis block, validating a zero block number.
    pub fn with_genesis_block(genesis_block: DetailedBlock) -> Result<Self, InsertBlockError> {
        if genesis_block.header.number != U256::ZERO {
            return Err(InsertBlockError::InvalidBlockNumber {
                actual: genesis_block.header.number,
                expected: U256::ZERO,
            });
        }

        Ok(unsafe { Self::with_genesis_block_unchecked(genesis_block) })
    }

    /// Constructs a new instance with the provided genesis block, without validating the provided block's number.
    ///
    /// # Safety
    ///
    /// Ensure that the genesis block's number is zero.
    pub unsafe fn with_genesis_block_unchecked(genesis_block: DetailedBlock) -> Self {
        let total_difficulty = genesis_block.header.difficulty;
        let storage = ContiguousBlockchainStorage::with_block(genesis_block, total_difficulty);

        Self { storage }
    }
}

impl Blockchain for LocalBlockchain {
    type Error = BlockchainError;

    fn block_by_hash(&self, hash: &B256) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        Ok(self.storage.block_by_hash(hash).cloned())
    }

    fn block_by_number(&self, number: &U256) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        let number = usize::try_from(number).map_err(|_| BlockchainError::BlockNumberTooLarge)?;

        Ok(self.storage.blocks().get(number).cloned())
    }

    fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, Self::Error> {
        Ok(self
            .storage
            .block_by_transaction_hash(transaction_hash)
            .cloned())
    }

    fn last_block(&self) -> Result<Arc<DetailedBlock>, Self::Error> {
        Ok(self
            .storage
            .blocks()
            .last()
            .expect("A genesis block is always present")
            .clone())
    }

    fn last_block_number(&self) -> U256 {
        // The block number of the genesis block is 0, so subtract one
        U256::from(self.storage.blocks().len() - 1)
    }

    fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::Error> {
        Ok(self.storage.total_difficulty_by_hash(hash).cloned())
    }
}

impl BlockchainMut for LocalBlockchain {
    type Error = BlockchainError;

    fn insert_block(&mut self, block: DetailedBlock) -> Result<Arc<DetailedBlock>, Self::Error> {
        let last_block = self.last_block()?;

        let next_block_number = last_block.header.number + U256::from(1);
        if block.header.number != next_block_number {
            return Err(BlockchainError::InvalidBlockNumber {
                actual: block.header.number,
                expected: next_block_number,
            });
        }

        if block.header.parent_hash != last_block.header.hash() {
            return Err(BlockchainError::InvalidParentHash);
        }

        let previous_total_difficulty = self
            .storage
            .total_difficulties()
            .last()
            .expect("Storage always contains at least one block");

        let total_difficulty = previous_total_difficulty + block.header.difficulty;

        // SAFETY: The block number is guaranteed to be unique, so the block hash must be too.
        let block = unsafe { self.storage.insert_block_unchecked(block, total_difficulty) };

        Ok(block.clone())
    }
}

impl BlockHashRef for LocalBlockchain {
    type Error = BlockchainError;

    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        // Question: Do we need to support block number larger than usize::MAX
        let number = usize::try_from(number).map_err(|_| BlockchainError::BlockNumberTooLarge)?;

        self.storage
            .blocks()
            .get(number)
            .map(|block| block.header.hash())
            .ok_or(BlockchainError::UnknownBlockNumber)
    }
}
