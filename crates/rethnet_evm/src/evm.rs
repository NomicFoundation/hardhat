use std::{fmt::Debug, sync::Arc};

use revm::{
    db::{DatabaseComponentError, DatabaseComponents},
    primitives::{BlockEnv, CfgEnv, EVMError, ExecutionResult, ResultAndState, State, TxEnv},
    Inspector,
};
use tokio::{runtime::Runtime, task::JoinHandle};

use crate::{
    blockchain::AsyncBlockchain,
    inspector::DualInspector,
    runtime::AsyncDatabase,
    state::AsyncState,
    trace::{Trace, TraceCollector},
};

/// Creates an evm from the provided database, config, transaction, and block.
#[allow(clippy::type_complexity)]
fn build_evm<BE, SE>(
    blockchain: Arc<AsyncBlockchain<BE>>,
    state: Arc<AsyncState<SE>>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<AsyncDatabase<BE, SE>>
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
    inspector: Option<Box<dyn Inspector<AsyncDatabase<BE, SE>> + Send>>,
) -> JoinHandle<Result<(ExecutionResult, State, Trace), EVMError<DatabaseComponentError<SE, BE>>>>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    runtime.spawn(async move {
        let mut evm = build_evm(blockchain, state, cfg, transaction, block);

        let (result, state, tracer) = if let Some(inspector) = inspector {
            let mut inspector = DualInspector::new(TraceCollector::default(), inspector);

            let ResultAndState { result, state } = evm.inspect(&mut inspector)?;
            (result, state, inspector.into_parts().0)
        } else {
            let mut inspector = TraceCollector::default();
            let ResultAndState { result, state } = evm.inspect(&mut inspector)?;

            (result, state, inspector)
        };

        Ok((result, state, tracer.into_trace()))
    })
}
