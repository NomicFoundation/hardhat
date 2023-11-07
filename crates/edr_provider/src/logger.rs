use edr_eth::{
    transaction::{SignedTransaction, TransactionRequest},
    B256, U256,
};
use edr_evm::{trace::Trace, Bytecode, MineBlockResult, SyncBlock};

use crate::ProviderError;

/// A logger that handles all the logging of the RPC server.
///
/// The API follows this convention:
/// - `log_*` methods accumulate logs.
/// - `print_*` methods immediately print to stdout.
pub struct Logger {
    _is_enabled: bool,
}

impl Logger {
    /// Constructs a new instance.
    pub fn new(is_enabled: bool) -> Self {
        Self {
            _is_enabled: is_enabled,
        }
    }

    /// Logs the result of auto-mining a block.
    pub fn log_block_from_automine<BlockchainErrorT>(
        &self,
        _result: MineBlockResult<BlockchainErrorT>,
        _contracts: Vec<Bytecode>,
        _transaction_hash_to_highlight: &B256,
    ) {
    }

    /// Logs the result of mining a block.
    pub fn log_mined_block<BlockchainErrorT>(
        &self,
        _result: MineBlockResult<BlockchainErrorT>,
        _contracts: Vec<Bytecode>,
    ) {
    }

    /// Logs the result of interval mining a block.
    pub fn log_interval_mined_block<BlockchainErrorT>(
        &self,
        _result: &MineBlockResult<BlockchainErrorT>,
        _contracts: Vec<Bytecode>,
    ) {
    }

    /// Logs an empty hardhat-mined block.
    pub fn log_empty_hardhat_mined_block(
        &self,
        _block_number: u64,
        _base_fee_per_gas: Option<u64>,
    ) {
    }

    /// Logs a single transaction.
    pub fn log_single_transaction<BlockchainErrorT>(
        &self,
        _block: &dyn SyncBlock<Error = BlockchainErrorT>,
        _transaction: &SignedTransaction,
        _code: &Bytecode,
        _gas_used: u64,
        _trace: &Trace,
    ) {
    }

    /// Logs the currently sent transaction.
    pub fn log_currently_sent_transaction<BlockchainErrorT>(
        &self,
        _block: &dyn SyncBlock<Error = BlockchainErrorT>,
        _transaction: &SignedTransaction,
        _code: &Bytecode,
        _gas_used: u64,
        _trace: &Trace,
    ) {
    }

    /// Logs the trace of an `eth_estimateGas` call.
    pub fn log_estimate_gas_trace(
        &self,
        _transaction: &TransactionRequest,
        _code: &Bytecode,
        _gas_used: u64,
        _trace: &Trace,
        _console_log_messages: Vec<String>,
    ) {
    }

    /// Logs the trace of an `eth_call` call.
    pub fn log_call_trace(
        &self,
        _transaction: &TransactionRequest,
        _code: &Bytecode,
        _trace: &Trace,
        _console_log_messages: Vec<String>,
        _error: Option<ProviderError>,
    ) {
    }

    /// Logs a warning about multiple transactions being mined.
    pub fn log_multiple_transactions_warning(&self) {}

    /// Logs a warning about multiple blocks being mined.
    pub fn log_multiple_blocks_warning(&self) {}

    /// Logs an empty line.
    pub fn log_empty_line(&self) {}

    /// Print an error message.
    pub fn print_error_message(&self, _message: &str) {}

    /// Prints a warning message.
    pub fn print_warning_message(&self, _message: &str) {}

    /// Prints a failed method.
    pub fn print_failed_method(&self, _method: &str) {}

    /// Prints a method.
    pub fn print_method(&self, _method: &str) {}

    /// Prints all accumulated logs.
    pub fn print_logs(&self) {}

    /// Prints the block number of an interval-mined block.
    pub fn print_interval_mined_block_number(
        &self,
        _block_number: u64,
        _is_empty: bool,
        _base_fee_per_gas: Option<U256>,
    ) {
    }

    /// Prints an empty line.
    pub fn print_empty_line(&self) {}
}
