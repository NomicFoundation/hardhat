use std::fmt::Debug;

use revm::{
    db::{DatabaseComponentError, DatabaseComponents},
    primitives::{BlockEnv, CfgEnv, EVMError, ExecutionResult, ResultAndState, State, TxEnv},
    Inspector,
};

use crate::{
    blockchain::SyncBlockchain,
    inspector::DualInspector,
    state::SyncState,
    trace::{Trace, TraceCollector},
    SyncDatabase,
};

/// Super trait for an inspector of an `AsyncDatabase` that's debuggable.
pub trait SyncInspector<BE, SE>: Inspector<DatabaseComponentError<SE, BE>> + Debug + Send
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
}

/// Creates an evm from the provided database, config, transaction, and block.
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub fn build_evm<'b, 's, BE, SE>(
    blockchain: &'b dyn SyncBlockchain<BE>,
    state: &'s dyn SyncState<SE>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<SyncDatabase<'b, 's, BE, SE>>
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

#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn run_transaction<BE, SE>(
    evm: revm::EVM<SyncDatabase<'_, '_, BE, SE>>,
    inspector: Option<Box<dyn SyncInspector<BE, SE>>>,
) -> Result<(ExecutionResult, State, Trace), EVMError<DatabaseComponentError<SE, BE>>>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    let (result, state, tracer) = if let Some(inspector) = inspector {
        let mut inspector = DualInspector::new(TraceCollector::default(), inspector);

        let ResultAndState { result, state } = evm.inspect_ref(&mut inspector)?;
        (result, state, inspector.into_parts().0)
    } else {
        let mut inspector = TraceCollector::default();
        let ResultAndState { result, state } = evm.inspect_ref(&mut inspector)?;

        (result, state, inspector)
    };

    Ok((result, state, tracer.into_trace()))
}
