use std::{cmp::Ordering, fmt::Debug};

use edr_eth::{Address, B256, U256};
use indexmap::IndexMap;
use revm::{
    db::StateRef,
    primitives::{AccountInfo, HashMap},
};

use crate::PendingTransaction;

pub struct PendingTransactions<ComparatorT>
where
    ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
{
    transactions: IndexMap<Address, Vec<OrderedTransaction>>,
    comparator: ComparatorT,
}

impl<ComparatorT> PendingTransactions<ComparatorT>
where
    ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
{
    pub fn remove_caller(&mut self, caller: &Address) -> Option<Vec<OrderedTransaction>> {
        self.transactions.remove(caller)
    }
}

impl<ComparatorT> Debug for PendingTransactions<ComparatorT>
where
    ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PendingTransactions")
            .field("transactions", &self.transactions)
            .finish()
    }
}

impl<ComparatorT> Iterator for PendingTransactions<ComparatorT>
where
    ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
{
    type Item = PendingTransaction;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn next(&mut self) -> Option<PendingTransaction> {
        let (to_be_removed, next) = self
            .transactions
            .iter_mut()
            .min_by(|lhs, rhs| {
                (self.comparator)(
                    lhs.1.first().expect("Empty queues should be removed"),
                    rhs.1.first().expect("Empty queues should be removed"),
                )
            })
            .map_or((None, None), |(caller, transactions)| {
                let transaction = transactions.remove(0).transaction;

                let to_be_removed = if transactions.is_empty() {
                    Some(*caller)
                } else {
                    None
                };

                (to_be_removed, Some(transaction))
            });

        if let Some(caller) = &to_be_removed {
            self.transactions.remove(caller);
        }

        next
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MinerTransactionError<SE> {
    /// Transaction gas limit exceeds block gas limit.
    #[error("Transaction gas limit is {transaction_gas_limit} and exceeds block gas limit of {block_gas_limit}")]
    ExceedsBlockGasLimit {
        block_gas_limit: u64,
        transaction_gas_limit: u64,
    },
    /// Transaction already exists in the mempool.
    #[error("Known transaction: 0x{transaction_hash:x}")]
    TransactionAlreadyExists { transaction_hash: B256 },
    /// State error
    #[error(transparent)]
    State(#[from] SE),
    /// Replacement transaction has underpriced max fee per gas.
    #[error("Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 0x{min_new_max_fee_per_gas:x} is necessary to replace the existing transaction with nonce {transaction_nonce}.")]
    ReplacementMaxFeePerGasTooLow {
        min_new_max_fee_per_gas: U256,
        transaction_nonce: u64,
    },
    /// Replacement transaction has underpriced max priority fee per gas.
    #[error("Replacement transaction underpriced. A gasPrice/maxPriorityFeePerGas of at least 0x{min_new_max_priority_fee_per_gas} is necessary to replace the existing transaction with nonce {transaction_nonce}.")]
    ReplacementMaxPriorityFeePerGasTooLow {
        min_new_max_priority_fee_per_gas: U256,
        transaction_nonce: u64,
    },
}

/// A pending transaction with an order ID.
#[derive(Clone, Debug)]
pub struct OrderedTransaction {
    order_id: usize,
    transaction: PendingTransaction,
}

impl OrderedTransaction {
    /// Retrieves the order ID of the pending transaction.
    pub fn order_id(&self) -> usize {
        self.order_id
    }

    /// Retrieves the pending transaction.
    pub fn transaction(&self) -> &PendingTransaction {
        &self.transaction
    }

    fn caller(&self) -> &Address {
        self.transaction.caller()
    }

    fn hash(&self) -> &B256 {
        self.transaction.hash()
    }

    fn nonce(&self) -> u64 {
        self.transaction.nonce()
    }
}

/// The mempool contains transactions pending inclusion in the blockchain.
#[derive(Clone, Debug)]
pub struct MemPool {
    /// The block's gas limit
    block_gas_limit: u64,
    /// Transactions that can be executed now
    pending_transactions: IndexMap<Address, Vec<OrderedTransaction>>,
    /// Mapping of transaction hashes to transaction
    hash_to_transaction: HashMap<B256, OrderedTransaction>,
    /// Transactions that can be executed in the future, once the nonce is high enough
    future_transactions: IndexMap<Address, Vec<OrderedTransaction>>,
    next_order_id: usize,
}

impl MemPool {
    /// Constructs a new [`MemPool`] with the specified block gas limit.
    pub fn new(block_gas_limit: u64) -> Self {
        Self {
            block_gas_limit,
            pending_transactions: IndexMap::new(),
            hash_to_transaction: HashMap::new(),
            future_transactions: IndexMap::new(),
            next_order_id: 0,
        }
    }

    /// Retrieves the instance's block gas limit.
    pub fn block_gas_limit(&self) -> u64 {
        self.block_gas_limit
    }

    /// Sets the instance's block gas limit.
    pub fn set_block_gas_limit<S>(&mut self, state: &S, limit: u64) -> Result<(), S::Error>
    where
        S: StateRef + ?Sized,
        S::Error: Debug,
    {
        self.block_gas_limit = limit;

        self.update(state)
    }

    /// Creates an iterator for all pending transactions; i.e. for which the nonces are guaranteed to be high enough.
    pub fn iter<ComparatorT>(&self, comparator: ComparatorT) -> PendingTransactions<ComparatorT>
    where
        ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
    {
        PendingTransactions {
            transactions: self.pending_transactions.clone(),
            comparator,
        }
    }

    /// Retrieves the nonce of the last pending transaction of the account corresponding to the specified address, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn last_pending_nonce(&self, address: &Address) -> Option<u64> {
        self.pending_transactions.get(address).map(|transactions| {
            transactions
                .last()
                .expect("Empty maps should be deleted")
                .nonce()
        })
    }

    /// Retrieves an iterator for all transactions in the instance. Pending transactions are followed by future transactions,
    /// grouped by sender in order of insertion.
    pub fn transactions(&self) -> impl Iterator<Item = &PendingTransaction> {
        self.pending_transactions
            .values()
            .chain(self.future_transactions.values())
            .flatten()
            .map(OrderedTransaction::transaction)
    }

    /// Whether the instance has any future transactions; i.e. for which the nonces are not high enough.
    pub fn has_future_transactions(&self) -> bool {
        !self.future_transactions.is_empty()
    }

    /// Whether the instance has any pending transactions; i.e. for which the nonces are guaranteed to be high enough.
    pub fn has_pending_transactions(&self) -> bool {
        !self.pending_transactions.is_empty()
    }

    /// Tries to add the provided transaction to the [`MemPool`].
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn add_transaction<S: StateRef + ?Sized>(
        &mut self,
        state: &S,
        transaction: PendingTransaction,
    ) -> Result<(), MinerTransactionError<S::Error>> {
        let transaction_gas_limit = transaction.gas_limit();
        if transaction_gas_limit > self.block_gas_limit {
            return Err(MinerTransactionError::ExceedsBlockGasLimit {
                block_gas_limit: self.block_gas_limit,
                transaction_gas_limit,
            });
        }

        if self.hash_to_transaction.contains_key(transaction.hash()) {
            return Err(MinerTransactionError::TransactionAlreadyExists {
                transaction_hash: *transaction.hash(),
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

        let transaction = OrderedTransaction {
            order_id: self.next_order_id,
            transaction,
        };

        self.next_order_id += 1;

        if transaction.nonce() > next_nonce {
            self.insert_queued_transaction(transaction.clone())?;
        } else {
            self.insert_pending_transaction(transaction.clone())?;
        }

        self.hash_to_transaction
            .insert(*transaction.hash(), transaction);

        Ok(())
    }

    /// Removes the transaction corresponding to the provided transaction hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn remove_transaction(&mut self, hash: &B256) -> Option<OrderedTransaction> {
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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn update<S>(&mut self, state: &S) -> Result<(), S::Error>
    where
        S: StateRef + ?Sized,
        S::Error: Debug,
    {
        fn is_valid_tx(
            transaction: &PendingTransaction,
            block_gas_limit: u64,
            sender: &AccountInfo,
        ) -> bool {
            transaction.gas_limit() <= block_gas_limit
                && transaction.upfront_cost() <= sender.balance
        }

        for entry in self.pending_transactions.iter_mut() {
            let (caller, transactions) = entry;
            let sender = state.basic(*caller)?.unwrap_or_default();

            // Remove all finalized transactions
            transactions.retain(|transaction| {
                let should_retain = transaction.nonce() >= sender.nonce;

                if !should_retain {
                    self.hash_to_transaction.remove(transaction.hash());
                }

                should_retain
            });

            if let Some((idx, _)) = transactions.iter().enumerate().find(|(_, transaction)| {
                !is_valid_tx(&transaction.transaction, self.block_gas_limit, &sender)
            }) {
                // Move all consequent transactions to the future queue
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

            transactions.retain(|transaction| {
                let should_retain =
                    is_valid_tx(&transaction.transaction, self.block_gas_limit, &sender);

                if !should_retain {
                    self.hash_to_transaction.remove(transaction.hash());
                }

                should_retain
            });
        }

        // Remove empty future entries
        self.future_transactions
            .retain(|_, transactions| !transactions.is_empty());

        Ok(())
    }

    /// Returns the transaction corresponding to the provided hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn transaction_by_hash(&self, hash: &B256) -> Option<&OrderedTransaction> {
        self.hash_to_transaction.get(hash)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn insert_pending_transaction<StateError>(
        &mut self,
        transaction: OrderedTransaction,
    ) -> Result<(), MinerTransactionError<StateError>> {
        let pending_transactions = self
            .pending_transactions
            .entry(*transaction.caller())
            .or_default();

        let replaced_transaction = pending_transactions
            .iter_mut()
            .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce());

        if let Some(replaced_transaction) = replaced_transaction {
            validate_replacement_transaction(
                &replaced_transaction.transaction,
                &transaction.transaction,
            )?;

            self.hash_to_transaction.remove(replaced_transaction.hash());

            *replaced_transaction = transaction.clone();
        } else {
            let caller = *transaction.caller();
            let mut next_pending_nonce = transaction.nonce() + 1;

            pending_transactions.push(transaction);

            // Move as many future transactions as possible to the pending status
            if let Some(future_transactions) = self.future_transactions.get_mut(&caller) {
                while let Some((idx, _)) = future_transactions
                    .iter()
                    .enumerate()
                    .find(|(_, transaction)| transaction.nonce() == next_pending_nonce)
                {
                    pending_transactions.push(future_transactions.remove(idx));

                    next_pending_nonce += 1;
                }

                if future_transactions.is_empty() {
                    self.future_transactions.remove(&caller);
                }
            }
        }

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn insert_queued_transaction<StateError>(
        &mut self,
        transaction: OrderedTransaction,
    ) -> Result<(), MinerTransactionError<StateError>> {
        let future_transactions = self
            .future_transactions
            .entry(*transaction.caller())
            .or_default();

        let replaced_transaction = future_transactions
            .iter_mut()
            .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce());

        if let Some(replaced_transaction) = replaced_transaction {
            validate_replacement_transaction(
                &replaced_transaction.transaction,
                &transaction.transaction,
            )?;

            self.hash_to_transaction.remove(replaced_transaction.hash());

            *replaced_transaction = transaction.clone();
        } else {
            future_transactions.push(transaction);
        }

        Ok(())
    }
}

fn validate_replacement_transaction<StateError>(
    old_transaction: &PendingTransaction,
    new_transaction: &PendingTransaction,
) -> Result<(), MinerTransactionError<StateError>> {
    let min_new_max_fee_per_gas = min_new_fee(old_transaction.gas_price());
    if new_transaction.gas_price() < min_new_max_fee_per_gas {
        return Err(MinerTransactionError::ReplacementMaxFeePerGasTooLow {
            min_new_max_fee_per_gas,
            transaction_nonce: old_transaction.nonce(),
        });
    }

    let min_new_max_priority_fee_per_gas = min_new_fee(
        old_transaction
            .max_priority_fee_per_gas()
            .unwrap_or_else(|| old_transaction.gas_price()),
    );

    if new_transaction
        .max_priority_fee_per_gas()
        .unwrap_or_else(|| new_transaction.gas_price())
        < min_new_max_priority_fee_per_gas
    {
        return Err(
            MinerTransactionError::ReplacementMaxPriorityFeePerGasTooLow {
                min_new_max_priority_fee_per_gas,
                transaction_nonce: old_transaction.nonce(),
            },
        );
    }

    Ok(())
}

fn min_new_fee(fee: U256) -> U256 {
    let min_new_priority_fee = fee * U256::from(110);

    let one_hundred = U256::from(100);
    if min_new_priority_fee % one_hundred == U256::ZERO {
        min_new_priority_fee / one_hundred
    } else {
        min_new_priority_fee / one_hundred + U256::from(1)
    }
}
