use std::{num::NonZeroUsize, sync::Arc};

use parking_lot::{RwLock, RwLockUpgradableReadGuard, RwLockWriteGuard};
use rethnet_eth::{
    block::{Block, DetailedBlock, PartialHeader},
    receipt::BlockReceipt,
    SpecId, B256, U256,
};

use super::SparseBlockchainStorage;

/// A reservation for a sequence of blocks that have not yet been inserted into storage.
#[derive(Debug)]
struct Reservation {
    first_number: U256,
    last_number: U256,
    interval: U256,
    previous_base_fee_per_gas: Option<U256>,
    previous_state_root: B256,
    previous_total_difficulty: U256,
    spec_id: SpecId,
}

/// A storage solution for storing a subset of a Blockchain's blocks in-memory, while lazily loading blocks that have been reserved.
#[derive(Debug)]
pub struct ReservableSparseBlockchainStorage {
    reservations: RwLock<Vec<Reservation>>,
    storage: RwLock<SparseBlockchainStorage>,
    last_block_number: U256,
}

impl ReservableSparseBlockchainStorage {
    /// Constructs a new instance with the provided block.
    pub fn with_block(block: DetailedBlock, total_difficulty: U256) -> Self {
        Self {
            reservations: RwLock::new(Vec::new()),
            last_block_number: block.header.number,
            storage: RwLock::new(SparseBlockchainStorage::with_block(block, total_difficulty)),
        }
    }

    /// Constructs a new instance with no blocks.
    pub fn empty(latest_block_number: U256) -> Self {
        Self {
            reservations: RwLock::new(Vec::new()),
            storage: RwLock::new(SparseBlockchainStorage::default()),
            last_block_number: latest_block_number,
        }
    }

    /// Retrieves the block by hash, if it exists.
    pub fn block_by_hash(&self, hash: &B256) -> Option<Arc<DetailedBlock>> {
        self.storage.read().block_by_hash(hash).cloned()
    }

    /// Retrieves the block by number, if it exists.
    pub fn block_by_number(&self, number: &U256) -> Option<Arc<DetailedBlock>> {
        self.try_fulfilling_reservation(number)
            .or_else(|| self.storage.read().block_by_number(number).cloned())
    }

    /// Retrieves the block that contains the transaction with the provided hash, if it exists.
    pub fn block_by_transaction_hash(&self, transaction_hash: &B256) -> Option<Arc<DetailedBlock>> {
        self.storage
            .read()
            .block_by_transaction_hash(transaction_hash)
            .cloned()
    }

    /// Retrieves whether a block with the provided number exists.
    pub fn contains_block_number(&self, number: &U256) -> bool {
        self.storage.read().contains_block_number(number)
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
        self.last_block_number = block.header.number;

        self.storage
            .get_mut()
            .insert_block_unchecked(block, total_difficulty)
    }

