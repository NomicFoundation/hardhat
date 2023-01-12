use std::{fmt::Debug, sync::Arc};

use revm::{db::DatabaseComponents, BlockEnv, CfgEnv, TxEnv};

use crate::{blockchain::AsyncBlockchain, state::AsyncState};

/// Creates an evm from the provided database, config, transaction, and block.
#[allow(clippy::type_complexity)]
pub fn build_evm<E>(
    block_hash: Arc<AsyncBlockchain<E>>,
    state: Arc<AsyncState<E>>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<DatabaseComponents<Arc<AsyncBlockchain<E>>, Arc<AsyncState<E>>>>
where
    E: Debug + Send + 'static,
{
    let mut evm = revm::EVM::new();
    evm.database(DatabaseComponents { block_hash, state });
    evm.env.cfg = cfg;
    evm.env.block = block;
    evm.env.tx = transaction;

    evm
}
