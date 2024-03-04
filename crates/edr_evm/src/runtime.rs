use std::fmt::Debug;

use revm::{
    db::{BlockHashRef, DatabaseComponents, StateRef, WrapDatabaseRef},
    primitives::{
        BlockEnv, CfgEnvWithHandlerCfg, EnvWithHandlerCfg, ExecutionResult, ResultAndState, SpecId,
        TxEnv,
    },
    DatabaseCommit, Evm,
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
pub fn dry_run<'blockchain, 'evm, 'overrides, 'state, DebugDataT, BlockchainErrorT, StateErrorT>(
    blockchain: &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &'state dyn SyncState<StateErrorT>,
    state_overrides: &'overrides StateOverrides,
    cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<
            WrapDatabaseRef<
                DatabaseComponents<
                    StateRefOverrider<'overrides, &'evm dyn SyncState<StateErrorT>>,
                    &'evm dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
                >,
            >,
            DebugDataT,
        >,
    >,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    'blockchain: 'evm,
    'state: 'evm,
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    validate_configuration(&cfg, &block, &transaction)?;

    let state_overrider = StateRefOverrider::new(state_overrides, state);

    let env = EnvWithHandlerCfg::new_with_cfg_env(cfg, block, transaction);
    let result = {
        let evm_builder = Evm::builder().with_ref_db(DatabaseComponents {
            state: state_overrider,
            block_hash: blockchain,
        });

        if let Some(debug_context) = debug_context {
            let mut evm = evm_builder
                .with_external_context(debug_context.data)
                .with_env_with_handler_cfg(env)
                .append_handler_register(debug_context.register_handles_fn)
                .build();

            evm.transact()
        } else {
            let mut evm = evm_builder.with_env_with_handler_cfg(env).build();
            evm.transact()
        }
    };

    result.map_err(TransactionError::from)
}

/// Runs a transaction without committing the state, while disabling balance
/// checks and creating accounts for new addresses.
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn guaranteed_dry_run<
    'blockchain,
    'evm,
    'overrides,
    'state,
    DebugDataT,
    BlockchainErrorT,
    StateErrorT,
>(
    blockchain: &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &'state dyn SyncState<StateErrorT>,
    state_overrides: &'overrides StateOverrides,
    mut cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<
            WrapDatabaseRef<
                DatabaseComponents<
                    StateRefOverrider<'overrides, &'evm dyn SyncState<StateErrorT>>,
                    &'evm dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
                >,
            >,
            DebugDataT,
        >,
    >,
) -> Result<ResultAndState, TransactionError<BlockchainErrorT, StateErrorT>>
where
    'blockchain: 'evm,
    'state: 'evm,
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
pub fn run<BlockchainT, DebugDataT, StateT>(
    blockchain: BlockchainT,
    state: StateT,
    cfg: CfgEnvWithHandlerCfg,
    transaction: TxEnv,
    block: BlockEnv,
    debug_context: Option<
        DebugContext<WrapDatabaseRef<DatabaseComponents<StateT, BlockchainT>>, DebugDataT>,
    >,
) -> Result<ExecutionResult, TransactionError<BlockchainT::Error, StateT::Error>>
where
    BlockchainT: BlockHashRef,
    BlockchainT::Error: Debug + Send,
    StateT: StateRef + DatabaseCommit,
    StateT::Error: Debug + Send,
{
    validate_configuration(&cfg, &block, &transaction)?;

    let env = EnvWithHandlerCfg::new_with_cfg_env(cfg, block, transaction);
    let evm_builder = Evm::builder().with_ref_db(DatabaseComponents {
        state,
        block_hash: blockchain,
    });

    let result = if let Some(debug_context) = debug_context {
        let mut evm = evm_builder
            .with_external_context(debug_context.data)
            .with_env_with_handler_cfg(env)
            .append_handler_register(debug_context.register_handles_fn)
            .build();

        evm.transact_commit()
    } else {
        let mut evm = evm_builder.with_env_with_handler_cfg(env).build();

        evm.transact_commit()
    }?;

    Ok(result)
}

fn validate_configuration<BlockchainErrorT, StateErrorT>(
    cfg: &CfgEnvWithHandlerCfg,
    block: &BlockEnv,
    transaction: &TxEnv,
) -> Result<(), TransactionError<BlockchainErrorT, StateErrorT>> {
    if cfg.handler_cfg.spec_id > SpecId::MERGE && block.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao);
    }

    if transaction.gas_priority_fee.is_some() && cfg.handler_cfg.spec_id < SpecId::LONDON {
        return Err(TransactionError::Eip1559Unsupported);
    }

    Ok(())
}