    /// Retrieves the last block number.
    pub fn last_block_number(&self) -> &U256 {
        &self.last_block_number
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it exists.
    pub fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Option<Arc<BlockReceipt>> {
        self.storage
            .read()
            .receipt_by_transaction_hash(transaction_hash)
            .cloned()
    }

    /// Reverts to the block with the provided number, deleting all later blocks.
    pub fn revert_to_block(&mut self, block_number: &U256) -> bool {
        if *block_number > self.last_block_number {
            return false;
        }

        self.last_block_number = *block_number;

        // Only retain reservations that are not fully reverted
        self.reservations.get_mut().retain_mut(|reservation| {
            if reservation.last_number <= *block_number {
                true
            } else if reservation.first_number <= *block_number {
                reservation.last_number = *block_number;
                true
            } else {
                false
            }
        });

        self.storage.get_mut().revert_to_block(block_number);

        true
    }

    /// Reserves the provided number of blocks, starting from the next block number.
    pub fn reserve_blocks(
        &mut self,
        additional: NonZeroUsize,
        interval: U256,
        previous_base_fee: Option<U256>,
        previous_state_root: B256,
        previous_total_difficulty: U256,
        spec_id: SpecId,
    ) {
        let reservation = Reservation {
            first_number: self.last_block_number + U256::from(1),
            last_number: self.last_block_number + U256::from(additional.get()),
            interval,
            previous_base_fee_per_gas: previous_base_fee,
            previous_state_root,
            previous_total_difficulty,
            spec_id,
        };

        self.reservations.get_mut().push(reservation);
        self.last_block_number += U256::from(additional.get());
    }

    /// Retrieves the total difficulty of the block with the provided hash.
    pub fn total_difficulty_by_hash(&self, hash: &B256) -> Option<U256> {
        self.storage.read().total_difficulty_by_hash(hash).cloned()
    }

    fn try_fulfilling_reservation(&self, block_number: &U256) -> Option<Arc<DetailedBlock>> {
        let reservations = self.reservations.upgradable_read();

        reservations
            .iter()
            .enumerate()
            .find_map(|(idx, reservation)| {
                if reservation.first_number <= *block_number
                    && *block_number <= reservation.last_number
                {
                    Some(idx)
                } else {
                    None
                }
            })
            .map(|idx| {
                let mut reservations = RwLockUpgradableReadGuard::upgrade(reservations);
                let reservation = reservations.remove(idx);

                if *block_number != reservation.first_number {
                    reservations.push(Reservation {
                        last_number: block_number - U256::from(1),
                        ..reservation
                    })
                }

                if *block_number != reservation.last_number {
                    reservations.push(Reservation {
                        first_number: block_number + U256::from(1),
                        ..reservation
                    })
                }

                let reservations = RwLockWriteGuard::downgrade(reservations);
                let storage = self.storage.upgradable_read();

                let timestamp = calculate_timestamp_for_reserved_block(
                    &storage,
                    &reservations,
                    &reservation,
                    block_number,
                );

                let withdrawals = if reservation.spec_id >= SpecId::SHANGHAI {
                    Some(Vec::new())
                } else {
                    None
                };

                let block = Block::new(
                    PartialHeader {
                        number: *block_number,
                        state_root: reservation.previous_state_root,
                        base_fee: reservation.previous_base_fee_per_gas,
                        timestamp,
                        ..PartialHeader::default()
                    },
                    Vec::new(),
                    Vec::new(),
                    withdrawals,
                );

                let block = DetailedBlock::new(block, Vec::new(), Vec::new());

                let mut storage = RwLockUpgradableReadGuard::upgrade(storage);

                // SAFETY: Reservations are guaranteed to not overlap with other reservations or blocks, so the
                // generated block must have a unique block number and thus hash.
                unsafe {
                    storage.insert_block_unchecked(block, reservation.previous_total_difficulty)
                }
                .clone()
            })
    }
}

fn calculate_timestamp_for_reserved_block(
    storage: &SparseBlockchainStorage,
    reservations: &Vec<Reservation>,
    reservation: &Reservation,
    block_number: &U256,
) -> U256 {
    fn find_reservation<'r>(
        reservations: &'r [Reservation],
        number: &U256,
    ) -> Option<&'r Reservation> {
        reservations.iter().find(|reservation| {
            reservation.first_number <= *number && *number <= reservation.last_number
        })
    }

    let previous_block_number = reservation.first_number - U256::from(1);
    let previous_timestamp = if let Some(previous_reservation) =
        find_reservation(reservations, &previous_block_number)
    {
        calculate_timestamp_for_reserved_block(
            storage,
            reservations,
            previous_reservation,
            &previous_block_number,
        )
    } else {
        let previous_block = storage
            .block_by_number(&previous_block_number)
            .expect("Block must exist");

        previous_block.header.timestamp
    };

    previous_timestamp
        + reservation.interval * (block_number - reservation.first_number + U256::from(1))
}
