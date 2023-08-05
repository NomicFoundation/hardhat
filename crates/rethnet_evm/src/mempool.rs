use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::db::StateRef;

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
    pending_transactions: Vec<PendingTransaction>,
    /// Transactions that can be executed in the future, once the nonce is high enough
    future_transactions: Vec<PendingTransaction>,
    /// (Account address -> Next pending nonce) mapping
    next_account_nonces: HashMap<Address, u64>,
}

impl MemPool {
    /// Constructs a new [`MemPool`] with the specified block gas limit.
    pub fn new(block_gas_limit: U256) -> Self {
        Self {
            block_gas_limit,
            pending_transactions: Vec::new(),
            future_transactions: Vec::new(),
            next_account_nonces: HashMap::new(),
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

    /// Retrieves the last pending nonce of the account corresponding to the specified address, if it exists.
    pub fn last_pending_nonce(&self, address: &Address) -> Option<&u64> {
        self.next_account_nonces.get(address)
    }

    /// Tries to add the provided transaction to the [`MemPool`].
    pub fn add_transaction<S: StateRef + ?Sized>(
        &mut self,
        state: &S,
        transaction: PendingTransaction,
    ) -> Result<(), MinerTransactionError<S::Error>> {
        self.add_transaction_impl(state, transaction)
    }

    /// Removes the transaction corresponding to the provided transaction hash, if it exists.
    pub fn remove_transaction(&mut self, hash: &B256) -> Option<PendingTransaction> {
        if let Some((idx, _)) = self
            .pending_transactions
            .iter()
            .enumerate()
            .find(|(_, transaction)| *transaction.hash() == *hash)
        {
            return Some(self.pending_transactions.remove(idx));
        }

        if let Some((idx, _)) = self
            .future_transactions
            .iter()
            .enumerate()
            .find(|(_, transaction)| *transaction.hash() == *hash)
        {
            return Some(self.future_transactions.remove(idx));
        }

        None
    }

    /// Updates the [`MemPool`], moving any future transactions to the pending status, if their nonces are high enough.
    pub fn update<S>(&mut self, state: &S)
    where
        S: StateRef + ?Sized,
        S::Error: Debug,
    {
        let mut future_transactions = Vec::with_capacity(self.future_transactions.capacity());
        std::mem::swap(&mut self.future_transactions, &mut future_transactions);

        for transaction in future_transactions {
            self.add_transaction_impl(state, transaction)
                .expect("All future transactions have already been validated");
        }
    }

    /// Returns all pending transactions, for which the nonces are too high.
    pub fn future_transactions(&self) -> &[PendingTransaction] {
        &self.future_transactions
    }

    /// Returns all pending transactions, for which the nonces are guaranteed to be high enough.
    pub fn pending_transactions(&self) -> &[PendingTransaction] {
        &self.pending_transactions
    }

    /// Returns the pending transaction corresponding to the provided hash, if it exists.
    pub fn transaction_by_hash(&self, hash: &B256) -> Option<&PendingTransaction> {
        self.pending_transactions
            .iter()
            .find(|transaction| *transaction.hash() == *hash)
            .or_else(|| {
                self.future_transactions
                    .iter()
                    .find(|transaction| *transaction.hash() == *hash)
            })
    }

    fn add_transaction_impl<S: StateRef + ?Sized>(
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

        let account = state.basic(*transaction.caller())?.unwrap_or_default();

        let next_nonce = self
            .last_pending_nonce(transaction.caller())
            .unwrap_or(&account.nonce)
            + 1;

        if *transaction.nonce() == next_nonce {
            self.pending_transactions.push(transaction);
        } else {
            self.future_transactions.push(transaction);
        }

        Ok(())
    }
}
