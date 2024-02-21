use std::{num::NonZeroU64, sync::Arc};

use edr_eth::{block::PartialHeader, receipt::BlockReceipt, Address, SpecId, B256, U256};
use parking_lot::{RwLock, RwLockUpgradableReadGuard, RwLockWriteGuard};
use revm::primitives::{HashMap, HashSet};

use super::{sparse, SparseBlockchainStorage};
use crate::{state::StateDiff, Block, LocalBlock};

/// A reservation for a sequence of blocks that have not yet been inserted into
/// storage.
#[derive(Debug)]
struct Reservation {
    first_number: u64,
    last_number: u64,
    interval: u64,
    previous_base_fee_per_gas: Option<U256>,
    previous_state_root: B256,
    previous_total_difficulty: U256,
    previous_diff_index: usize,
    spec_id: SpecId,
}

/// A storage solution for storing a subset of a Blockchain's blocks in-memory,
/// while lazily loading blocks that have been reserved.
#[derive(Debug)]
pub struct ReservableSparseBlockchainStorage<BlockT: Block + Clone + ?Sized> {
    reservations: RwLock<Vec<Reservation>>,
    storage: RwLock<SparseBlockchainStorage<BlockT>>,
    // We can store the state diffs contiguously, as reservations don't contain any diffs.
    // Diffs are a mapping from one state to the next, so the genesis block contains the initial
    // state.
    state_diffs: Vec<(u64, StateDiff)>,
    number_to_diff_index: HashMap<u64, usize>,
    last_block_number: u64,
}

impl<BlockT: Block + Clone> ReservableSparseBlockchainStorage<BlockT> {
    /// Constructs a new instance with the provided block as genesis block.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_genesis_block(block: BlockT, diff: StateDiff, total_difficulty: U256) -> Self {
        Self {
            reservations: RwLock::new(Vec::new()),
            storage: RwLock::new(SparseBlockchainStorage::with_block(block, total_difficulty)),
            state_diffs: vec![(0, diff)],
            number_to_diff_index: std::iter::once((0, 0)).collect(),
            last_block_number: 0,
        }
    }

    /// Constructs a new instance with no blocks.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn empty(last_block_number: u64) -> Self {
        Self {
            reservations: RwLock::new(Vec::new()),
            storage: RwLock::new(SparseBlockchainStorage::default()),
            state_diffs: Vec::new(),
            number_to_diff_index: HashMap::new(),
            last_block_number,
        }
    }

    /// Retrieves the block by hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_hash(&self, hash: &B256) -> Option<BlockT> {
        self.storage.read().block_by_hash(hash).cloned()
    }

    /// Retrieves the block that contains the transaction with the provided
    /// hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_transaction_hash(&self, transaction_hash: &B256) -> Option<BlockT> {
        self.storage
            .read()
            .block_by_transaction_hash(transaction_hash)
            .cloned()
    }

    /// Retrieves whether a block with the provided number exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn contains_block_number(&self, number: u64) -> bool {
        self.storage.read().contains_block_number(number)
    }

    /// Retrieves the last block number.
    pub fn last_block_number(&self) -> u64 {
        self.last_block_number
    }

    /// Retrieves the logs that match the provided filter.
    pub fn logs(
        &self,
        from_block: u64,
        to_block: u64,
        addresses: &HashSet<Address>,
        normalized_topics: &[Option<Vec<B256>>],
    ) -> Result<Vec<edr_eth::log::FilterLog>, BlockT::Error> {
        let storage = self.storage.read();
        sparse::logs(&storage, from_block, to_block, addresses, normalized_topics)
    }

    /// Retrieves the sequence of diffs from the genesis state to the state of
    /// the block with the provided number, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn state_diffs_until_block(&self, block_number: u64) -> Option<&[(u64, StateDiff)]> {
        let diff_index = self
            .number_to_diff_index
            .get(&block_number)
            .copied()
            .or_else(|| {
                let reservations = self.reservations.read();
                find_reservation(&reservations, block_number)
                    .map(|reservation| reservation.previous_diff_index)
            })?;

        Some(&self.state_diffs[0..=diff_index])
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it
    /// exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<Arc<BlockReceipt>> {
        self.storage
            .read()
            .receipt_by_transaction_hash(transaction_hash)
            .cloned()
    }

    /// Reserves the provided number of blocks, starting from the next block
    /// number.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn reserve_blocks(
        &mut self,
        additional: NonZeroU64,
        interval: u64,
        previous_base_fee: Option<U256>,
        previous_state_root: B256,
        previous_total_difficulty: U256,
        spec_id: SpecId,
    ) {
        let reservation = Reservation {
            first_number: self.last_block_number + 1,
            last_number: self.last_block_number + additional.get(),
            interval,
            previous_base_fee_per_gas: previous_base_fee,
            previous_state_root,
            previous_total_difficulty,
            previous_diff_index: self.state_diffs.len() - 1,
            spec_id,
        };

        self.reservations.get_mut().push(reservation);
        self.last_block_number += additional.get();
    }

    /// Reverts to the block with the provided number, deleting all later
    /// blocks.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn revert_to_block(&mut self, block_number: u64) -> bool {
        if block_number > self.last_block_number {
            return false;
        }

        self.last_block_number = block_number;

        self.storage.get_mut().revert_to_block(block_number);

        if block_number == 0 {
            // Reservations and state diffs can only occur after the genesis block,
            // so we can clear them all
            self.reservations.get_mut().clear();

            // Keep the genesis block's diff
            self.state_diffs.truncate(1);

            // Keep the genesis block's mapping
            self.number_to_diff_index.clear();
            self.number_to_diff_index.insert(0, 0);
        } else {
            // Only retain reservations that are not fully reverted
            self.reservations.get_mut().retain_mut(|reservation| {
                if reservation.last_number <= block_number {
                    true
                } else if reservation.first_number <= block_number {
                    reservation.last_number = block_number;
                    true
                } else {
                    false
                }
            });

            // Remove all diffs that are newer than the reverted block
            let diff_index = self
                .number_to_diff_index
                .get(&block_number)
                .copied()
                .unwrap_or_else(|| {
                    let reservations = self.reservations.get_mut();

                    find_reservation(reservations, block_number)
                    .expect("There must either be a block or a reservation matching the block number").previous_diff_index
                });

            self.state_diffs.truncate(diff_index + 1);

            self.number_to_diff_index
                .retain(|number, _| *number <= block_number);
        }

        true
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<U256> {
        self.storage.read().total_difficulty_by_hash(hash).cloned()
    }
}

