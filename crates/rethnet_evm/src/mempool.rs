use std::fmt::Debug;

use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, HashMap},
};

use crate::PendingTransaction;

#[derive(Debug, thiserror::Error)]
pub enum MinerTransactionError<SE> {
    /// Transaction gas limit exceeds block gas limit.
    #[error("Transaction gas limit is {transaction_gas_limit} and exceeds block gas limit of {block_gas_limit}")]
    ExceedsBlockGasLimit {
        block_gas_limit: U256,
        transaction_gas_limit: U256,
    },
    /// State error
    #[error(transparent)]
    State(#[from] SE),
}

/// The mempool contains transactions pending inclusion in the blockchain.
#[derive(Clone, Debug)]
pub struct MemPool {
    /// The block's gas limit
    block_gas_limit: U256,
    /// Transactions that can be executed now
    pending_transactions: HashMap<Address, Vec<PendingTransaction>>,
    /// Mapping of transaction hashes to transaction
    hash_to_transaction: HashMap<B256, PendingTransaction>,
    /// Transactions that can be executed in the future, once the nonce is high enough
    future_transactions: HashMap<Address, Vec<PendingTransaction>>,
}

impl MemPool {
    /// Constructs a new [`MemPool`] with the specified block gas limit.
    pub fn new(block_gas_limit: U256) -> Self {
        Self {
            block_gas_limit,
            pending_transactions: HashMap::new(),
            hash_to_transaction: HashMap::new(),
            future_transactions: HashMap::new(),
        }
    }

    /// Retrieves the instance's block gas limit.
    pub fn block_gas_limit(&self) -> &U256 {
        &self.block_gas_limit
    }

    /// Sets the instance's block gas limit.
    pub fn set_block_gas_limit(&mut self, limit: U256) {
        self.block_gas_limit = limit;
    }

    /// Retrieves the nonce of the last pending transaction of the account corresponding to the specified address, if it exists.
    pub fn last_pending_nonce(&self, address: &Address) -> Option<u64> {
        self.pending_transactions.get(address).map(|transactions| {
            transactions
                .last()
                .expect("Empty maps should be deleted")
                .nonce()
        })
    }

    /// Tries to add the provided transaction to the [`MemPool`].
    pub fn add_transaction<S: StateRef + ?Sized>(
        &mut self,
        state: &S,
        transaction: PendingTransaction,
    ) -> Result<(), MinerTransactionError<S::Error>> {
        let transaction_gas_limit = U256::from(transaction.gas_limit());
        if transaction_gas_limit > self.block_gas_limit {
            return Err(MinerTransactionError::ExceedsBlockGasLimit {
                block_gas_limit: self.block_gas_limit,
                transaction_gas_limit,
            });
        }

        let next_nonce = self.last_pending_nonce(transaction.caller()).map_or_else(
            || {
                state
                    .basic(*transaction.caller())
                    .map(|account| account.map_or(0, |account| account.nonce))
            },
            |nonce| Ok(nonce + 1),
        )?;

        if transaction.nonce() == next_nonce {
            self.insert_pending_transaction(transaction);
        } else {
            self.insert_queued_transaction(transaction);
        }

        Ok(())
    }

    /// Removes the transaction corresponding to the provided transaction hash, if it exists.
    pub fn remove_transaction(&mut self, hash: &B256) -> Option<PendingTransaction> {
        if let Some(old_transaction) = self.hash_to_transaction.remove(hash) {
            let caller = old_transaction.caller();
            if let Some(pending_transactions) = self.pending_transactions.get_mut(caller) {
                if let Some((idx, _)) = pending_transactions
                    .iter()
                    .enumerate()
                    .find(|(_, transaction)| *transaction.hash() == *hash)
                {
                    let mut invalidated_transactions = pending_transactions.split_off(idx + 1);
                    let removed = pending_transactions.remove(idx);

                    self.future_transactions
                        .entry(*caller)
                        .and_modify(|transactions| {
                            transactions.append(&mut invalidated_transactions);
                        })
                        .or_insert(invalidated_transactions);

                    return Some(removed);
                }
            }

            if let Some(future_transactions) = self.future_transactions.get_mut(caller) {
                if let Some((idx, _)) = future_transactions
                    .iter()
                    .enumerate()
                    .find(|(_, transaction)| *transaction.hash() == *hash)
                {
                    return Some(future_transactions.remove(idx));
                }
            }
        }

        None
    }

