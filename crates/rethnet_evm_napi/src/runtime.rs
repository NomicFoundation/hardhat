use napi::Status;
use napi_derive::napi;
use once_cell::sync::OnceCell;
use rethnet_evm::{state::StateError, TxEnv};

use crate::{
    block::BlockConfig,
    blockchain::Blockchain,
    config::Config,
    state::StateManager,
    tracer::Tracer,
    transaction::{
        result::{ExecutionResult, TransactionResult},
        Transaction,
    },
};

struct Logger;

unsafe impl Sync for Logger {}

static LOGGER: OnceCell<Logger> = OnceCell::new();

#[napi]
pub struct Rethnet {
    runtime: rethnet_evm::Rethnet<napi::Error, StateError>,
}

#[napi]
impl Rethnet {
    #[napi(constructor)]
    pub fn new(
        blockchain: &Blockchain,
        state_manager: &StateManager,
        cfg: Config,
    ) -> napi::Result<Self> {
        let _logger = LOGGER.get_or_init(|| {
            pretty_env_logger::init();
            Logger
        });

        let cfg = cfg.try_into()?;

        let runtime = rethnet_evm::Rethnet::new(
            blockchain.as_inner().clone(),
            state_manager.state.clone(),
            cfg,
        );

        Ok(Self { runtime })
    }

    #[napi]
    pub async fn dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        self.runtime
            .dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .try_into()
    }

    #[napi]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        self.runtime
            .guaranteed_dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .try_into()
    }

    #[napi]
    pub async fn run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<ExecutionResult> {
        let transaction: TxEnv = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        Ok(self
            .runtime
            .run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .into())
    }
}
