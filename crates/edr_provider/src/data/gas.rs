use std::cmp;

use edr_eth::{block::Header, B256};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{StateError, StateOverrides, SyncState},
    CfgEnv, ExecutionResult, Halt, ResultAndState, TxEnv,
};

use crate::{
    data::{call, call::RunCallArgs},
    error::TransactionFailure,
    ProviderError,
};

pub(super) struct CheckGasLimitArgs<'a> {
    pub blockchain: &'a dyn SyncBlockchain<BlockchainError, StateError>,
    pub header: &'a Header,
    pub state: &'a dyn SyncState<StateError>,
    pub state_overrides: &'a StateOverrides,
    pub cfg_env: CfgEnv,
    pub tx_env: TxEnv,
    pub transaction_hash: &'a B256,
    pub gas_limit: u64,
}

/// Test if the transaction successfully executes with the given gas limit.
/// Returns true on success and return false if the transaction runs out of gas
/// or funds or reverts. Returns an error for any other halt reason.
pub(super) fn check_gas_limit(args: CheckGasLimitArgs<'_>) -> Result<bool, ProviderError> {
    let CheckGasLimitArgs {
        blockchain,
        header,
        state,
        state_overrides,
        cfg_env,
        mut tx_env,
        transaction_hash,
        gas_limit,
    } = args;

    tx_env.gas_limit = gas_limit;

    let ResultAndState { result, .. } = call::run_call(RunCallArgs {
        blockchain,
        header,
        state,
        state_overrides,
        cfg_env,
        tx_env,
        inspector: None,
    })?;

    match result {
        ExecutionResult::Success { .. } => Ok(true),
        ExecutionResult::Halt { reason, .. } => match reason {
            Halt::OutOfFund | Halt::OutOfGas(_) => Ok(false),
            _ => Err(TransactionFailure::halt(reason, *transaction_hash).into()),
        },
        ExecutionResult::Revert { .. } => Ok(false),
    }
}

pub(super) struct BinarySearchEstimationArgs<'a> {
    pub blockchain: &'a dyn SyncBlockchain<BlockchainError, StateError>,
    pub header: &'a Header,
    pub state: &'a dyn SyncState<StateError>,
    pub state_overrides: &'a StateOverrides,
    pub cfg_env: CfgEnv,
    pub tx_env: TxEnv,
    pub transaction_hash: &'a B256,
    pub lower_bound: u64,
    pub upper_bound: u64,
}

/// Search for a tight upper bound on the gas limit that will allow the
/// transaction to execute. Matches Hardhat logic, except it's iterative, not
/// recursive.
pub(super) fn binary_search_estimation(
    args: BinarySearchEstimationArgs<'_>,
) -> Result<u64, ProviderError> {
    const MAX_ITERATIONS: usize = 20;

    let BinarySearchEstimationArgs {
        blockchain,
        header,
        state,
        state_overrides,
        cfg_env,
        tx_env,
        transaction_hash,
        mut lower_bound,
        mut upper_bound,
    } = args;

    let mut i = 0;

    while upper_bound - lower_bound > min_difference(lower_bound) && i < MAX_ITERATIONS {
        let mut mid = lower_bound + (upper_bound - lower_bound) / 2;
        if i == 0 {
            // Start close to the lower bound as it's assumed to be derived from the gas
            // used by the transaction.
            let initial_mid = 3 * lower_bound;
            mid = cmp::min(mid, initial_mid);
        }

        let success = check_gas_limit(CheckGasLimitArgs {
            blockchain,
            header,
            state,
            state_overrides,
            cfg_env: cfg_env.clone(),
            tx_env: tx_env.clone(),
            transaction_hash,
            gas_limit: mid,
        })?;

        if success {
            upper_bound = mid;
        } else {
            lower_bound = mid + 1;
        }

        i += 1;
    }

    Ok(upper_bound)
}

// Matches Hardhat
#[inline]
fn min_difference(lower_bound: u64) -> u64 {
    if lower_bound >= 4_000_000 {
        50_000
    } else if lower_bound >= 1_000_000 {
        10_000
    } else if lower_bound >= 100_000 {
        1_000
    } else if lower_bound >= 50_000 {
        500
    } else if lower_bound >= 30_000 {
        300
    } else {
        200
    }
}
