// TODO: Remove once stubs have been implemented.
#![allow(dead_code, clippy::unused_self)]

use dyn_clone::DynClone;
use edr_evm::{trace::Trace, ExecutableTransaction};

use crate::{
    data::{CallResult, EstimateGasFailure},
    debug::DebugMineBlockResult,
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

    /// Returns the logs of the previous request.
    fn previous_request_logs(&self) -> Vec<String>;

    /// Returns the raw traces of the previous request, if any.
    fn previous_request_raw_traces(&self) -> Option<Vec<Trace>>;

    /// Prints the collected logs, which correspond to the method with the
    /// provided name.
    ///
    /// Adds an empty line at the end.
    fn print_method_logs(&mut self, method: &str, error: Option<&ProviderError>);

    // /// Whethers the logger is printing logs to the CLI.
    // fn is_printing(&self) -> bool;

    // /// Logs the result of auto-mining a block.
    // fn log_block_from_automine(
    //     &mut self,
    //     result: MineBlockResult<Self::BlockchainError>,
    //     contracts: Vec<Bytecode>,
    //     transaction_hash_to_highlight: &B256,
    // );

    // /// Logs the result of mining a block.
    // fn log_mined_block(
    //     &mut self,
    //     result: MineBlockResult<Self::BlockchainError>,
    //     contracts: Vec<Bytecode>,
    // );

    // /// Logs an empty hardhat-mined block.
    // fn log_empty_hardhat_mined_block(&mut self, block_number: u64,
    // base_fee_per_gas: Option<u64>);

    // /// Logs a single transaction.
    // fn log_single_transaction(
    //     &mut self,
    //     block: &dyn SyncBlock<Error = Self::BlockchainError>,
    //     transaction: &SignedTransaction,
    //     code: &Bytecode,
    //     gas_used: u64,
    //     trace: &Trace,
    // );

    // /// Logs the currently sent transaction.
    // fn log_currently_sent_transaction(
    //     &mut self,
    //     block: &dyn SyncBlock<Error = Self::BlockchainError>,
    //     transaction: &SignedTransaction,
    //     code: &Bytecode,
    //     gas_used: u64,
    //     trace: &Trace,
    // );

    // /// Logs the trace of an `eth_estimateGas` call.
    // fn log_estimate_gas_trace(
    //     &mut self,
    //     transaction: &TransactionRequest,
    //     code: &Bytecode,
    //     gas_used: u64,
    //     trace: &Trace,
    //     console_log_messages: Vec<String>,
    // );

    // /// Logs the trace of an `eth_call` call.
    // fn log_call_trace(
    //     &mut self,
    //     transaction: &TransactionRequest,
    //     code: &Bytecode,
    //     trace: &Trace,
    //     console_log_messages: Vec<String>,
    //     error: Option<ProviderError>,
    // );

    // /// Logs an empty line.
    // fn log_empty_line(&self);

    // /// Print an error message.
    // fn print_error_message(&self, message: &str);

    // /// Prints a warning message.
    // fn print_warning_message(&self, message: &str);

    // /// Prints a failed method.
    // fn print_failed_method(&self, method: &str);

    // /// Prints a method.
    // fn print_method(&self, method: &str);

    // /// Prints all accumulated logs. Returns whether there were any logs.
    // fn print_logs(&self) -> bool;

    // /// Prints an empty line.
    // fn print_empty_line(&self);
}

pub trait SyncLogger: Logger + DynClone + Send + Sync {}

impl<T> SyncLogger for T where T: Logger + DynClone + Send + Sync {}

impl<BlockchainErrorT> Clone for Box<dyn SyncLogger<BlockchainError = BlockchainErrorT>> {
    fn clone(&self) -> Self {
        dyn_clone::clone_box(&**self)
    }
}
