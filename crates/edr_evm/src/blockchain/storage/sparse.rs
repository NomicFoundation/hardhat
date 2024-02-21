use std::sync::Arc;

use edr_eth::{
    receipt::BlockReceipt,
    remote::filter::{matches_address_filter, matches_topics_filter},
    Address, B256, U256,
};
use revm::primitives::{HashMap, HashSet};

use super::InsertError;
use crate::{hash_map::OccupiedError, Block};

/// A storage solution for storing a subset of a Blockchain's blocks in-memory.
#[derive(Debug)]
pub struct SparseBlockchainStorage<BlockT: Block + Clone + ?Sized> {
    hash_to_block: HashMap<B256, BlockT>,
    hash_to_total_difficulty: HashMap<B256, U256>,
    number_to_block: HashMap<u64, BlockT>,
    transaction_hash_to_block: HashMap<B256, BlockT>,
    transaction_hash_to_receipt: HashMap<B256, Arc<BlockReceipt>>,
}

impl<BlockT: Block + Clone + ?Sized> SparseBlockchainStorage<BlockT> {
    /// Constructs a new instance with the provided block.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_block(block: BlockT, total_difficulty: U256) -> Self {
        let block_hash = block.hash();

        let transaction_hash_to_block = block
            .transactions()
            .iter()
            .map(|transaction| (*transaction.hash(), block.clone()))
            .collect();

        let mut hash_to_block = HashMap::new();
        hash_to_block.insert(*block_hash, block.clone());

        let mut hash_to_total_difficulty = HashMap::new();
        hash_to_total_difficulty.insert(*block_hash, total_difficulty);

        let mut number_to_block = HashMap::new();
        number_to_block.insert(block.header().number, block);

        Self {
            hash_to_block,
            hash_to_total_difficulty,
            number_to_block,
            transaction_hash_to_block,
            transaction_hash_to_receipt: HashMap::new(),
        }
    }

    /// Retrieves the block by hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_hash(&self, hash: &B256) -> Option<&BlockT> {
        self.hash_to_block.get(hash)
    }

    /// Retrieves the block by number, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_number(&self, number: u64) -> Option<&BlockT> {
        self.number_to_block.get(&number)
    }

    /// Retrieves the block that contains the transaction with the provided
    /// hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_transaction_hash(&self, transaction_hash: &B256) -> Option<&BlockT> {
        self.transaction_hash_to_block.get(transaction_hash)
    }

    /// Retrieves whether a block with the provided number exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn contains_block_number(&self, block_number: u64) -> bool {
        self.number_to_block.contains_key(&block_number)
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it
    /// exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<&Arc<BlockReceipt>> {
        self.transaction_hash_to_receipt.get(transaction_hash)
    }

    /// Reverts to the block with the provided number, deleting all later
    /// blocks.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn revert_to_block(&mut self, block_number: u64) {
        let removed_blocks = self
            .number_to_block
            .extract_if(|number, _| *number > block_number);

        for (_, block) in removed_blocks {
            let block_hash = block.hash();

            self.hash_to_block.remove(block_hash);
            self.hash_to_total_difficulty.remove(block_hash);

            for transaction in block.transactions() {
                let transaction_hash = transaction.hash();

                self.transaction_hash_to_block.remove(transaction_hash);
                self.transaction_hash_to_receipt.remove(transaction_hash);
            }
        }
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<&U256> {
        self.hash_to_total_difficulty.get(hash)
    }

    /// Inserts a block. Errors if a block with the same hash or number already
    /// exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn insert_block(
        &mut self,
        block: BlockT,
        total_difficulty: U256,
    ) -> Result<&BlockT, InsertError> {
        let block_hash = block.hash();
        let block_header = block.header();

        if self.hash_to_block.contains_key(block_hash)
            || self.hash_to_total_difficulty.contains_key(block_hash)
            || self.number_to_block.contains_key(&block_header.number)
        {
            return Err(InsertError::DuplicateBlock {
                block_hash: *block_hash,
                block_number: block_header.number,
            });
        }

        if let Some(transaction) = block.transactions().iter().find(|transaction| {
            self.transaction_hash_to_block
                .contains_key(transaction.hash())
        }) {
            return Err(InsertError::DuplicateTransaction {
                hash: *transaction.hash(),
            });
        }

        self.transaction_hash_to_block.extend(
            block
                .transactions()
                .iter()
                .map(|transaction| (*transaction.hash(), block.clone())),
        );

        // We have checked that the block hash and number are not in the maps, so it's
        // ok to use unchecked.
        self.hash_to_block
            .insert_unique_unchecked(*block_hash, block.clone());

        self.hash_to_total_difficulty
            .insert_unique_unchecked(*block_hash, total_difficulty);

        Ok(self
            .number_to_block
            .insert_unique_unchecked(block.header().number, block)
            .1)
    }

    /// Inserts a receipt. Errors if it already exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn insert_receipt(
        &mut self,
        receipt: BlockReceipt,
    ) -> Result<&Arc<BlockReceipt>, InsertError> {
        let receipt = Arc::new(receipt);

        let receipt = self
            .transaction_hash_to_receipt
            .try_insert(receipt.transaction_hash, receipt)
            .map_err(|err| {
                let OccupiedError { value, .. } = err;
                InsertError::DuplicateReceipt {
                    transaction_hash: value.transaction_hash,
                }
            })?;
        Ok(receipt)
    }

    /// Inserts receipts. Errors if they already exist.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn insert_receipts(&mut self, receipts: Vec<Arc<BlockReceipt>>) -> Result<(), InsertError> {
        if let Some(receipt) = receipts.iter().find(|receipt| {
            self.transaction_hash_to_receipt
                .contains_key(&receipt.transaction_hash)
        }) {
            return Err(InsertError::DuplicateReceipt {
                transaction_hash: receipt.transaction_hash,
            });
        }

        self.transaction_hash_to_receipt.extend(
            receipts
                .iter()
                .map(|receipt| (receipt.transaction_hash, receipt.clone())),
        );

        Ok(())
    }
}

impl<BlockT: Block + Clone> Default for SparseBlockchainStorage<BlockT> {
    fn default() -> Self {
        Self {
            hash_to_block: HashMap::default(),
            hash_to_total_difficulty: HashMap::default(),
            number_to_block: HashMap::default(),
            transaction_hash_to_block: HashMap::default(),
            transaction_hash_to_receipt: HashMap::default(),
        }
    }
}

/// Retrieves the logs that match the provided filter.
pub fn logs<BlockT: Block + Clone>(
    storage: &SparseBlockchainStorage<BlockT>,
    from_block: u64,
    to_block: u64,
    addresses: &HashSet<Address>,
    topics_filter: &[Option<Vec<B256>>],
) -> Result<Vec<edr_eth::log::FilterLog>, BlockT::Error> {
    let mut logs = Vec::new();
    let addresses: HashSet<Address> = addresses.iter().copied().collect();

    for block_number in from_block..=to_block {
        if let Some(block) = storage.block_by_number(block_number) {
            let receipts = block.transaction_receipts()?;
            for receipt in receipts {
                let filtered_logs = receipt.logs.iter().filter(|log| {
                    matches_address_filter(&log.address, &addresses)
                        && matches_topics_filter(&log.topics, topics_filter)
                });

                logs.extend(filtered_logs.cloned());
            }
        }
    }

    Ok(logs)
}
