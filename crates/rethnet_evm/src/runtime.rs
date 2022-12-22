use std::{fmt::Debug, sync::Arc};

use revm::{BlockEnv, CfgEnv, ExecutionResult, SpecId, TxEnv};

use crate::{
    blockchain::{AsyncBlockchain, SyncBlockchain},
    db::{AsyncDatabase, SyncDatabase},
    evm::build_evm,
    inspector::RethnetInspector,
    trace::Trace,
    transaction::TransactionError,
    State,
};

/// The asynchronous Rethnet runtime.
pub struct Rethnet<E>
where
    E: Debug + Send + 'static,
{
    blockchain: Arc<AsyncBlockchain<Box<dyn SyncBlockchain<E>>, E>>,
    db: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>,
    cfg: CfgEnv,
}

impl<E> Rethnet<E>
where
    E: Debug + Send + 'static,
{
    /// Constructs a new [`Rethnet`] instance.
    pub fn new(
        blockchain: Arc<AsyncBlockchain<Box<dyn SyncBlockchain<E>>, E>>,
        db: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>,
        cfg: CfgEnv,
    ) -> Self {
        Self {
            blockchain,
            db,
            cfg,
        }
    }

    /// Runs a transaction without committing the state.
    pub async fn dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let blockchain = self.blockchain.clone();
        let db = self.db.clone();
        let cfg = self.cfg.clone();

        Ok(self
            .db
            .runtime()
            .spawn(async move {
                let mut evm = build_evm(&blockchain, &db, cfg, transaction, block);

                let mut inspector = RethnetInspector::default();
                let (result, state) = evm.inspect(&mut inspector);
                (result, state, inspector.into_trace())
            })
            .await
            .unwrap())
    }

    /// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
    pub async fn guaranteed_dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> Result<(ExecutionResult, State, Trace), TransactionError> {
        if self.cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
            return Err(TransactionError::MissingPrevrandao);
        }

        let blockchain = self.blockchain.clone();
        let db = self.db.clone();

        let mut cfg = self.cfg.clone();
        cfg.disable_balance_check = true;

        Ok(self
            .db
            .runtime()
            .spawn(async move {
                let mut evm = build_evm(&blockchain, &db, cfg, transaction, block);

                let mut inspector = RethnetInspector::default();
                let (result, state) = evm.inspect(&mut inspector);
                (result, state, inspector.into_trace())
            })
            .await
            .unwrap())
    }

    /// Runs a transaction, committing the state in the process.
    pub async fn run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> Result<(ExecutionResult, Trace), TransactionError> {
        let (result, changes, trace) = self.dry_run(transaction, block).await?;

        self.db.apply(changes).await;

        Ok((result, trace))
    }
}
