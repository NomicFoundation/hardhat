use std::num::NonZeroU64;

use edr_eth::{
    transaction::{Eip1559TransactionRequest, Eip155TransactionRequest, TransactionKind},
    AccountInfo, Address, Bytes, HashMap, SpecId, U256,
};

use crate::{
    state::{AccountTrie, StateError, TrieState},
    ExecutableTransaction, MemPool, MemPoolAddTransactionError, TransactionCreationError,
};

/// A test fixture for `MemPool`.
pub struct MemPoolTestFixture {
    /// The mem pool.
    pub mem_pool: MemPool,
    /// The state.
    pub state: TrieState,
}

impl MemPoolTestFixture {
    /// Constructs an instance with the provided accounts.
    pub fn with_accounts(accounts: &[(Address, AccountInfo)]) -> Self {
        let accounts = accounts.iter().cloned().collect::<HashMap<_, _>>();
        let trie = AccountTrie::with_accounts(&accounts);

        MemPoolTestFixture {
            // SAFETY: literal is non-zero
            mem_pool: MemPool::new(unsafe { NonZeroU64::new_unchecked(10_000_000u64) }),
            state: TrieState::with_accounts(trie),
        }
    }

    /// Tries to add the provided transaction to the mem pool.
    pub fn add_transaction(
        &mut self,
        transaction: ExecutableTransaction,
    ) -> Result<(), MemPoolAddTransactionError<StateError>> {
        self.mem_pool.add_transaction(&self.state, transaction)
    }

    /// Sets the block gas limit.
    pub fn set_block_gas_limit(&mut self, block_gas_limit: NonZeroU64) -> Result<(), StateError> {
        self.mem_pool
            .set_block_gas_limit(&self.state, block_gas_limit)
    }

    /// Updates the mem pool.
    pub fn update(&mut self) -> Result<(), StateError> {
        self.mem_pool.update(&self.state)
    }
}

/// Creates a dummy EIP-155 transaction.
pub fn dummy_eip155_transaction(
    caller: Address,
    nonce: u64,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    dummy_eip155_transaction_with_price(caller, nonce, U256::ZERO)
}

/// Creates a dummy EIP-155 transaction with the provided gas price.
pub fn dummy_eip155_transaction_with_price(
    caller: Address,
    nonce: u64,
    gas_price: U256,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    dummy_eip155_transaction_with_price_and_limit(caller, nonce, gas_price, 30_000)
}

/// Creates a dummy EIP-155 transaction with the provided gas limit.
pub fn dummy_eip155_transaction_with_limit(
    caller: Address,
    nonce: u64,
    gas_limit: u64,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    dummy_eip155_transaction_with_price_and_limit(caller, nonce, U256::ZERO, gas_limit)
}

fn dummy_eip155_transaction_with_price_and_limit(
    caller: Address,
    nonce: u64,
    gas_price: U256,
    gas_limit: u64,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    dummy_eip155_transaction_with_price_limit_and_value(
        caller,
        nonce,
        gas_price,
        gas_limit,
        U256::ZERO,
    )
}

/// Creates a dummy EIP-155 transaction with the provided gas price, gas limit,
/// and value.
pub fn dummy_eip155_transaction_with_price_limit_and_value(
    caller: Address,
    nonce: u64,
    gas_price: U256,
    gas_limit: u64,
    value: U256,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    let from = Address::random();
    let request = Eip155TransactionRequest {
        nonce,
        gas_price,
        gas_limit,
        kind: TransactionKind::Call(from),
        value,
        input: Bytes::new(),
        chain_id: 123,
    };
    let transaction = request.fake_sign(&caller);

    ExecutableTransaction::with_caller(SpecId::LATEST, transaction.into(), caller)
}

/// Creates a dummy EIP-1559 transaction with the provided max fee and max
/// priority fee per gas.
pub fn dummy_eip1559_transaction(
    caller: Address,
    nonce: u64,
    max_fee_per_gas: U256,
    max_priority_fee_per_gas: U256,
) -> Result<ExecutableTransaction, TransactionCreationError> {
    let from = Address::random();
    let request = Eip1559TransactionRequest {
        chain_id: 123,
        nonce,
        max_priority_fee_per_gas,
        max_fee_per_gas,
        gas_limit: 30_000,
        kind: TransactionKind::Call(from),
        value: U256::ZERO,
        input: Bytes::new(),
        access_list: Vec::new(),
    };
    let transaction = request.fake_sign(&caller);

    ExecutableTransaction::with_caller(SpecId::LATEST, transaction.into(), caller)
}
