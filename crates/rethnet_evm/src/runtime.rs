use std::{fmt::Debug, sync::Arc};

use revm::{AccountInfo, BlockEnv, CfgEnv, ExecutionResult, TxEnv};

use crate::{
    db::{AsyncDatabase, SyncDatabase},
    evm::build_evm,
    inspector::RethnetInspector,
    State,
};

/// The asynchronous Rethnet runtime.
pub struct Rethnet<E>
where
    E: Debug + Send + 'static,
{
    db: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>,
    cfg: CfgEnv,
}

impl<E> Rethnet<E>
where
    E: Debug + Send + 'static,
{
    /// Constructs a new [`Rethnet`] instance.
    pub fn new(db: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>, cfg: CfgEnv) -> Self {
        Self { db, cfg }
    }

    /// Runs a transaction without committing the state.
    pub async fn dry_run(
        &mut self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> (ExecutionResult, State) {
        let db = self.db.clone();
        let cfg = self.cfg.clone();

        self.db
            .runtime()
            .spawn(async move {
                let mut evm = build_evm(&db, cfg, transaction, block);
                evm.inspect(RethnetInspector::default())
            })
            .await
            .unwrap()
    }

    /// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
    pub async fn guaranteed_dry_run(
        &mut self,
        transaction: TxEnv,
        block: BlockEnv,
    ) -> Result<(ExecutionResult, State), E> {
        if let Ok(None) = self.db.account_by_address(transaction.caller).await {
            self.db
                .insert_account(transaction.caller, AccountInfo::default())
                .await?;
        }

        let mut old_disable_balance_check = true;
        std::mem::swap(
            &mut old_disable_balance_check,
            &mut self.cfg.disable_balance_check,
        );

        let db = self.db.clone();
        let cfg = self.cfg.clone();

        let result = self
            .db
            .runtime()
            .spawn(async move {
                let mut evm = build_evm(&db, cfg, transaction, block);
                evm.inspect(RethnetInspector::default())
            })
            .await
            .unwrap();

        std::mem::swap(
            &mut old_disable_balance_check,
            &mut self.cfg.disable_balance_check,
        );

        Ok(result)
    }

    /// Runs a transaction, committing the state in the process.
    pub async fn run(&mut self, transaction: TxEnv, block: BlockEnv) -> ExecutionResult {
        let (result, changes) = self.dry_run(transaction, block).await;

        self.db.apply(changes).await;

        result
    }
}
