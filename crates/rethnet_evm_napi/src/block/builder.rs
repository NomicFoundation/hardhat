use std::sync::Arc;

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::sync::Mutex,
    Status,
};
use napi_derive::napi;
use rethnet_eth::{block::Header, Address, U256};
use rethnet_evm::{state::StateError, CfgEnv, HeaderData, TxEnv};

use crate::{
    blockchain::Blockchain,
    cast::TryCast,
    config::Config,
    state::StateManager,
    tracer::Tracer,
    transaction::{result::ExecutionResult, Transaction},
};

use super::{BlockConfig, BlockHeader};

#[napi]
pub struct BlockBuilder {
    builder: Arc<Mutex<Option<rethnet_evm::BlockBuilder<napi::Error, StateError>>>>,
}

#[napi]
impl BlockBuilder {
    #[napi]
    pub fn new(
        blockchain: &Blockchain,
        state_manager: &StateManager,
        config: Config,
        parent: BlockHeader,
        block: BlockConfig,
    ) -> napi::Result<BlockBuilder> {
        let config = CfgEnv::try_from(config)?;
        let parent = Header::try_from(parent)?;
        let block = HeaderData::try_from(block)?;

        let builder = rethnet_evm::BlockBuilder::new(
            blockchain.as_inner().clone(),
            state_manager.state.clone(),
            config,
            parent,
            block,
        );

        Ok(Self {
            builder: Arc::new(Mutex::new(Some(builder))),
        })
    }

    #[napi]
    pub async fn add_transaction(
        &self,
        transaction: Transaction,
        tracer: Option<&Tracer>,
    ) -> napi::Result<ExecutionResult> {
        let mut builder = self.builder.lock().await;
        if let Some(builder) = builder.as_mut() {
            let transaction = TxEnv::try_from(transaction)?;

            let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

            let result = builder
                .add_transaction(transaction, inspector)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

            Ok(result.into())
        } else {
            Err(napi::Error::new(
                Status::InvalidArg,
                "`this` has been moved in Rust".to_owned(),
            ))
        }
    }

    /// This call consumes the [`BlockBuilder`] object in Rust. Afterwards, you can no longer call
    /// methods on the JS object.
    #[napi]
    pub async fn finalize(&self, rewards: Vec<(Buffer, BigInt)>) -> napi::Result<()> {
        let mut builder = self.builder.lock().await;
        if let Some(builder) = builder.take() {
            let rewards = rewards
                .into_iter()
                .map(|(address, reward)| {
                    TryCast::<U256>::try_cast(reward)
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

    /// This call consumes the [`BlockBuilder`] object in Rust. Afterwards, you can no longer call
    /// methods on the JS object.
    #[napi]
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
