use std::{collections::BTreeMap, sync::Arc};

use edr_eth::{receipt::BlockReceipt, SpecId, B256, U256};
use edr_evm::{
    blockchain::{Blockchain, BlockchainError, BlockchainMut, SyncBlockchain},
    db::BlockHashRef,
    state::{StateDiff, StateError, StateOverride, SyncState},
    LocalBlock, SyncBlock,
};

/// A blockchain with a pending block.
///
/// # Panics
///
/// Panics if a state override is provided to `state_at_block_number` for the
/// pending block; or if the `BlockchainMut` methods are called.
///
/// WORKAROUND: This struct needs to implement all sub-traits of
/// [`SyncBlockchain`] because we cannot upcast the trait at its usage site
/// <https://github.com/NomicFoundation/edr/issues/244>
#[derive(Debug)]
pub(crate) struct BlockchainWithPending<'blockchain> {
    blockchain: &'blockchain dyn SyncBlockchain<BlockchainError, StateError>,
    pending_block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    pending_state_diff: StateDiff,
}

impl<'blockchain> BlockchainWithPending<'blockchain> {
    /// Constructs a new instance with the provided blockchain and pending
    /// block.
    pub fn new(
        blockchain: &'blockchain dyn SyncBlockchain<BlockchainError, StateError>,
        pending_block: LocalBlock,
        pending_state_diff: StateDiff,
    ) -> Self {
        Self {
            blockchain,
            pending_block: Arc::new(pending_block),
            pending_state_diff,
        }
    }
}

impl<'blockchain> Blockchain for BlockchainWithPending<'blockchain> {
    type BlockchainError = BlockchainError;

    type StateError = StateError;

    fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        if hash == self.pending_block.hash() {
            Ok(Some(self.pending_block.clone()))
        } else {
            self.blockchain.block_by_hash(hash)
        }
    }

    fn block_by_number(
        &self,
        number: u64,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        if number == self.pending_block.header().number {
            Ok(Some(self.pending_block.clone()))
        } else {
            self.blockchain.block_by_number(number)
        }
    }

    fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        let contains_transaction = self
            .pending_block
            .transactions()
            .iter()
            .any(|tx| tx.hash() == transaction_hash);

        if contains_transaction {
            Ok(Some(self.pending_block.clone()))
        } else {
            self.blockchain.block_by_transaction_hash(transaction_hash)
        }
    }

    fn chain_id(&self) -> u64 {
        self.blockchain.chain_id()
    }

    fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::BlockchainError>>, Self::BlockchainError> {
        Ok(self.pending_block.clone())
    }

    fn last_block_number(&self) -> u64 {
        self.pending_block.header().number
    }

    fn logs(
        &self,
        _from_block: u64,
        _to_block: u64,
        _addresses: &edr_evm::HashSet<edr_eth::Address>,
        _normalized_topics: &Vec<Option<Vec<B256>>>,
    ) -> Result<Vec<edr_eth::log::FilterLog>, Self::BlockchainError> {
        panic!("Retrieving logs from a pending blockchain is not supported.");
    }

    fn network_id(&self) -> u64 {
        self.blockchain.network_id()
    }

    fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, Self::BlockchainError> {
        let pending_receipt = self
            .pending_block
            .transaction_receipts()?
            .into_iter()
            .find(|receipt| receipt.transaction_hash == *transaction_hash);

        if let Some(pending_receipt) = pending_receipt {
            Ok(Some(pending_receipt))
        } else {
            self.blockchain
                .receipt_by_transaction_hash(transaction_hash)
        }
    }

    fn spec_at_block_number(&self, block_number: u64) -> Result<SpecId, Self::BlockchainError> {
        if block_number == self.pending_block.header().number {
            Ok(self.blockchain.spec_id())
        } else {
            self.blockchain.spec_at_block_number(block_number)
        }
    }

    fn spec_id(&self) -> SpecId {
        self.blockchain.spec_id()
    }

    fn state_at_block_number(
        &self,
        block_number: u64,
        state_overrides: &BTreeMap<u64, StateOverride>,
    ) -> Result<Box<dyn SyncState<Self::StateError>>, Self::BlockchainError> {
        if block_number == self.pending_block.header().number {
            assert!(
                state_overrides.get(&block_number).is_none(),
                "State overrides are not supported for a pending block."
            );

            let mut state = self
                .blockchain
                .state_at_block_number(block_number - 1, state_overrides)?;

            state.commit(self.pending_state_diff.as_inner().clone());

            Ok(state)
        } else {
            self.blockchain
                .state_at_block_number(block_number, state_overrides)
        }
    }

    fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::BlockchainError> {
        if hash == self.pending_block.hash() {
            let previous_total_difficulty = self
                .blockchain
                .total_difficulty_by_hash(&self.pending_block.header().parent_hash)?
                .expect("At least one block should exist before the pending block.");

            Ok(Some(
                previous_total_difficulty + self.pending_block.header().difficulty,
            ))
        } else {
            self.blockchain.total_difficulty_by_hash(hash)
        }
    }
}

impl<'blockchain> BlockchainMut for BlockchainWithPending<'blockchain> {
    type Error = BlockchainError;

    fn insert_block(
        &mut self,
        _block: LocalBlock,
        _state_diff: StateDiff,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::Error>>, Self::Error> {
        panic!("Inserting blocks into a pending blockchain is not supported.");
    }

    fn reserve_blocks(&mut self, _additional: u64, _interval: u64) -> Result<(), Self::Error> {
        panic!("Reserving blocks in a pending blockchain is not supported.");
    }

    fn revert_to_block(&mut self, _block_number: u64) -> Result<(), Self::Error> {
        panic!("Reverting blocks in a pending blockchain is not supported.");
    }
}

impl<'blockchain> BlockHashRef for BlockchainWithPending<'blockchain> {
    type Error = BlockchainError;

    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        if number == U256::from(self.pending_block.header().number) {
            Ok(*self.pending_block.hash())
        } else {
            self.blockchain.block_hash(number)
        }
    }
}
