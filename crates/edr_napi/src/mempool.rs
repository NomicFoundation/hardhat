use std::{ops::Deref, sync::Arc};

use edr_eth::{Address, B256};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::runtime,
    Status,
};
use napi_derive::napi;
use parking_lot::RwLock;

use crate::{
    cast::TryCast,
    state::State,
    transaction::{OrderedTransaction, PendingTransaction},
};

/// The mem pool contains transactions pending inclusion in the blockchain.
#[napi]
pub struct MemPool {
    inner: Arc<RwLock<edr_evm::MemPool>>,
}

impl Deref for MemPool {
    type Target = Arc<RwLock<edr_evm::MemPool>>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl MemPool {
    #[doc = "Constructs a new [`MemPool`]."]
    #[napi(constructor)]
    pub fn new(block_gas_limit: BigInt) -> napi::Result<Self> {
        let block_gas_limit: u64 = block_gas_limit.try_cast()?;

        Ok(Self {
            inner: Arc::new(RwLock::new(edr_evm::MemPool::new(block_gas_limit))),
        })
    }

    #[doc = "Creates a deep clone of the [`MemPool`]."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn deep_clone(&self) -> napi::Result<MemPool> {
        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                let mem_pool = mem_pool.read();

                Self {
                    inner: Arc::new(RwLock::new(mem_pool.clone())),
                }
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Retrieves the instance's block gas limit."]
    #[napi]
    pub async fn block_gas_limit(&self) -> napi::Result<BigInt> {
        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || BigInt::from(mem_pool.read().block_gas_limit()))
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Sets the instance's block gas limit."]
    #[napi]
    pub async fn set_block_gas_limit(
        &self,
        state: &State,
        block_gas_limit: BigInt,
    ) -> napi::Result<()> {
        let block_gas_limit: u64 = block_gas_limit.try_cast()?;

        let state = (*state).clone();
        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                let state = state.read();
                mem_pool
                    .write()
                    .set_block_gas_limit(&*state, block_gas_limit)
                    .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }

    #[doc = "Retrieves the last pending nonce of the account corresponding to the specified address, if it exists."]
    #[napi]
    pub async fn last_pending_nonce(&self, address: Buffer) -> napi::Result<Option<BigInt>> {
        let address = Address::from_slice(&address);

        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || mem_pool.read().last_pending_nonce(&address).map(From::from))
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Tries to add the provided transaction to the instance."]
    #[napi]
    pub async fn add_transaction(
        &self,
        state: &State,
        transaction: &PendingTransaction,
    ) -> napi::Result<()> {
        let mem_pool = self.inner.clone();
        let state = (*state).clone();
        let transaction = (*transaction).clone();

        runtime::Handle::current()
            .spawn_blocking(move || {
                let state = state.read();

                mem_pool
                    .write()
                    .add_transaction(&*state, transaction)
                    .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }

    #[doc = "Removes the transaction corresponding to the provided hash, if it exists."]
    #[napi]
    pub async fn remove_transaction(&self, hash: Buffer) -> napi::Result<bool> {
        let hash = TryCast::<B256>::try_cast(hash)?;

        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || mem_pool.write().remove_transaction(&hash).is_some())
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Updates the instance, moving any future transactions to the pending status, if their nonces are high enough."]
    #[napi]
    pub async fn update(&self, state: &State) -> napi::Result<()> {
        let mem_pool = self.inner.clone();
        let state = (*state).clone();

        runtime::Handle::current()
            .spawn_blocking(move || {
                let state = state.read();

                mem_pool
                    .write()
                    .update(&*state)
                    .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }

    #[doc = "Returns all transactions in the mem pool."]
    #[napi]
    pub async fn transactions(&self) -> napi::Result<Vec<PendingTransaction>> {
        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                mem_pool
                    .read()
                    .transactions()
                    .cloned()
                    .map(PendingTransaction::from)
                    .collect()
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Returns whether the [`MemPool`] contains any future transactions."]
    #[napi]
    pub async fn has_future_transactions(&self) -> napi::Result<bool> {
        let mem_pool = self.inner.clone();

        runtime::Handle::current()
            .spawn_blocking(move || mem_pool.read().has_future_transactions())
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Returns whether the [`MemPool`] contains any pending transactions."]
    #[napi]
    pub async fn has_pending_transactions(&self) -> napi::Result<bool> {
        let mem_pool = self.inner.clone();

        runtime::Handle::current()
            .spawn_blocking(move || mem_pool.read().has_pending_transactions())
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    #[doc = "Returns the transaction corresponding to the provided hash, if it exists."]
    #[napi]
    pub async fn transaction_by_hash(
        &self,
        hash: Buffer,
    ) -> napi::Result<Option<OrderedTransaction>> {
        let hash = TryCast::<B256>::try_cast(hash)?;

        let mem_pool = self.inner.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                mem_pool
                    .read()
                    .transaction_by_hash(&hash)
                    .cloned()
                    .map(OrderedTransaction::from)
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }
}
