use std::sync::Arc;

use hashbrown::HashMap;
use rethnet_eth::{block::DetailedBlock, B256, U256};

use super::InsertError;

/// A storage solution for storing a Blockchain's blocks contiguously in-memory.
#[derive(Clone, Default, Debug)]
pub struct ContiguousBlockchainStorage {
    blocks: Vec<Arc<DetailedBlock>>,
    hash_to_block: HashMap<B256, Arc<DetailedBlock>>,
    total_difficulties: Vec<U256>,
    transaction_hash_to_block: HashMap<B256, Arc<DetailedBlock>>,
}

impl ContiguousBlockchainStorage {
    /// Constructs a new instance with the provided block.
    pub fn with_block(block: DetailedBlock, total_difficulty: U256) -> Self {
        let block = Arc::new(block);
        let block_hash = block.hash();

        let transaction_hash_to_block = block
            .transactions
            .iter()
            .map(|transaction| (transaction.hash(), block.clone()))
            .collect();

        let mut hash_to_block = HashMap::new();
        hash_to_block.insert(*block_hash, block.clone());

        Self {
            total_difficulties: vec![total_difficulty],
            blocks: vec![block],
            hash_to_block,
            transaction_hash_to_block,
        }
    }

    /// Retrieves the instance's blocks.
    pub fn blocks(&self) -> &[Arc<DetailedBlock>] {
        &self.blocks
    }

    /// Retrieves a block by its hash.
    pub fn block_by_hash(&self, hash: &B256) -> Option<&Arc<DetailedBlock>> {
        self.hash_to_block.get(hash)
    }

    /// Retrieves the block containing the transaction with the given hash, if it exists.
    pub fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<&Arc<DetailedBlock>> {
        self.transaction_hash_to_block.get(transaction_hash)
    }

    /// Retrieves the instance's total difficulties.
    pub fn total_difficulties(&self) -> &[U256] {
        &self.total_difficulties
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<&U256> {
        self.hash_to_block.get(hash).map(|block| {
            let block_number = usize::try_from(block.header.number)
                .expect("No blocks with a number larger than usize::MAX are inserted");

            // SAFETY: A total difficulty is inserted for each block
            unsafe { self.total_difficulties.get_unchecked(block_number) }
        })
    }

    /// Inserts a block, failing if a block with the same hash already exists.
    pub fn insert_block(
        &mut self,
        block: DetailedBlock,
        total_difficulty: U256,
    ) -> Result<&Arc<DetailedBlock>, InsertError> {
        let block_hash = block.hash();

        // As blocks are contiguous, we are guaranteed that the block number won't exist if its
        // hash is not present.
        if self.hash_to_block.contains_key(block_hash) {
            return Err(InsertError::DuplicateBlock {
                block_hash: *block_hash,
                block_number: block.header.number,
            });
        }

        if let Some(transaction) = block.transactions.iter().find(|transaction| {
            self.transaction_hash_to_block
                .contains_key(&transaction.hash())
        }) {
            return Err(InsertError::DuplicateTransaction {
                hash: transaction.hash(),
            });
        }

        // SAFETY: We checked that block hash doesn't exist yet
        Ok(unsafe { self.insert_block_unchecked(block, total_difficulty) })
    }

    /// Inserts a block without checking its validity.
    ///
    /// # Safety
    ///
    /// Ensure that the instance does not contain a block with the same hash, nor
    /// any transactions with the same hash.
    pub unsafe fn insert_block_unchecked(
        &mut self,
        block: DetailedBlock,
        total_difficulty: U256,
    ) -> &Arc<DetailedBlock> {
        let block = Arc::new(block);

        self.transaction_hash_to_block.extend(
            block
                .transactions
                .iter()
                .map(|transaction| (transaction.hash(), block.clone())),
        );

        self.blocks.push(block.clone());
        self.total_difficulties.push(total_difficulty);
        self.hash_to_block
            .insert_unique_unchecked(*block.hash(), block)
            .1
    }
}
