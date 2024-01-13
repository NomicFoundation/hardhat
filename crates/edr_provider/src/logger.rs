// TODO: Remove once stubs have been implemented.
#![allow(dead_code, clippy::unused_self)]

use std::marker::PhantomData;

use dyn_clone::DynClone;
use edr_eth::{
    transaction::{SignedTransaction, TransactionRequest},
    B256, U256,
};
use edr_evm::{trace::Trace, Bytecode, MineBlockResult, PendingTransaction, SyncBlock};

use crate::ProviderError;

pub trait Logger {
    type BlockchainError;

    fn on_block_mined(&mut self, result: &MineBlockResult<Self::BlockchainError>);

    fn on_send_transaction(&mut self, transaction: &PendingTransaction);

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

    // /// Logs the result of interval mining a block.
    // fn log_interval_mined_block(
    //     &mut self,
    //     result: &MineBlockResult<Self::BlockchainError>,
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

    // /// Prints the block number of an interval-mined block.
    // fn print_interval_mined_block_number(
    //     &self,
    //     block_number: u64,
    //     is_empty: bool,
    //     base_fee_per_gas: Option<U256>,
    // );

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

pub struct NoopLogger<BlockchainErrorT> {
    is_enabled: bool,
    _blockchain_error: PhantomData<BlockchainErrorT>,
}

impl<BlockchainErrorT> NoopLogger<BlockchainErrorT> {
    /// Constructs a new `NoopLogger`.
    pub fn new(is_enabled: bool) -> Self {
        Self {
            is_enabled,
            _blockchain_error: PhantomData,
        }
    }
}

impl<BlockchainErrorT> Clone for NoopLogger<BlockchainErrorT> {
    fn clone(&self) -> Self {
        Self {
            is_enabled: self.is_enabled,
            _blockchain_error: PhantomData,
        }
    }
}

impl<BlockchainErrorT> Logger for NoopLogger<BlockchainErrorT> {
    type BlockchainError = BlockchainErrorT;

    fn on_block_mined(&mut self, result: &MineBlockResult<Self::BlockchainError>) {}

    fn on_send_transaction(&mut self, transaction: &PendingTransaction) {}
}
