use std::{fmt::Debug, sync::Arc};

use revm::{
    db::DatabaseComponents,
    primitives::{BlockEnv, CfgEnv, ExecutionResult, SpecId, TxEnv},
};
use tokio::sync::RwLock;

use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::SyncState,
    trace::Trace,
    transaction::TransactionError,
    State,
};

/// Asynchronous implementation of the Database super-trait
pub type SyncDatabase<'b, 's, BE, SE> =
    DatabaseComponents<&'s dyn SyncState<SE>, &'b dyn SyncBlockchain<BE>>;

/// The asynchronous Rethnet runtime.
#[derive(Debug)]
pub struct Rethnet<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    blockchain: Arc<RwLock<Box<dyn SyncBlockchain<BE>>>>,
    state: Arc<RwLock<Box<dyn SyncState<SE>>>>,
    cfg: CfgEnv,
}

impl<BE, SE> Rethnet<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    /// Constructs a new [`Rethnet`] instance.
    pub fn new(
        blockchain: Arc<RwLock<Box<dyn SyncBlockchain<BE>>>>,
        state: Arc<RwLock<Box<dyn SyncState<SE>>>>,
        cfg: CfgEnv,
    ) -> Self {
        Self {
            blockchain,
            state,
            cfg,
        }
    }

    /// Runs a transaction without committing the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn SyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError<BE, SE>> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let state = self.state.read().await;
        let blockchain = self.blockchain.read().await;

        let evm = build_evm(&*blockchain, &*state, self.cfg.clone(), transaction, block);

        run_transaction(evm, inspector).map_err(TransactionError::from)
    }

    /// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn SyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError<BE, SE>> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let mut cfg = self.cfg.clone();
        cfg.disable_balance_check = true;

        let state = self.state.read().await;
        let blockchain = self.blockchain.read().await;

        let evm = build_evm(&*blockchain, &*state, cfg, transaction, block);

        run_transaction(evm, inspector).map_err(TransactionError::from)
    }

    /// Runs a transaction, committing the state in the process.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn SyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, Trace), TransactionError<BE, SE>> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let mut state = self.state.write().await;
        let blockchain = self.blockchain.read().await;

        let evm = build_evm(&*blockchain, &*state, self.cfg.clone(), transaction, block);

        let (result, changes, trace) =
            run_transaction(evm, inspector).map_err(TransactionError::from)?;

        state.commit(changes);

        Ok((result, trace))
    }
}
