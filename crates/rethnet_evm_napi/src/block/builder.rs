use std::sync::Arc;

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::sync::Mutex,
    Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, U256};

use crate::{
    blockchain::Blockchain, cast::TryCast, state::StateManager, transaction::Transaction, Config,
    ExecutionResult,
};

use super::{BlockConfig, BlockHeader};

#[napi]
pub struct BlockBuilder {
    builder: Arc<Mutex<Option<rethnet_evm::BlockBuilder<anyhow::Error>>>>,
}

#[napi]
impl BlockBuilder {
    #[napi]
    pub async fn new(
        blockchain: &Blockchain,
        state_manager: &StateManager,
        config: Config,
        parent: BlockHeader,
        block: BlockConfig,
    ) -> napi::Result<BlockBuilder> {
        let config = config.try_into()?;
        let parent = parent.try_into()?;
        let block = block.try_into()?;

        let builder = rethnet_evm::BlockBuilder::new(
            blockchain.as_inner().clone(),
            state_manager.db.clone(),
            config,
            parent,
            block,
        )
        .await
        .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self {
            builder: Arc::new(Mutex::new(Some(builder))),
        })
    }

    #[napi]
    pub async fn add_transaction(&self, transaction: Transaction) -> napi::Result<ExecutionResult> {
        let mut builder = self.builder.lock().await;
        if let Some(builder) = builder.as_mut() {
            let transaction = transaction.try_into()?;

            let result = builder
                .add_transaction(transaction)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

            result.try_into()
        } else {
            Err(napi::Error::new(
                Status::InvalidArg,
                "`this` has been moved in Rust".to_owned(),
            ))
        }
    }

    #[napi]
    /// This call consumes the [`BlockBuilder`] object in Rust. Afterwards, you can no longer call
    /// methods on the JS object.
    pub async fn finalize(&self, rewards: Vec<(Buffer, BigInt)>) -> napi::Result<()> {
        let mut builder = self.builder.lock().await;
        if let Some(builder) = builder.take() {
            let rewards = rewards
                .into_iter()
                .map(|(address, reward)| {
                    reward
                        .try_cast()
                        .map(|reward| (Address::from_slice(&address), reward))
                })
                .collect::<napi::Result<Vec<(Address, U256)>>>()?;

            builder
                .finalize(rewards)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
        } else {
            Err(napi::Error::new(
                Status::InvalidArg,
                "The BlockBuilder object has been moved in Rust".to_owned(),
            ))
        }
    }

    #[napi]
    /// This call consumes the [`BlockBuilder`] object in Rust. Afterwards, you can no longer call
    /// methods on the JS object.
    pub async fn abort(&self) -> napi::Result<()> {
        let mut builder = self.builder.lock().await;
        if let Some(builder) = builder.take() {
            builder
                .abort()
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
        } else {
            Err(napi::Error::new(
                Status::InvalidArg,
                "The BlockBuilder object has been moved in Rust".to_owned(),
            ))
        }
    }
}
