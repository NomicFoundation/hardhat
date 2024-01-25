use core::fmt::Debug;

use edr_eth::{
    block::{BlobGas, Header},
    SpecId, U256,
};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    guaranteed_dry_run,
    state::{StateError, StateOverrides, SyncState},
    BlobExcessGasAndPrice, BlockEnv, CfgEnv, ExecutionResult, SyncInspector, TxEnv,
};

use crate::ProviderError;

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
) -> Result<ExecutionResult, ProviderError<LoggerErrorT>> {
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
    .map_or_else(
        |error| Err(ProviderError::RunTransaction(error)),
        |result| Ok(result.result),
    )
}
