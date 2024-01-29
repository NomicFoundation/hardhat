use std::sync::Arc;

use edr_eth::{block::Header, Address, U256};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{StateError, SyncState},
    trace::TraceCollector,
    BlockTransactionError, CfgEnv, InvalidTransaction, SyncBlock, SyncInspector,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::runtime,
    Status,
};
use napi_derive::napi;
use parking_lot::RwLock;

use super::{Block, BlockHeader, BlockOptions};
use crate::{
    blockchain::Blockchain,
    cast::TryCast,
    config::ConfigOptions,
    state::State,
    transaction::{result::TransactionResult, PendingTransaction},
};

#[napi]
pub struct BlockBuilder {
    builder: Arc<RwLock<Option<edr_evm::BlockBuilder>>>,
    blockchain: Arc<RwLock<dyn SyncBlockchain<BlockchainError, StateError>>>,
    state: Arc<RwLock<Box<dyn SyncState<StateError>>>>,
}

#[napi]
impl BlockBuilder {
    #[napi(constructor)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(
        blockchain: &Blockchain,
        state_manager: &State,
        config: ConfigOptions,
        parent: BlockHeader,
        block: BlockOptions,
    ) -> napi::Result<Self> {
        let parent = Header::try_from(parent)?;
        let block = edr_eth::block::BlockOptions::try_from(block)?;

        let config = CfgEnv::try_from(config)?;
        let blockchain = (*blockchain).clone();
        let state = (*state_manager).clone();

        edr_evm::BlockBuilder::new(config, &parent, block, None).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |builder| {
                Ok(Self {
                    builder: Arc::new(RwLock::new(Some(builder))),
                    blockchain,
                    state,
                })
            },
        )
    }

    /// Retrieves the amount of gas used by the builder.
    #[napi(getter)]
    pub async fn gas_used(&self) -> napi::Result<BigInt> {
        let builder = self.builder.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                let builder = builder.read();
                if let Some(builder) = builder.as_ref() {
                    Ok(BigInt::from(builder.gas_used()))
                } else {
                    Err(napi::Error::new(
                        Status::InvalidArg,
                        "`this` has been moved in Rust".to_owned(),
                    ))
                }
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }

    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn add_transaction(
        &self,
        transaction: &PendingTransaction,
        with_trace: bool,
    ) -> napi::Result<TransactionResult> {
        let blockchain = self.blockchain.clone();
        let builder = self.builder.clone();
        let state = self.state.clone();
        let transaction = (*transaction).clone();

        runtime::Handle::current().spawn_blocking(move || {
            let mut builder = builder.write();
            if let Some(builder) = builder.as_mut() {
                let mut tracer = TraceCollector::default();
                let inspector: Option<&mut dyn SyncInspector<BlockchainError, StateError>> =
                    if with_trace { Some(&mut tracer) } else { None };

                builder
                    .add_transaction(&*blockchain.read(), &mut *state.write(), transaction, inspector)
                    .map_or_else(
                        |e| Err(napi::Error::new(Status::GenericFailure, match e {
                            BlockTransactionError::InvalidTransaction(
                                InvalidTransaction::LackOfFundForMaxFee { fee, balance },
                            ) => format!("sender doesn't have enough funds to send tx. The max upfront cost is: {fee} and the sender's account only has: {balance}"),
                            e => e.to_string(),
                        })),
                        |result| {
                            let trace = if with_trace {
                                Some(tracer.into_trace())
                            } else {
                                None
                            };

                            Ok(TransactionResult::new(result, None, trace))
                        },
                    )
            } else {
                Err(napi::Error::new(
                    Status::InvalidArg,
                    "`this` has been moved in Rust".to_owned(),
                ))
            }
        })
        .await.map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }

    /// This call consumes the [`BlockBuilder`] object in Rust. Afterwards, you
    /// can no longer call methods on the JS object.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn finalize(
        &self,
        rewards: Vec<(Buffer, BigInt)>,
        timestamp: Option<BigInt>,
    ) -> napi::Result<Block> {
        let builder = self.builder.clone();
        let state = self.state.clone();

        runtime::Handle::current()
            .spawn_blocking(move || {
                let mut builder = builder.write();
                if let Some(builder) = builder.take() {
                    let rewards = rewards
                        .into_iter()
                        .map(|(address, reward)| {
                            TryCast::<U256>::try_cast(reward)
                                .map(|reward| (Address::from_slice(&address), reward))
                        })
                        .collect::<napi::Result<Vec<(Address, U256)>>>()?;

                    let timestamp: Option<u64> = timestamp.map_or(Ok(None), |timestamp| {
                        BigInt::try_cast(timestamp).map(Option::Some)
                    })?;

                    builder
                        .finalize(&mut *state.write(), rewards, timestamp)
                        .map_or_else(
                            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                            |result| {
                                let block: Arc<dyn SyncBlock<Error = BlockchainError>> =
                                    Arc::new(result.block);
                                Ok(Block::from(block))
                            },
                        )
                } else {
                    Err(napi::Error::new(
                        Status::InvalidArg,
                        "The BlockBuilder object has been moved in Rust".to_owned(),
                    ))
                }
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
    }
}
