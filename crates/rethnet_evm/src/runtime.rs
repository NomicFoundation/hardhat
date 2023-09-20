use std::fmt::Debug;

use revm::{
    db::DatabaseComponents,
    primitives::{BlockEnv, CfgEnv, ExecutionResult, ResultAndState, SpecId, TxEnv},
};

use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::SyncState,
    transaction::TransactionError,
};

/// Asynchronous implementation of the Database super-trait
pub type SyncDatabase<'blockchain, 'state, BlockchainErrorT, StateErrorT> = DatabaseComponents<
    &'state dyn SyncState<StateErrorT>,
    &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
>;

/// Runs a transaction without committing the state.
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub async fn dry_run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send + 'static,
    StateErrorT: Debug + Send + 'static,
{
    if cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao);
    }

    if transaction.gas_priority_fee.is_some()
        && blockchain.spec_at_block_number(&block.number).await? < SpecId::LONDON
    {
        return Err(TransactionError::Eip1559Unsupported);
    }

    let evm = build_evm(blockchain, state, cfg, transaction, block);

    run_transaction(evm, inspector).map_err(TransactionError::from)
}

/// Runs a transaction without committing the state, while disabling balance checks and creating accounts for new addresses.
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub async fn guaranteed_dry_run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    mut cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send + 'static,
    StateErrorT: Debug + Send + 'static,
{
    cfg.disable_balance_check = true;
    dry_run(blockchain, state, cfg, transaction, block, inspector).await
}

/// Runs a transaction, committing the state in the process.
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub async fn run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &mut dyn SyncState<StateErrorT>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ExecutionResult, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send + 'static,
    StateErrorT: Debug + Send + 'static,
{
    let ResultAndState {
        result,
        state: changes,
    } = dry_run(blockchain, state, cfg, transaction, block, inspector).await?;

    state.commit(changes);

    Ok(result)
}
