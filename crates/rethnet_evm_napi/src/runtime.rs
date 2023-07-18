use napi::Status;
use napi_derive::napi;
use rethnet_evm::{
    blockchain::BlockchainError, state::StateError, trace::TraceCollector, BlockEnv, CfgEnv,
    InvalidTransaction, ResultAndState, SyncInspector, TransactionError, TxEnv,
};

use crate::{
    block::BlockConfig,
    blockchain::Blockchain,
    config::{Config, ConfigOptions},
    state::StateManager,
    transaction::{result::TransactionResult, TransactionRequest},
};

/// The Rethnet runtime, which can execute individual transactions.
#[napi]
#[derive(Debug)]
pub struct Rethnet {
    runtime: rethnet_evm::Rethnet<BlockchainError, StateError>,
}

#[napi]
impl Rethnet {
    /// Constructs a `Rethnet` runtime.
    #[napi(constructor)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(
        blockchain: &Blockchain,
        state_manager: &StateManager,
        cfg: ConfigOptions,
    ) -> napi::Result<Self> {
        let cfg = CfgEnv::try_from(cfg)?;

        let runtime =
            rethnet_evm::Rethnet::new((*blockchain).clone(), (*state_manager).clone(), cfg);

        Ok(Self { runtime })
    }

    /// Retrieves the runtime's config.
    #[napi]
    pub fn config(&self) -> Config {
        Config::new(self.runtime.config().clone())
    }

    /// Executes the provided transaction without changing state.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn dry_run(
        &self,
        transaction: TransactionRequest,
        block: BlockConfig,
        with_trace: bool,
    ) -> napi::Result<TransactionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let mut tracer = TraceCollector::default();
        let inspector: Option<&mut dyn SyncInspector<BlockchainError, StateError>> =
            if with_trace { Some(&mut tracer) } else { None };

        let ResultAndState { result, state } = self
            .runtime
            .dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        let trace = if with_trace {
            Some(tracer.into_trace())
        } else {
            None
        };

        Ok(TransactionResult::new(result, Some(state), trace))
    }

    /// Executes the provided transaction without changing state, ignoring validation checks in the process.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: TransactionRequest,
        block: BlockConfig,
        with_trace: bool,
    ) -> napi::Result<TransactionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let mut tracer = TraceCollector::default();
        let inspector: Option<&mut dyn SyncInspector<BlockchainError, StateError>> =
            if with_trace { Some(&mut tracer) } else { None };

        let ResultAndState { result, state } = self
            .runtime
            .guaranteed_dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        let trace = if with_trace {
            Some(tracer.into_trace())
        } else {
            None
        };

        Ok(TransactionResult::new(result, Some(state), trace))
    }

    /// Executes the provided transaction, changing state in the process.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn run(
        &self,
        transaction: TransactionRequest,
        block: BlockConfig,
        with_trace: bool,
    ) -> napi::Result<TransactionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let mut tracer = TraceCollector::default();
        let inspector: Option<&mut dyn SyncInspector<BlockchainError, StateError>> =
            if with_trace { Some(&mut tracer) } else { None };

        let result = self
        .runtime
        .run(transaction, block, inspector)
        .await
        .map_err(|e| {
            napi::Error::new(
                Status::GenericFailure,
                match e {
                    TransactionError::InvalidTransaction(
                        InvalidTransaction::LackOfFundForMaxFee { fee, balance }
                    ) => format!("sender doesn't have enough funds to send tx. The max upfront cost is: {fee} and the sender's account only has: {balance}"),
                    e => e.to_string(),
                },
            )
        })?;

        let trace = if with_trace {
            Some(tracer.into_trace())
        } else {
            None
        };

        Ok(TransactionResult::new(result, None, trace))
    }
}
