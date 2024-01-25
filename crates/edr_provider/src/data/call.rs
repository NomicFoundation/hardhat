use core::fmt::Debug;

use edr_eth::{
    block::{BlobGas, Header},
    Bytes, SpecId, B256, U256,
};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    guaranteed_dry_run,
    state::{StateError, StateOverrides, SyncState},
    BlobExcessGasAndPrice, BlockEnv, CfgEnv, ExecutionResult, ResultAndState, SyncInspector, TxEnv,
};

use crate::{error::TransactionFailure, ProviderError};

pub(super) struct RunCallArgs<'a> {
    pub blockchain: &'a dyn SyncBlockchain<BlockchainError, StateError>,
    pub header: &'a Header,
    pub state: &'a dyn SyncState<StateError>,
    pub state_overrides: &'a StateOverrides,
    pub cfg_env: CfgEnv,
    pub tx_env: TxEnv,
    pub inspector: Option<&'a mut dyn SyncInspector<BlockchainError, StateError>>,
}

/// Execute a transaction as a call. Returns the gas used and the output.
pub(super) fn run_call<LoggerErrorT: Debug>(
    args: RunCallArgs<'_>,
) -> Result<ResultAndState, ProviderError<LoggerErrorT>> {
    let RunCallArgs {
        blockchain,
        header,
        state,
        state_overrides,
        cfg_env,
        tx_env,
        inspector,
    } = args;

    let block = BlockEnv {
        number: U256::from(header.number),
        coinbase: header.beneficiary,
        timestamp: U256::from(header.timestamp),
        gas_limit: U256::from(header.gas_limit),
        basefee: U256::ZERO,
        difficulty: header.difficulty,
        prevrandao: if cfg_env.spec_id >= SpecId::MERGE {
            Some(header.mix_hash)
        } else {
            None
        },
        blob_excess_gas_and_price: header
            .blob_gas
            .as_ref()
            .map(|BlobGas { excess_gas, .. }| BlobExcessGasAndPrice::new(*excess_gas)),
    };

    guaranteed_dry_run(
        blockchain,
        state,
        state_overrides,
        cfg_env,
        tx_env,
        block,
        inspector,
    )
    .map_err(ProviderError::RunTransaction)
}

/// Execute a transaction as a call. Returns the gas used and the output.
pub(super) fn run_call_and_handle_errors<LoggerErrorT: Debug>(
    run_call_args: RunCallArgs<'_>,
    transaction_hash: &B256,
) -> Result<Result<(u64, Bytes), TransactionFailure>, ProviderError<LoggerErrorT>> {
    let result = run_call(run_call_args)?;

    let execution_result = match result.result {
        ExecutionResult::Success {
            gas_used, output, ..
        } => Ok((gas_used, output.into_data())),
        ExecutionResult::Revert { output, .. } => {
            Err(TransactionFailure::revert(output, *transaction_hash))
        }
        ExecutionResult::Halt { reason, .. } => {
            Err(TransactionFailure::halt(reason, *transaction_hash))
        }
    };

    Ok(execution_result)
}
