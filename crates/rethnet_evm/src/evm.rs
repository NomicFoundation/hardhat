use std::{fmt::Debug, sync::Arc};

use revm::{
    db::{DatabaseComponentError, DatabaseComponents},
    BlockEnv, CfgEnv, EVMError, ExecutionResult, ResultAndState, State, TxEnv,
};
use tokio::{runtime::Runtime, task::JoinHandle};

use crate::{
    blockchain::AsyncBlockchain, db::AsyncState, inspector::RethnetInspector, trace::Trace,
};

/// Creates an evm from the provided database, config, transaction, and block.
#[allow(clippy::type_complexity)]
fn build_evm<'b, 'd, BE, SE>(
    blockchain: &'b AsyncBlockchain<BE>,
    state: &'d AsyncState<SE>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<DatabaseComponents<&'d AsyncState<SE>, &'b AsyncBlockchain<BE>>>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    let mut evm = revm::EVM::new();
    evm.database(DatabaseComponents {
        state,
        block_hash: blockchain,
    });
    evm.env.cfg = cfg;
    evm.env.block = block;
    evm.env.tx = transaction;

    evm
}

#[allow(clippy::type_complexity)]
pub fn run_transaction<BE, SE>(
    runtime: &Runtime,
    blockchain: Arc<AsyncBlockchain<BE>>,
    state: Arc<AsyncState<SE>>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> JoinHandle<Result<(ExecutionResult, State, Trace), EVMError<DatabaseComponentError<SE, BE>>>>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    runtime.spawn(async move {
        let mut evm = build_evm(&blockchain, &state, cfg, transaction, block);

        let mut inspector = RethnetInspector::default();
        let ResultAndState { result, state } = evm.inspect(&mut inspector)?;
        Ok((result, state, inspector.into_trace()))
    })
}