    /// Updates the [`MemPool`], moving any future transactions to the pending status, if their nonces are high enough.
    pub fn update<S>(&mut self, state: &S) -> Result<(), S::Error>
    where
        S: StateRef + ?Sized,
        S::Error: Debug,
    {
        fn is_valid_tx(
            transaction: &PendingTransaction,
            block_gas_limit: &U256,
            sender: &AccountInfo,
        ) -> bool {
            U256::from(transaction.gas_limit()) <= *block_gas_limit
                && transaction.nonce() >= sender.nonce
                && transaction.upfront_cost() <= sender.balance
        }

        for entry in self.pending_transactions.iter_mut() {
            let (caller, transactions) = entry;
            let sender = state.basic(*caller)?.unwrap_or_default();

            if let Some((idx, _)) = transactions
                .iter()
                .enumerate()
                .find(|(_, transaction)| !is_valid_tx(transaction, &self.block_gas_limit, &sender))
            {
                // Question: Do we ever need to consider tx.nonce < sender.nonce, due to manual modifications?

                let mut invalidated_transactions = transactions.split_off(idx);

                self.future_transactions
                    .entry(*caller)
                    .and_modify(|transactions| transactions.append(&mut invalidated_transactions))
                    .or_insert(invalidated_transactions);
            }
        }

        // Remove empty pending entries
        self.pending_transactions
            .retain(|_, transactions| !transactions.is_empty());

        for entry in self.future_transactions.iter_mut() {
            let (caller, transactions) = entry;
            let sender = state.basic(*caller)?.unwrap_or_default();

            transactions
                .retain(|transaction| is_valid_tx(transaction, &self.block_gas_limit, &sender));
        }

        // Remove empty future entries
        self.future_transactions
            .retain(|_, transactions| !transactions.is_empty());

        Ok(())
    }

    /// Returns all pending transactions, for which the nonces are too high.
    pub fn future_transactions(&self) -> impl Iterator<Item = &PendingTransaction> {
        self.future_transactions.values().flatten()
    }

    /// Returns all pending transactions, for which the nonces are guaranteed to be high enough.
    pub fn pending_transactions(&self) -> impl Iterator<Item = &PendingTransaction> {
        self.pending_transactions.values().flatten()
    }

    /// Returns the transaction corresponding to the provided hash, if it exists.
    pub fn transaction_by_hash(&self, hash: &B256) -> Option<&PendingTransaction> {
        self.hash_to_transaction.get(hash)
    }

    fn insert_pending_transaction(&mut self, transaction: PendingTransaction) {
        let removed = self
            .hash_to_transaction
            .insert(*transaction.hash(), transaction.clone());

        let pending_transactions = self
            .pending_transactions
            .entry(*transaction.caller())
            .or_default();

        if removed.is_some() {
            let old_transactions = pending_transactions
                .iter_mut()
                .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce())
                .expect("An old transaction with the same nonce should exist");

            *old_transactions = transaction;
        } else {
            pending_transactions.push(transaction);
        }
    }

    fn insert_queued_transaction(&mut self, transaction: PendingTransaction) {
        let removed = self
            .hash_to_transaction
            .insert(*transaction.hash(), transaction.clone());

        let future_transactions = self
            .future_transactions
            .entry(*transaction.caller())
            .or_default();

        if removed.is_some() {
            let old_transactions = future_transactions
                .iter_mut()
                .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce())
                .expect("An old transaction with the same nonce should exist");

            *old_transactions = transaction;
        } else {
            future_transactions.push(transaction);
        }
    }
}
