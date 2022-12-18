use std::fmt::Debug;

use revm::{BlockEnv, CfgEnv, TxEnv};

use crate::{
    blockchain::{AsyncBlockchain, SyncBlockchain},
    db::{AsyncDatabase, AsyncDatabaseWrapper, SyncDatabase},
};

/// Creates an evm from the provided database, config, transaction, and block.
#[allow(clippy::type_complexity)]
pub fn build_evm<'b, 'd, E>(
    blockchain: &'b AsyncBlockchain<Box<dyn SyncBlockchain<E>>, E>,
    db: &'d AsyncDatabase<Box<dyn SyncDatabase<E>>, E>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<
    AsyncDatabaseWrapper<'d, Box<dyn SyncDatabase<E>>, E>,
    &'b AsyncBlockchain<Box<dyn SyncBlockchain<E>>, E>,
>
where
    E: Debug + Send + 'static,
{
    let mut evm = revm::EVM::new();
    evm.set_blockchain(blockchain);
    evm.database(AsyncDatabaseWrapper::new(db));
    evm.env.cfg = cfg;
    evm.env.block = block;
    evm.env.tx = transaction;

    evm
}
