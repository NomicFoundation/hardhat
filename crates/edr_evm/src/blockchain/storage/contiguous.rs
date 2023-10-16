use std::sync::Arc;

use edr_eth::{receipt::BlockReceipt, B256, U256};
use revm::primitives::HashMap;

use crate::{Block, LocalBlock};

use super::InsertError;

/// A storage solution for storing a Blockchain's blocks contiguously in-memory.
#[derive(Clone, Default, Debug)]
pub struct ContiguousBlockchainStorage<BlockT: Block + Clone + ?Sized> {
    blocks: Vec<BlockT>,
    hash_to_block: HashMap<B256, BlockT>,
    total_difficulties: Vec<U256>,
    transaction_hash_to_block: HashMap<B256, BlockT>,
    transaction_hash_to_receipt: HashMap<B256, Arc<BlockReceipt>>,
}

impl<BlockT: Block + Clone> ContiguousBlockchainStorage<BlockT> {
    /// Retrieves the instance's blocks.
    pub fn blocks(&self) -> &[BlockT] {
        &self.blocks
    }

    /// Retrieves a block by its hash.
    pub fn block_by_hash(&self, hash: &B256) -> Option<&BlockT> {
        self.hash_to_block.get(hash)
    }

    /// Retrieves the block that contains the transaction with the provided hash, if it exists.
    pub fn block_by_transaction_hash(&self, transaction_hash: &B256) -> Option<&BlockT> {
        self.transaction_hash_to_block.get(transaction_hash)
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it exists.
    pub fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<&Arc<BlockReceipt>> {
        self.transaction_hash_to_receipt.get(transaction_hash)
    }

    /// Reverts to the block with the provided number, deleting all later blocks.
    pub fn revert_to_block(&mut self, block_number: &U256) -> bool {
        let block_number = usize::try_from(block_number)
            .expect("No blocks with a number larger than usize::MAX are inserted");

        let block_index = if let Some(first_block) = self.blocks.first() {
            let first_block_number = usize::try_from(first_block.header().number)
                .expect("No blocks with a number larger than usize::MAX are inserted");

            if block_number < first_block_number {
                return false;
            }

            block_number - first_block_number
        } else {
            return false;
        };

        if block_index >= self.blocks.len() {
            return false;
        }

        self.total_difficulties.truncate(block_index + 1);
        let removed_blocks = self.blocks.split_off(block_index + 1);

        for block in removed_blocks {
            let block_hash = block.hash();

            self.hash_to_block.remove(block_hash);
            self.transaction_hash_to_block.remove(block_hash);
            self.transaction_hash_to_receipt.remove(block_hash);
        }

        true
    }

    /// Retrieves the instance's total difficulties.
    pub fn total_difficulties(&self) -> &[U256] {
        &self.total_difficulties
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<&U256> {
        self.hash_to_block.get(hash).map(|block| {
            let first_block_number = self
                .blocks
                .first()
                .expect("A block must exist since we found one")
                .header()
                .number;

            let local_block_number = usize::try_from(block.header().number - first_block_number)
                .expect("No blocks with a number larger than usize::MAX are inserted");

            // SAFETY: A total difficulty is inserted for each block
            unsafe { self.total_difficulties.get_unchecked(local_block_number) }
        })
    }
}

impl<BlockT: Block + Clone + From<LocalBlock>> ContiguousBlockchainStorage<BlockT> {
    /// Constructs a new instance with the provided block.
    pub fn with_block(block: LocalBlock, total_difficulty: U256) -> Self {
        let block_hash = block.hash();

        let transaction_hash_to_receipt = block
            .transaction_receipts()
            .iter()
            .map(|receipt| (receipt.transaction_hash, receipt.clone()))
            .collect();

        let block = BlockT::from(block);

        let transaction_hash_to_block = block
            .transactions()
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
            transaction_hash_to_receipt,
        }
    }

    /// Inserts a block, failing if a block with the same hash already exists.
    pub fn insert_block(
        &mut self,
        block: LocalBlock,
        total_difficulty: U256,
    ) -> Result<&BlockT, InsertError> {
        let block_hash = block.hash();

        // As blocks are contiguous, we are guaranteed that the block number won't exist if its
        // hash is not present.
        if self.hash_to_block.contains_key(block_hash) {
            return Err(InsertError::DuplicateBlock {
                block_hash: *block_hash,
                block_number: block.header().number,
            });
        }

        if let Some(transaction) = block.transactions().iter().find(|transaction| {
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
        block: LocalBlock,
        total_difficulty: U256,
    ) -> &BlockT {
        self.transaction_hash_to_receipt.extend(
            block
                .transaction_receipts()
                .iter()
                .map(|receipt| (receipt.transaction_hash, receipt.clone())),
        );

        let block = BlockT::from(block);

        self.transaction_hash_to_block.extend(
            block
                .transactions()
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