impl<BlockT: Block + Clone + From<LocalBlock>> ReservableSparseBlockchainStorage<BlockT> {
    /// Retrieves the block by number, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn block_by_number(&self, number: u64) -> Option<BlockT> {
        self.try_fulfilling_reservation(number)
            .or_else(|| self.storage.read().block_by_number(number).cloned())
    }

    /// Inserts a block without checking its validity.
    ///
    /// # Safety
    ///
    /// Ensure that the instance does not contain a block with the same hash or
    /// number, nor any transactions with the same hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub unsafe fn insert_block_unchecked(
        &mut self,
        block: LocalBlock,
        state_diff: StateDiff,
        total_difficulty: U256,
    ) -> &BlockT {
        self.last_block_number = block.header().number;
        self.number_to_diff_index
            .insert(self.last_block_number, self.state_diffs.len());

        self.state_diffs.push((self.last_block_number, state_diff));

        let receipts: Vec<_> = block.transaction_receipts().to_vec();
        let block = BlockT::from(block);

        self.storage
            .get_mut()
            .insert_receipts_unchecked(receipts, block.clone());

        self.storage
            .get_mut()
            .insert_block_unchecked(block, total_difficulty)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_fulfilling_reservation(&self, block_number: u64) -> Option<BlockT> {
        let reservations = self.reservations.upgradable_read();

        reservations
            .iter()
            .enumerate()
            .find_map(|(idx, reservation)| {
                if reservation.first_number <= block_number
                    && block_number <= reservation.last_number
                {
                    Some(idx)
                } else {
                    None
                }
            })
            .map(|idx| {
                let mut reservations = RwLockUpgradableReadGuard::upgrade(reservations);
                let reservation = reservations.remove(idx);

                if block_number != reservation.first_number {
                    reservations.push(Reservation {
                        last_number: block_number - 1,
                        ..reservation
                    });
                }

                if block_number != reservation.last_number {
                    reservations.push(Reservation {
                        first_number: block_number + 1,
                        ..reservation
                    });
                }

                let reservations = RwLockWriteGuard::downgrade(reservations);
                let storage = self.storage.upgradable_read();

                let timestamp = calculate_timestamp_for_reserved_block(
                    &storage,
                    &reservations,
                    &reservation,
                    block_number,
                );

                let block = LocalBlock::empty(
                    reservation.spec_id,
                    PartialHeader {
                        number: block_number,
                        state_root: reservation.previous_state_root,
                        base_fee: reservation.previous_base_fee_per_gas,
                        timestamp,
                        ..PartialHeader::default()
                    },
                );

                let mut storage = RwLockUpgradableReadGuard::upgrade(storage);

                // SAFETY: Reservations are guaranteed to not overlap with other reservations or
                // blocks, so the generated block must have a unique block
                // number and thus hash.
                unsafe {
                    storage
                        .insert_block_unchecked(block.into(), reservation.previous_total_difficulty)
                }
                .clone()
            })
    }
}

#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
fn calculate_timestamp_for_reserved_block<BlockT: Block + Clone>(
    storage: &SparseBlockchainStorage<BlockT>,
    reservations: &Vec<Reservation>,
    reservation: &Reservation,
    block_number: u64,
) -> u64 {
    let previous_block_number = reservation.first_number - 1;
    let previous_timestamp =
        if let Some(previous_reservation) = find_reservation(reservations, previous_block_number) {
            calculate_timestamp_for_reserved_block(
                storage,
                reservations,
                previous_reservation,
                previous_block_number,
            )
        } else {
            let previous_block = storage
                .block_by_number(previous_block_number)
                .expect("Block must exist");

            previous_block.header().timestamp
        };

    previous_timestamp + reservation.interval * (block_number - reservation.first_number + 1)
}

fn find_reservation(reservations: &[Reservation], number: u64) -> Option<&Reservation> {
    reservations
        .iter()
        .find(|reservation| reservation.first_number <= number && number <= reservation.last_number)
}
