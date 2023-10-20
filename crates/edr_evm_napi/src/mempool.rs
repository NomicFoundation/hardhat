use std::{ops::Deref, sync::Arc};

use edr_eth::{Address, B256, U256};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::sync::RwLock,
    Status,
};
use napi_derive::napi;

use crate::{
    cast::TryCast,
    state::State,
    transaction::{OrderedTransaction, PendingTransaction},
};

/// The mempool contains transactions pending inclusion in the blockchain.
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
        let block_gas_limit: U256 = block_gas_limit.try_cast()?;

        Ok(Self {
            inner: Arc::new(RwLock::new(edr_evm::MemPool::new(block_gas_limit))),
        })
    }

    #[doc = "Creates a deep clone of the [`MemPool`]."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn deep_clone(&self) -> Self {
        let mem_pool = self.read().await;

        Self {
            inner: Arc::new(RwLock::new(mem_pool.clone())),
        }
    }

    #[doc = "Retrieves the instance's block gas limit."]
    #[napi]
    pub async fn block_gas_limit(&self) -> BigInt {
        let mem_pool = self.read().await;

        BigInt {
            sign_bit: false,
            words: mem_pool.block_gas_limit().as_limbs().to_vec(),
        }
    }

    #[doc = "Sets the instance's block gas limit."]
    #[napi]
    pub async fn set_block_gas_limit(&self, block_gas_limit: BigInt) -> napi::Result<()> {
        let block_gas_limit: U256 = block_gas_limit.try_cast()?;

        self.write().await.set_block_gas_limit(block_gas_limit);

        Ok(())
    }

    #[doc = "Retrieves the last pending nonce of the account corresponding to the specified address, if it exists."]
    #[napi]
    pub async fn last_pending_nonce(&self, address: Buffer) -> Option<BigInt> {
        let address = Address::from_slice(&address);

        self.read()
            .await
            .last_pending_nonce(&address)
            .map(From::from)
    }

    #[doc = "Tries to add the provided transaction to the instance."]
    #[napi]
    pub async fn add_transaction(
        &self,
        state_manager: &State,
        transaction: &PendingTransaction,
    ) -> napi::Result<()> {
        let state = state_manager.read().await;

        self.write()
            .await
            .add_transaction(&*state, (*transaction).clone())
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Removes the transaction corresponding to the provided hash, if it exists."]
    #[napi]
    pub async fn remove_transaction(&self, hash: Buffer) -> napi::Result<bool> {
        let hash = TryCast::<B256>::try_cast(hash)?;

        Ok(self.write().await.remove_transaction(&hash).is_some())
    }

    #[doc = "Updates the instance, moving any future transactions to the pending status, if their nonces are high enough."]
    #[napi]
    pub async fn update(&self, state_manager: &State) -> napi::Result<()> {
        let state = state_manager.read().await;

        self.write()
            .await
            .update(&*state)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Returns all transactions in the mem pool."]
    #[napi]
    pub async fn transactions(&self) -> Vec<PendingTransaction> {
        let mempool = self.read().await;

        mempool
            .transactions()
            .cloned()
            .map(PendingTransaction::from)
            .collect()
    }

    #[doc = "Returns whether the [`MemPool`] contains any future transactions."]
    #[napi]
    pub async fn has_future_transactions(&self) -> bool {
        self.read().await.has_future_transactions()
    }

    #[doc = "Returns whether the [`MemPool`] contains any pending transactions."]
    #[napi]
    pub async fn has_pending_transactions(&self) -> bool {
        self.read().await.has_pending_transactions()
    }

    #[doc = "Returns the transaction corresponding to the provided hash, if it exists."]
    #[napi]
    pub async fn transaction_by_hash(
        &self,
        hash: Buffer,
    ) -> napi::Result<Option<OrderedTransaction>> {
        let hash = TryCast::<B256>::try_cast(hash)?;

        Ok(self
            .read()
            .await
            .transaction_by_hash(&hash)
            .cloned()
            .map(OrderedTransaction::from))
    }
}
