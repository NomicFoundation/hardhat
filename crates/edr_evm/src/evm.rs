use std::fmt::Debug;

use revm::{
    db::{DatabaseComponentError, DatabaseComponents, StateRef},
    primitives::{BlockEnv, CfgEnv, EVMError, ResultAndState, TxEnv},
    Inspector,
};

use crate::{blockchain::SyncBlockchain, SyncDatabase};

/// Super trait for an inspector of an `AsyncDatabase` that's debuggable.
pub trait SyncInspector<BE, SE>: Inspector<DatabaseComponentError<SE, BE>> + Debug + Send
where
    BE: Debug + Send,
    SE: Debug + Send,
{
}

impl<I, BE, SE> SyncInspector<BE, SE> for I
where
    I: Inspector<DatabaseComponentError<SE, BE>> + Debug + Send,
    BE: Debug + Send,
    SE: Debug + Send,
{
}

/// Creates an evm from the provided database, config, transaction, and block.
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn build_evm<'b, 's, BlockchainErrorT, StateErrorT>(
    blockchain: &'b dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &'s dyn StateRef<Error = StateErrorT>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<SyncDatabase<'b, 's, BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
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
pub fn run_transaction<'evm, 'inspector, BE, SE>(
    evm: revm::EVM<SyncDatabase<'evm, 'evm, BE, SE>>,
    inspector: Option<&mut dyn SyncInspector<BE, SE>>,
) -> Result<ResultAndState, EVMError<DatabaseComponentError<SE, BE>>>
where
    BE: Debug + Send,
    SE: Debug + Send,
    'evm: 'inspector,
{
    if let Some(inspector) = inspector {
        evm.inspect_ref(inspector)
    } else {
        evm.transact_ref()
    }
}
