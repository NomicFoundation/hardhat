use std::{fmt::Debug, sync::Arc};

use revm::primitives::{BlockEnv, CfgEnv, ExecutionResult, SpecId, TxEnv};

use crate::{
    blockchain::AsyncBlockchain, db::AsyncState, evm::run_transaction, trace::Trace,
    transaction::TransactionError, State,
};

/// The asynchronous Rethnet runtime.
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
    pub async fn dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
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
        )
        .await
        .unwrap()
        .map_err(TransactionError::from)
    }

    /// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
    pub async fn guaranteed_dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
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
        )
        .await
        .unwrap()
        .map_err(TransactionError::from)
    }

    /// Runs a transaction, committing the state in the process.
    pub async fn run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> Result<(ExecutionResult, Trace), TransactionError<BE, SE>> {
        let (result, changes, trace) = self.dry_run(transaction, block).await?;

        self.state.apply(changes).await;

        Ok((result, trace))
    }
}
