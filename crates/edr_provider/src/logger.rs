// TODO: Remove once stubs have been implemented.
#![allow(dead_code, clippy::unused_self)]

use dyn_clone::DynClone;
use edr_evm::ExecutableTransaction;

use crate::{
    data::{CallResult, EstimateGasFailure},
    debug_mine::DebugMineBlockResult,
    ProviderError,
};

pub trait Logger {
    type BlockchainError;

    /// Whether the logger is enabled.
    fn is_enabled(&self) -> bool;

    /// Sets whether the logger is enabled.
    fn set_is_enabled(&mut self, is_enabled: bool);

    fn log_call(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &ExecutableTransaction,
        result: &CallResult,
    ) {
        let _spec_id = spec_id;
        let _transaction = transaction;
        let _result = result;
    }

    fn log_estimate_gas_failure(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &ExecutableTransaction,
        result: &EstimateGasFailure,
    ) {
        let _spec_id = spec_id;
        let _transaction = transaction;
        let _failure = result;
    }

    fn log_interval_mined(
        &mut self,
        spec_id: edr_eth::SpecId,
        result: &DebugMineBlockResult<Self::BlockchainError>,
    ) {
        let _spec_id = spec_id;
        let _result = result;
    }

    fn log_mined_block(
        &mut self,
        spec_id: edr_eth::SpecId,
        results: Vec<DebugMineBlockResult<Self::BlockchainError>>,
    ) {
        let _spec_id = spec_id;
        let _results = results;
    }

    fn log_send_transaction(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &ExecutableTransaction,
        mining_results: Vec<DebugMineBlockResult<Self::BlockchainError>>,
    ) {
        let _spec_id = spec_id;
        let _transaction = transaction;
        let _mining_results = mining_results;
    }

    /// Prints the collected logs, which correspond to the method with the
    /// provided name.
    ///
    /// Adds an empty line at the end.
    fn print_method_logs(&mut self, method: &str, error: Option<&ProviderError>);
}

pub trait SyncLogger: Logger + DynClone + Send + Sync {}

impl<T> SyncLogger for T where T: Logger + DynClone + Send + Sync {}

impl<BlockchainErrorT> Clone for Box<dyn SyncLogger<BlockchainError = BlockchainErrorT>> {
    fn clone(&self) -> Self {
        dyn_clone::clone_box(&**self)
    }
}
