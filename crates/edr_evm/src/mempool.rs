use std::{cmp::Ordering, fmt::Debug};

use edr_eth::{Address, B256, U256};
use indexmap::{map::Entry, IndexMap};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, HashMap},
};

use crate::ExecutableTransaction;

/// An iterator over pending transactions.
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
    /// Removes all pending transactions of the account corresponding to the
    /// provided address.
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
    type Item = ExecutableTransaction;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn next(&mut self) -> Option<ExecutableTransaction> {
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

/// An error that can occur when adding a transaction to the mempool.
#[derive(Debug, thiserror::Error)]
pub enum MemPoolAddTransactionError<SE> {
    /// Transaction gas limit exceeds block gas limit.
    #[error("Transaction gas limit is {transaction_gas_limit} and exceeds block gas limit of {block_gas_limit}")]
    ExceedsBlockGasLimit {
        /// The block gas limit
        block_gas_limit: u64,
        /// The transaction gas limit
        transaction_gas_limit: u64,
    },
    /// Sender does not have enough funds to send transaction.
    #[error("Sender doesn't have enough funds to send tx. The max upfront cost is: {max_upfront_cost} and the sender's balance is: {sender_balance}.")]
    InsufficientFunds {
        /// The maximum upfront cost of the transaction
        max_upfront_cost: U256,
        /// The sender's balance
        sender_balance: U256,
    },
    /// Transaction nonce is too low.
    #[error("Transaction nonce too low. Expected nonce to be at least {sender_nonce} but got {transaction_nonce}.")]
    NonceTooLow {
        /// Transaction's nonce.
        transaction_nonce: u64,
        /// Sender's nonce.
        sender_nonce: u64,
    },
    /// Transaction already exists in the mempool.
    #[error("Known transaction: 0x{transaction_hash:x}")]
    TransactionAlreadyExists {
        /// The transaction hash
        transaction_hash: B256,
    },
    /// State error
    #[error(transparent)]
    State(#[from] SE),
    /// Replacement transaction has underpriced max fee per gas.
    #[error("Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least {min_new_max_fee_per_gas} is necessary to replace the existing transaction with nonce {transaction_nonce}.")]
    ReplacementMaxFeePerGasTooLow {
        /// The minimum new max fee per gas
        min_new_max_fee_per_gas: U256,
        /// The transaction nonce
        transaction_nonce: u64,
    },
    /// Replacement transaction has underpriced max priority fee per gas.
    #[error("Replacement transaction underpriced. A gasPrice/maxPriorityFeePerGas of at least {min_new_max_priority_fee_per_gas} is necessary to replace the existing transaction with nonce {transaction_nonce}.")]
    ReplacementMaxPriorityFeePerGasTooLow {
        /// The minimum new max priority fee per gas
        min_new_max_priority_fee_per_gas: U256,
        /// The transaction nonce
        transaction_nonce: u64,
    },
}

/// A pending transaction with an order ID.
#[derive(Clone, Debug)]
pub struct OrderedTransaction {
    order_id: usize,
    transaction: ExecutableTransaction,
}

impl OrderedTransaction {
    /// Retrieves the order ID of the pending transaction.
    pub fn order_id(&self) -> usize {
        self.order_id
    }

    /// Retrieves the pending transaction.
    pub fn pending(&self) -> &ExecutableTransaction {
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
    /// Transactions that can be executed in the future, once the nonce is high
    /// enough
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

    /// Creates an iterator for all pending transactions; i.e. for which the
    /// nonces are guaranteed to be high enough.
    pub fn iter<ComparatorT>(&self, comparator: ComparatorT) -> PendingTransactions<ComparatorT>
    where
        ComparatorT: Fn(&OrderedTransaction, &OrderedTransaction) -> Ordering,
    {
        PendingTransactions {
            transactions: self.pending_transactions.clone(),
            comparator,
        }
    }

    /// Retrieves the nonce of the last pending transaction of the account
    /// corresponding to the specified address, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn last_pending_nonce(&self, address: &Address) -> Option<u64> {
        self.pending_transactions.get(address).map(|transactions| {
            transactions
                .last()
                .expect("Empty maps should be deleted")
                .nonce()
        })
    }

    /// Retrieves an iterator for all future transactions.
    pub fn future_transactions(&self) -> impl Iterator<Item = &OrderedTransaction> {
        self.future_transactions.values().flatten()
    }

    /// Retrieves an iterator for all pending transactions.
    pub fn pending_transactions(&self) -> impl Iterator<Item = &OrderedTransaction> {
        self.pending_transactions.values().flatten()
    }

    /// Retrieves an iterator for all transactions in the instance. Pending
    /// transactions are followed by future transactions, grouped by sender
    /// in order of insertion.
    pub fn transactions(&self) -> impl Iterator<Item = &ExecutableTransaction> {
        self.pending_transactions
            .values()
            .chain(self.future_transactions.values())
            .flatten()
            .map(OrderedTransaction::pending)
    }

    /// Whether the instance has any future transactions; i.e. for which the
    /// nonces are not high enough.
    pub fn has_future_transactions(&self) -> bool {
        !self.future_transactions.is_empty()
    }

    /// Whether the instance has any pending transactions; i.e. for which the
    /// nonces are guaranteed to be high enough.
    pub fn has_pending_transactions(&self) -> bool {
        !self.pending_transactions.is_empty()
    }

    /// Tries to add the provided transaction to the [`MemPool`].
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn add_transaction<S: StateRef + ?Sized>(
        &mut self,
        state: &S,
        transaction: ExecutableTransaction,
    ) -> Result<(), MemPoolAddTransactionError<S::Error>> {
        let transaction_gas_limit = transaction.gas_limit();
        if transaction_gas_limit > self.block_gas_limit {
            return Err(MemPoolAddTransactionError::ExceedsBlockGasLimit {
                block_gas_limit: self.block_gas_limit,
                transaction_gas_limit,
            });
        }

        if self.hash_to_transaction.contains_key(transaction.hash()) {
            return Err(MemPoolAddTransactionError::TransactionAlreadyExists {
                transaction_hash: *transaction.hash(),
            });
        }

        let sender = state.basic(*transaction.caller())?.unwrap_or_default();
        if transaction.nonce() < sender.nonce {
            return Err(MemPoolAddTransactionError::NonceTooLow {
                transaction_nonce: transaction.nonce(),
                sender_nonce: sender.nonce,
            });
        }

        // We need to validate funds at this stage to avoid DOS
        let max_upfront_cost = transaction.as_inner().upfront_cost();
        if max_upfront_cost > sender.balance {
            return Err(MemPoolAddTransactionError::InsufficientFunds {
                max_upfront_cost,
                sender_balance: sender.balance,
            });
        }

        let next_nonce = account_next_nonce(self, state, transaction.caller())?;
        let transaction = OrderedTransaction {
            order_id: self.next_order_id,
            transaction,
        };

        if transaction.nonce() > next_nonce {
            self.insert_future_transaction(transaction.clone())?;
        } else {
            self.insert_pending_transaction(transaction.clone())?;
        }

        self.next_order_id += 1;

        self.hash_to_transaction
            .insert(*transaction.hash(), transaction);

        Ok(())
    }

    /// Removes the transaction corresponding to the provided transaction hash,
    /// if it exists.
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

                    if pending_transactions.is_empty() {
                        self.pending_transactions.remove(caller);
                    }

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
                    let removed = future_transactions.remove(idx);

                    if future_transactions.is_empty() {
                        self.future_transactions.remove(caller);
                    }

                    return Some(removed);
                }
            }
        }

        None
    }

    /// Updates the [`MemPool`], moving any future transactions to the pending
    /// status, if their nonces are high enough.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn update<S>(&mut self, state: &S) -> Result<(), S::Error>
    where
        S: StateRef + ?Sized,
        S::Error: Debug,
    {
        fn is_valid_tx(
            transaction: &ExecutableTransaction,
            block_gas_limit: u64,
            sender: &AccountInfo,
        ) -> bool {
            transaction.gas_limit() <= block_gas_limit
                && transaction.upfront_cost() <= sender.balance
                // Remove all mined transactions
                && transaction.nonce() >= sender.nonce
        }

        for entry in self.pending_transactions.iter_mut() {
            let (caller, transactions) = entry;
            let sender = state.basic(*caller)?.unwrap_or_default();

            // Remove invalidated transactions
            transactions.retain(|transaction| {
                let should_retain =
                    is_valid_tx(transaction.pending(), self.block_gas_limit, &sender);

                if !should_retain {
                    self.hash_to_transaction.remove(transaction.hash());
                }

                should_retain
            });

            // Check that the pending transactions still have consecutive nonces, starting
            // from the sender's nonce
            if let Some((idx, _)) = transactions
                .iter()
                .enumerate()
                .find(|(idx, transaction)| transaction.nonce() != sender.nonce + *idx as u64)
            {
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

    /// Returns the transaction corresponding to the provided hash, if it
    /// exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn transaction_by_hash(&self, hash: &B256) -> Option<&OrderedTransaction> {
        self.hash_to_transaction.get(hash)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn insert_pending_transaction<StateError>(
        &mut self,
        transaction: OrderedTransaction,
    ) -> Result<(), MemPoolAddTransactionError<StateError>> {
        let mut pending_transactions = self.pending_transactions.entry(*transaction.caller());

        // Check whether an existing transaction can be replaced
        if let Entry::Occupied(ref mut pending_transactions) = pending_transactions {
            let replaced_transaction = pending_transactions
                .get_mut()
                .iter_mut()
                .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce());

            if let Some(replaced_transaction) = replaced_transaction {
                validate_replacement_transaction(
                    &replaced_transaction.transaction,
                    &transaction.transaction,
                )?;

                self.hash_to_transaction.remove(replaced_transaction.hash());

                *replaced_transaction = transaction.clone();

                return Ok(());
            }
        }

        let caller = *transaction.caller();
        let mut next_pending_nonce = transaction.nonce() + 1;

        let pending_transactions = pending_transactions.or_default();
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

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn insert_future_transaction<StateError>(
        &mut self,
        transaction: OrderedTransaction,
    ) -> Result<(), MemPoolAddTransactionError<StateError>> {
        let mut future_transactions = self.future_transactions.entry(*transaction.caller());

        // Check whether an existing transaction can be replaced
        if let Entry::Occupied(ref mut future_transactions) = future_transactions {
            let replaced_transaction = future_transactions
                .get_mut()
                .iter_mut()
                .find(|pending_transaction| transaction.nonce() == pending_transaction.nonce());

            if let Some(replaced_transaction) = replaced_transaction {
                validate_replacement_transaction(
                    &replaced_transaction.transaction,
                    &transaction.transaction,
                )?;

                self.hash_to_transaction.remove(replaced_transaction.hash());

                *replaced_transaction = transaction.clone();

                return Ok(());
            }
        }

        future_transactions.or_default().push(transaction);
        Ok(())
    }
}

/// Calculates the next nonce of the account corresponding to the provided
/// address.
pub fn account_next_nonce<StateT: StateRef + ?Sized>(
    mem_pool: &MemPool,
    state: &StateT,
    address: &Address,
) -> Result<u64, StateT::Error> {
    mem_pool.last_pending_nonce(address).map_or_else(
        || {
            state
                .basic(*address)
                .map(|account| account.map_or(0, |account| account.nonce))
        },
        |nonce| Ok(nonce + 1),
    )
}

/// Whether the mempool has any transactions.
pub fn has_transactions(mem_pool: &MemPool) -> bool {
    mem_pool.has_future_transactions() || mem_pool.has_pending_transactions()
}

fn validate_replacement_transaction<StateError>(
    old_transaction: &ExecutableTransaction,
    new_transaction: &ExecutableTransaction,
) -> Result<(), MemPoolAddTransactionError<StateError>> {
    let min_new_max_fee_per_gas = min_new_fee(old_transaction.gas_price());
    if new_transaction.gas_price() < min_new_max_fee_per_gas {
        return Err(MemPoolAddTransactionError::ReplacementMaxFeePerGasTooLow {
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
            MemPoolAddTransactionError::ReplacementMaxPriorityFeePerGasTooLow {
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
