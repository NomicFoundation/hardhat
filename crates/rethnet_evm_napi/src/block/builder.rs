use std::borrow::BorrowMut;

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, U256};

use crate::{
    cast::TryCast, state::StateManager, transaction::Transaction, Config, ExecutionResult,
};

use super::{BlockConfig, BlockHeader};

#[napi]
pub struct BlockBuilder {
    builder: Option<rethnet_evm::BlockBuilder<anyhow::Error>>,
}

#[napi]
impl BlockBuilder {
    #[napi]
    pub async fn new(
        state_manager: &StateManager,
        config: Config,
        parent: BlockHeader,
        block: BlockConfig,
    ) -> napi::Result<BlockBuilder> {
        let config = config.try_into()?;
        let parent = parent.try_into()?;
        let block = block.try_into()?;

        let builder =
            rethnet_evm::BlockBuilder::new(state_manager.db.clone(), config, parent, block)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self {
            builder: Some(builder),
        })
    }

    #[napi]
    pub async fn add_transaction(
        &mut self,
        transaction: Transaction,
    ) -> napi::Result<ExecutionResult> {
        if let Some(builder) = self.builder.borrow_mut() {
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
    pub async fn finalize(&mut self, rewards: Vec<(Buffer, BigInt)>) -> napi::Result<()> {
        if let Some(builder) = self.builder.take() {
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
    pub async fn abort(&mut self) -> napi::Result<()> {
        if let Some(builder) = self.builder.take() {
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
