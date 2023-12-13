//! Functionality for running transactions in the EVM

use edr_evm::{
    trace::TraceCollector, BlockEnv, CfgEnv, InspectorContainer, InvalidTransaction,
    ResultAndState, TransactionError, TxEnv,
};
use napi::{tokio::runtime, Status};
use napi_derive::napi;

use crate::{
    block::BlockConfig,
    blockchain::Blockchain,
    config::ConfigOptions,
    state::{State, StateOverrides},
    tracer::Tracer,
    transaction::{result::TransactionResult, TransactionRequest},
};

/// Executes the provided transaction without changing state.
#[napi]
#[allow(clippy::too_many_arguments)]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn dry_run(
    blockchain: &Blockchain,
    state: &State,
    state_overrides: &StateOverrides,
    cfg: ConfigOptions,
    transaction: TransactionRequest,
    block: BlockConfig,
    with_trace: bool,
    tracer: Option<&Tracer>,
) -> napi::Result<TransactionResult> {
    let cfg = CfgEnv::try_from(cfg)?;
    let transaction = TxEnv::try_from(transaction)?;
    let block = BlockEnv::try_from(block)?;
    let mut tracer = tracer.map(Tracer::as_dyn_inspector);

    let blockchain = (*blockchain).clone();
    let state = (*state).clone();
    let state_overrides = state_overrides.as_inner().clone();

    runtime::Handle::current()
        .spawn_blocking(move || {
            // WORKAROUND: limiting the scope of the mutable borrow of `tracer` to this
            // block
            let mut container = InspectorContainer::new(
                with_trace,
                if let Some(tracer) = &mut tracer {
                    Some(tracer.as_mut())
                } else {
                    None
                },
            );

            let ResultAndState { result, state } = edr_evm::dry_run(
                &*blockchain.read(),
                &*state.read(),
                &state_overrides,
                cfg,
                transaction,
                block,
                container.as_dyn_inspector(),
            )
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

            let trace = container.into_tracer().map(TraceCollector::into_trace);
            Ok(TransactionResult::new(result, Some(state), trace))
        })
        .await
        .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
}

/// Executes the provided transaction without changing state, ignoring
/// validation checks in the process.
#[napi]
#[allow(clippy::too_many_arguments)]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn guaranteed_dry_run(
    blockchain: &Blockchain,
    state: &State,
    state_overrides: &StateOverrides,
    cfg: ConfigOptions,
    transaction: TransactionRequest,
    block: BlockConfig,
    with_trace: bool,
    tracer: Option<&Tracer>,
) -> napi::Result<TransactionResult> {
    let cfg = CfgEnv::try_from(cfg)?;
    let transaction = TxEnv::try_from(transaction)?;
    let block = BlockEnv::try_from(block)?;
    let mut tracer = tracer.map(Tracer::as_dyn_inspector);

    let blockchain = (*blockchain).clone();
    let state = (*state).clone();
    let state_overrides = state_overrides.as_inner().clone();

    runtime::Handle::current()
        .spawn_blocking(move || {
            // WORKAROUND: limiting the scope of the mutable borrow of `tracer` to this
            // block
            let mut container = InspectorContainer::new(
                with_trace,
                if let Some(tracer) = &mut tracer {
                    Some(tracer.as_mut())
                } else {
                    None
                },
            );

            let ResultAndState { result, state } = edr_evm::guaranteed_dry_run(
                &*blockchain.read(),
                &*state.read(),
                &state_overrides,
                cfg,
                transaction,
                block,
                container.as_dyn_inspector(),
            )
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

            let trace = container.into_tracer().map(TraceCollector::into_trace);
            Ok(TransactionResult::new(result, Some(state), trace))
        })
        .await
        .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
}

/// Executes the provided transaction, changing state in the process.
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn run(
    blockchain: &Blockchain,
    state: &State,
    cfg: ConfigOptions,
    transaction: TransactionRequest,
    block: BlockConfig,
    with_trace: bool,
    tracer: Option<&Tracer>,
) -> napi::Result<TransactionResult> {
    let cfg = CfgEnv::try_from(cfg)?;
    let transaction = TxEnv::try_from(transaction)?;
    let block = BlockEnv::try_from(block)?;
    let mut tracer = tracer.map(Tracer::as_dyn_inspector);

    let blockchain = (*blockchain).clone();
    let state = (*state).clone();

    runtime::Handle::current().spawn_blocking(move || {
        // WORKAROUND: limiting the scope of the mutable borrow of `tracer` to this
        // block
        let mut container = InspectorContainer::new(with_trace, if let Some(tracer) = &mut tracer {
            Some(tracer.as_mut())
        } else {
            None
        });

        let result = edr_evm::run(
            &*blockchain.read(),
            &mut *state.write(),
            cfg, transaction, block, container.as_dyn_inspector()
        )
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

        let trace = container.into_tracer().map(TraceCollector::into_trace);
        Ok(TransactionResult::new(result, None, trace))
    })
        .await
        .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
}
