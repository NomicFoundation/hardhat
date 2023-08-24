use std::sync::Arc;

use rethnet_eth::{block::DetailedBlock, receipt::BlockReceipt, B256, U256};
use revm::primitives::HashMap;

use super::InsertError;

/// A storage solution for storing a subset of a Blockchain's blocks in-memory.
#[derive(Default, Debug)]
pub struct SparseBlockchainStorage {
    hash_to_block: HashMap<B256, Arc<DetailedBlock>>,
    hash_to_total_difficulty: HashMap<B256, U256>,
    number_to_block: HashMap<U256, Arc<DetailedBlock>>,
    transaction_hash_to_block: HashMap<B256, Arc<DetailedBlock>>,
    transaction_hash_to_receipt: HashMap<B256, Arc<BlockReceipt>>,
}

impl SparseBlockchainStorage {
    /// Constructs a new instance with the provided block.
    pub fn with_block(block: DetailedBlock, total_difficulty: U256) -> Self {
        let block = Arc::new(block);
        let block_hash = block.hash();

        let transaction_hash_to_receipt = block
            .transaction_receipts()
            .iter()
            .map(|receipt| (receipt.transaction_hash, receipt.clone()))
            .collect();

        let transaction_hash_to_block = block
            .transactions
            .iter()
            .map(|transaction| (transaction.hash(), block.clone()))
            .collect();

        let mut hash_to_block = HashMap::new();
        hash_to_block.insert(*block_hash, block.clone());

        let mut hash_to_total_difficulty = HashMap::new();
        hash_to_total_difficulty.insert(*block_hash, total_difficulty);

        let mut number_to_block = HashMap::new();
        number_to_block.insert(block.header.number, block);

        Self {
            hash_to_block,
            hash_to_total_difficulty,
            number_to_block,
            transaction_hash_to_block,
            transaction_hash_to_receipt,
        }
    }

    /// Retrieves the block by hash, if it exists.
    pub fn block_by_hash(&self, hash: &B256) -> Option<&Arc<DetailedBlock>> {
        self.hash_to_block.get(hash)
    }

    /// Retrieves the block by number, if it exists.
    pub fn block_by_number(&self, number: &U256) -> Option<&Arc<DetailedBlock>> {
        self.number_to_block.get(number)
    }

    /// Retrieves the block that contains the transaction with the provided hash, if it exists.
    pub fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<&Arc<DetailedBlock>> {
        self.transaction_hash_to_block.get(transaction_hash)
    }

    /// Retrieves whether a block with the provided number exists.
    pub fn contains_block_number(&self, number: &U256) -> bool {
        self.number_to_block.contains_key(number)
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it exists.
    pub fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<&Arc<BlockReceipt>> {
        self.transaction_hash_to_receipt.get(transaction_hash)
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<&U256> {
        self.hash_to_total_difficulty.get(hash)
    }

    /// Inserts a block, failing if a block with the same hash or number already exists.
    pub fn insert_block(
        &mut self,
        block: DetailedBlock,
        total_difficulty: U256,
    ) -> Result<&Arc<DetailedBlock>, InsertError> {
        let block_hash = block.hash();
        if self.hash_to_block.contains_key(block_hash)
            || self.number_to_block.contains_key(&block.header.number)
        {
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

        // SAFETY: We already checked that the block hash and number are unique
        Ok(unsafe { self.insert_block_unchecked(block, total_difficulty) })
    }

    /// Inserts a block without checking its validity.
    ///
    /// # Safety
    ///
    /// Ensure that the instance does not contain a block with the same hash or number,
    /// nor any transactions with the same hash.
    pub unsafe fn insert_block_unchecked(
        &mut self,
        block: DetailedBlock,
        total_difficulty: U256,
    ) -> &Arc<DetailedBlock> {
        let block = Arc::new(block);
        let block_hash = block.hash();

        self.transaction_hash_to_receipt.extend(
            block
                .transaction_receipts()
                .iter()
                .map(|receipt| (receipt.transaction_hash, receipt.clone())),
        );

        self.transaction_hash_to_block.extend(
            block
                .transactions
                .iter()
                .map(|transaction| (transaction.hash(), block.clone())),
        );

        self.hash_to_block
            .insert_unique_unchecked(*block_hash, block.clone());

        self.hash_to_total_difficulty
            .insert_unique_unchecked(*block_hash, total_difficulty);

        self.number_to_block
            .insert_unique_unchecked(block.header.number, block)
            .1
    }

    /// Inserts a receipt, without checking whether it already exists.
    ///
    /// # Safety
    ///
    /// Ensure that the instance does not contain a receipt with the same transaction hash.
    pub unsafe fn insert_receipt_unchecked(&mut self, receipt: BlockReceipt) -> &Arc<BlockReceipt> {
        let receipt = Arc::new(receipt);

        self.transaction_hash_to_receipt
            .insert_unique_unchecked(receipt.transaction_hash, receipt)
            .1
    }
}
