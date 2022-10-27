use std::fmt::Debug;

use revm::{BlockEnv, CfgEnv, TxEnv};

use crate::db::{AsyncDatabase, AsyncDatabaseWrapper, SyncDatabase};

/// Creates an evm from the provided database, config, transaction, and block.
pub fn build_evm<E>(
    db: &AsyncDatabase<Box<dyn SyncDatabase<E>>, E>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<AsyncDatabaseWrapper<'_, Box<dyn SyncDatabase<E>>, E>>
where
    E: Debug + Send + 'static,
{
    let mut evm = revm::EVM::new();
    evm.database(AsyncDatabaseWrapper::new(db));
    evm.env.cfg = cfg;
    evm.env.block = block;
    evm.env.tx = transaction;

    evm
}
