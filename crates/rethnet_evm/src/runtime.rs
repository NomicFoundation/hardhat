use std::{fmt::Debug, sync::Arc};

use revm::{
    db::DatabaseComponents,
    primitives::{BlockEnv, CfgEnv, ExecutionResult, SpecId, TxEnv},
};

use crate::{
    blockchain::AsyncBlockchain,
    evm::{run_transaction, AsyncInspector},
    state::AsyncState,
    trace::Trace,
    transaction::TransactionError,
    State,
};

/// Asynchronous implementation of the Database super-trait
pub type AsyncDatabase<BE, SE> = DatabaseComponents<Arc<AsyncState<SE>>, Arc<AsyncBlockchain<BE>>>;

/// The asynchronous Rethnet runtime.
#[derive(Debug)]
pub struct Rethnet<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    blockchain: Arc<AsyncBlockchain<BE>>,
    state: Arc<AsyncState<SE>>,
    cfg: CfgEnv,
}

impl<BE, SE> Rethnet<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    /// Constructs a new [`Rethnet`] instance.
    pub fn new(blockchain: Arc<AsyncBlockchain<BE>>, db: Arc<AsyncState<SE>>, cfg: CfgEnv) -> Self {
        Self {
            blockchain,
            state: db,
            cfg,
        }
    }

    /// Runs a transaction without committing the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn AsyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError<BE, SE>> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        run_transaction(
            self.state.runtime(),
            self.blockchain.clone(),
            self.state.clone(),
            self.cfg.clone(),
            transaction,
            block,
            inspector,
        )
        .await
        .unwrap()
        .map_err(TransactionError::from)
    }

    /// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn AsyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError<BE, SE>> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let mut cfg = self.cfg.clone();
        cfg.disable_balance_check = true;

        run_transaction(
            self.state.runtime(),
            self.blockchain.clone(),
            self.state.clone(),
            cfg,
            transaction,
            block,
            inspector,
        )
        .await
        .unwrap()
        .map_err(TransactionError::from)
    }

    /// Runs a transaction, committing the state in the process.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        inspector: Option<Box<dyn AsyncInspector<BE, SE>>>,
    ) -> Result<(ExecutionResult, Trace), TransactionError<BE, SE>> {
        let (result, changes, trace) = self.dry_run(transaction, block, inspector).await?;

        self.state.apply(changes).await;

        Ok((result, trace))
    }
}
