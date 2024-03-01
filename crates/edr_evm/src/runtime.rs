use std::fmt::Debug;

use revm::{
    db::{DatabaseComponents, StateRef},
    primitives::{
        BlockEnv, CfgEnvWithHandlerCfg, EnvWithHandlerCfg, ExecutionResult, ResultAndState, SpecId,
        TxEnv,
    },
    Evm,
};

use crate::{
    blockchain::SyncBlockchain,
    debug::DebugContext,
    state::{StateOverrides, StateRefOverrider, SyncState},
    transaction::TransactionError,
};

/// Asynchronous implementation of the Database super-trait
pub type SyncDatabase<'blockchain, 'state, BlockchainErrorT, StateErrorT> = DatabaseComponents<
    &'state dyn StateRef<Error = StateErrorT>,
    &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
>;

/// Runs a transaction without committing the state.
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn dry_run<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    state_overrides: &StateOverrides,
    cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>,
    >,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    if cfg.handler_cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao);
    }

    if transaction.gas_priority_fee.is_some() && cfg.handler_cfg.spec_id < SpecId::LONDON {
        return Err(TransactionError::Eip1559Unsupported);
    }

    let state_overrider = StateRefOverrider::new(state_overrides, &state);

    let evm_builder = Evm::builder().with_ref_db(DatabaseComponents {
        state,
        block_hash: blockchain,
    });

    let env = EnvWithHandlerCfg::new_with_cfg_env(cfg, block, transaction);
    let result = if let Some(debug_context) = debug_context {
        let mut evm = evm_builder
            .with_external_context(debug_context.data)
            .with_env_with_handler_cfg(env)
            .append_handler_register(debug_context.handle_registers)
            .build();

        evm.transact()
    } else {
        let mut evm = evm_builder.with_env_with_handler_cfg(env).build();
        evm.transact()
    };

    result.map_err(TransactionError::from)
}

/// Runs a transaction without committing the state, while disabling balance
/// checks and creating accounts for new addresses.
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn guaranteed_dry_run<
    'blockchain,
    'register,
    'state,
    DebugDataT,
    BlockchainErrorT,
    StateErrorT,
>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &dyn SyncState<StateErrorT>,
    state_overrides: &StateOverrides,
    mut cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>,
    >,
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
        debug_context,
    )
}

/// Runs a transaction, committing the state in the process.
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn run<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &mut dyn SyncState<StateErrorT>,
    cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>,
    >,
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
        debug_context,
    )?;

    state.commit(changes);

    Ok(result)
}
