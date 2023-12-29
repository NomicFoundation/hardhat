use std::fmt::Debug;

use revm::{
    db::{DatabaseComponents, StateRef},
    primitives::{BlockEnv, CfgEnv, ExecutionResult, ResultAndState, SpecId, TxEnv},
};

use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::{StateOverrides, StateRefOverrider, SyncState},
    transaction::TransactionError,
};

/// Asynchronous implementation of the Database super-trait
pub type SyncDatabase<'blockchain, 'state, BlockchainErrorT, StateErrorT> = DatabaseComponents<
    &'state dyn StateRef<Error = StateErrorT>,
    &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
>;

/// Runs a transaction without committing the state.
#[cfg_attr(feature = "tracing", tracing::instrument(skip(inspector)))]
pub fn dry_run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    state_overrides: &StateOverrides,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    if cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao);
    }

    if transaction.gas_priority_fee.is_some() && cfg.spec_id < SpecId::LONDON {
        return Err(TransactionError::Eip1559Unsupported);
    }

    let state_overrider = StateRefOverrider::new(state_overrides, &state);

    let evm = build_evm(blockchain, &state_overrider, cfg, transaction, block);

    run_transaction(evm, inspector).map_err(TransactionError::from)
}

/// Runs a transaction without committing the state, while disabling balance
/// checks and creating accounts for new addresses.
#[cfg_attr(feature = "tracing", tracing::instrument(skip(inspector)))]
pub fn guaranteed_dry_run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    state_overrides: &StateOverrides,
    mut cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    cfg.disable_balance_check = true;
    cfg.disable_block_gas_limit = true;
    dry_run(
        blockchain,
        state,
        state_overrides,
        cfg,
        transaction,
        block,
        inspector,
    )
}

/// Runs a transaction, committing the state in the process.
#[cfg_attr(feature = "tracing", tracing::instrument(skip(inspector)))]
pub fn run<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &mut dyn SyncState<StateErrorT>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
    inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
) -> Result<ExecutionResult, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    let ResultAndState {
        result,
        state: changes,
    } = dry_run(
        blockchain,
        state,
        &StateOverrides::default(),
        cfg,
        transaction,
        block,
        inspector,
    )?;

    state.commit(changes);

    Ok(result)
}
