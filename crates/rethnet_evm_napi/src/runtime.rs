use napi::Status;
use napi_derive::napi;
use once_cell::sync::OnceCell;
use rethnet_evm::{
    state::StateError, BlockEnv, CfgEnv, InvalidTransaction, TransactionError, TxEnv,
};

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

/// The Rethnet runtime, which can execute individual transactions.
#[napi]
pub struct Rethnet {
    runtime: rethnet_evm::Rethnet<napi::Error, StateError>,
}

#[napi]
impl Rethnet {
    /// Constructs a `Rethnet` runtime.
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

        let cfg = CfgEnv::try_from(cfg)?;

        let runtime = rethnet_evm::Rethnet::new(
            blockchain.as_inner().clone(),
            state_manager.state.clone(),
            cfg,
        );

        Ok(Self { runtime })
    }

    /// Executes the provided transaction without changing state.
    #[napi]
    pub async fn dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        TransactionResult::try_from(
            self.runtime
                .dry_run(transaction, block, inspector)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?,
        )
    }

    /// Executes the provided transaction without changing state, ignoring validation checks in the process.
    #[napi]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        TransactionResult::try_from(
            self.runtime
                .guaranteed_dry_run(transaction, block, inspector)
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?,
        )
    }

    /// Executes the provided transaction, changing state in the process.
    #[napi]
    pub async fn run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<ExecutionResult> {
        let transaction = TxEnv::try_from(transaction)?;
        let block = BlockEnv::try_from(block)?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        Ok(ExecutionResult::from(self
            .runtime
            .run(transaction, block, inspector)
            .await
            .map_err(|e| {
                napi::Error::new(
                    Status::GenericFailure,
                    match e {
                        TransactionError::InvalidTransaction(
                            InvalidTransaction::LackOfFundForGasLimit { gas_limit, balance },
                        ) => format!("sender doesn't have enough funds to send tx. The max upfront cost is: {} and the sender's account only has: {}", gas_limit, balance),
                        e => e.to_string(),
                    },
                )
            })?))
    }
}
