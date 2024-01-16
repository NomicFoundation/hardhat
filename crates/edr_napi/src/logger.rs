use std::fmt::Display;

use edr_eth::{block, B256, U256};
use edr_evm::{
    blockchain::BlockchainError, trace::TraceMessage, Bytecode, PendingTransaction, SyncBlock,
};
use itertools::izip;
use napi::{Env, JsFunction, NapiRaw};

use crate::threadsafe_function::{
    ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode,
};

#[derive(Clone)]
pub struct LoggerCallbacks {
    empty_interval_mined_blocks_range_start: Option<u64>,
    indentation: usize,
    is_enabled: bool,
    log_line_fn: ThreadsafeFunction<String>,
    log_line_with_title_fn: ThreadsafeFunction<(String, String)>,
    print_line_fn: ThreadsafeFunction<String>,
    replace_last_log_line_fn: ThreadsafeFunction<String>,
    replace_last_print_line_fn: ThreadsafeFunction<String>,
}

impl LoggerCallbacks {
    pub fn new(
        env: &Env,
        log_line_callback: JsFunction,
        print_line_callback: JsFunction,
        replace_last_log_line_callback: JsFunction,
        replace_last_print_line_callback: JsFunction,
    ) -> napi::Result<Self> {
        let log_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { log_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<String>| {
                // String
                let string = ctx.env.create_string_from_std(ctx.value)?;

                ctx.callback.call(None, &[string])?;
                Ok(())
            },
        )?;
        let log_line_with_title_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { log_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<(String, String)>| {
                // [String, String]
                let mut array = ctx.env.create_array_with_length(2)?;

                ctx.env
                    .create_string_from_std(ctx.value.0)
                    .and_then(|title| array.set_element(0, title))?;

                ctx.env
                    .create_string_from_std(ctx.value.1)
                    .and_then(|message| array.set_element(1, message))?;

                ctx.callback.call(None, &[array])?;
                Ok(())
            },
        )?;
        let print_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { print_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<String>| {
                // String
                let string = ctx.env.create_string_from_std(ctx.value)?;

                ctx.callback.call(None, &[string])?;
                Ok(())
            },
        )?;
        let replace_last_log_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { replace_last_log_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<String>| {
                // String
                let string = ctx.env.create_string_from_std(ctx.value)?;

                ctx.callback.call(None, &[string])?;
                Ok(())
            },
        )?;
        let replace_last_print_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { replace_last_print_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<String>| {
                // String
                let string = ctx.env.create_string_from_std(ctx.value)?;

                ctx.callback.call(None, &[string])?;
                Ok(())
            },
        )?;
        Ok(Self {
            empty_interval_mined_blocks_range_start: None,
            indentation: 0,
            is_enabled: false,
            log_line_fn,
            log_line_with_title_fn,
            print_line_fn,
            replace_last_log_line_fn,
            replace_last_print_line_fn,
        })
    }

    fn is_enabled(&self) -> bool {
        self.is_enabled
    }

    fn set_is_enabled(&mut self, is_enabled: bool) {
        self.is_enabled = is_enabled;
    }

    fn format(&self, message: impl Into<String>) -> String {
        let message = message.into();

        if message.is_empty() {
            message
        } else {
            message
        }
    }

    fn indented(&mut self, display_fn: impl FnOnce(&mut Self)) {
        self.indentation += 2;
        display_fn(self);
        self.indentation -= 2;
    }

    fn log(&mut self, message: impl Into<String>) {
        let formatted = self.format(message);

        self.log_line_fn
            .call(formatted, ThreadsafeFunctionCallMode::Blocking);
    }

    fn log_auto_mined_block_results(
        &self,
        results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
        sent_transaction_hash: &B256,
    ) {
        for result in results {
            let contracts = result
                .transaction_traces
                .iter()
                .map(|trace| {
                    if let Some(code) = trace.messages.first().and_then(|message| {
                        if let TraceMessage::Before(before) = message {
                            before.code.as_ref()
                        } else {
                            None
                        }
                    }) {
                        code.clone()
                    } else {
                        Bytecode::new()
                    }
                })
                .collect::<Vec<_>>();

            self.log_block_from_auto_mine(result, contracts, sent_transaction_hash);
        }
    }

    fn log_base_fee(&mut self, base_fee: Option<&U256>) {
        if let Some(base_fee) = base_fee {
            self.log(format!("Base fee: {base_fee}"));
        }
    }

    fn log_block_from_auto_mine(
        &mut self,
        result: edr_evm::MineBlockResult<BlockchainError>,
        contracts: Vec<edr_evm::Bytecode>,
        transaction_hash_to_highlight: &edr_eth::B256,
    ) {
        let edr_evm::MineBlockResult {
            block,
            transaction_results,
            transaction_traces,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());
        debug_assert_eq!(num_transactions, contracts.len());

        let block_header = block.header();

        self.indented(|logger| {
            logger.log_block_id(&block);

            logger.indented(|logger| {
                logger.log_base_fee(block_header.base_fee_per_gas.as_ref());

                for (idx, transaction, result, trace, code) in izip!(
                    0..num_transactions,
                    transactions,
                    transaction_results,
                    transaction_traces,
                    contracts
                ) {
                    let should_highlight_hash =
                        *transaction.hash() == *transaction_hash_to_highlight;
                    logger.log_block_transaction(
                        transaction,
                        &code,
                        result.gas_used(),
                        should_highlight_hash,
                    );

                    logger.log_empty_line_between_transactions(idx, num_transactions);
                }
            });
        });

        self.log_empty_line();
    }

    fn log_block_hash(&mut self, block: &dyn SyncBlock<Error = BlockchainError>) {
        let block_hash = block.hash();

        self.log(format!("Block hash: {block_hash}"));
    }

    fn log_block_id(&mut self, block: &dyn SyncBlock<Error = BlockchainError>) {
        let block_number = block.header().number;
        let block_hash = block.hash();

        self.log(format!("Block #{block_number}: {block_hash}"));
    }

    fn log_block_number(&mut self, block: &dyn SyncBlock<Error = BlockchainError>) {
        let block_number = block.header().number;

        self.log(format!("Block #{block_number}:"));
    }

    /// Logs a transaction that's part of a block.
    fn log_block_transaction(
        &mut self,
        transaction: &edr_evm::PendingTransaction,
        code: &edr_evm::Bytecode,
        gas_used: u64,
        should_highlight_hash: bool,
    ) {
        let transaction_hash = transaction.hash();
        if should_highlight_hash {
            self.log_with_title("Transaction", transaction_hash);
        } else {
            // TODO: Make bold
            self.log_with_title("Transaction", format!("bold {transaction_hash}",));
        }

        self.indented(|logger| {
            logger.log_contract_and_function_name(code);
            logger.log_with_title("From", transaction.sender());
            if let Some(to) = transaction.to() {
                logger.log_with_title("To", to);
            }
            logger.log_with_title("Value", wei_to_human_readable(transaction.value()));
            logger.log_with_title(
                "Gas used",
                format!(
                    "{gas_used} of {gas_limit}",
                    gas_limit = transaction.gas_limit()
                ),
            );

            logger.log_console_log_messages();

            // TODO: Error logging, if present
        });
    }

    fn log_console_log_messages(&mut self) {
        // TODO: Add console log messages
    }

    fn log_contract_and_function_name(&mut self, code: &edr_evm::Bytecode) {
        // TODO: Add amalgamated stack trace
    }

    fn log_empty_block(&mut self, block: &dyn SyncBlock<Error = BlockchainError>) {
        let block_header = block.header();
        let block_number = block_header.number;

        let base_fee = if let Some(base_fee) = block_header.base_fee_per_gas.as_ref() {
            format!(" with base fee: {base_fee}")
        } else {
            String::new()
        };

        self.log(format!("Mined empty block #{block_number}{base_fee}",));
    }

    fn log_empty_line(&mut self) {
        self.log("");
    }

    fn log_empty_line_between_transactions(&mut self, idx: usize, num_transactions: usize) {
        if num_transactions > 1 && idx < num_transactions - 1 {
            self.log_empty_line()
        }
    }

    fn log_hardhat_mined_empty_block(
        &mut self,
        block: &dyn SyncBlock<Error = BlockchainError>,
        empty_blocks_range_start: Option<u64>,
    ) {
        self.indented(|logger| {
            if let Some(empty_blocks_range_start) = empty_blocks_range_start {
                logger.replace_last_log_line(format!(
                    "Mined empty block range #{empty_blocks_range_start} to #{block_number}",
                    block_number = block.header().number
                ));
            } else {
                logger.log_empty_block(block);
            }
        });
    }

    /// Logs the result of interval mining a block.
    fn log_interval_mined_block(&mut self, result: edr_evm::MineBlockResult<BlockchainError>) {
        let edr_evm::MineBlockResult {
            block,
            transaction_results,
            transaction_traces,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        let contracts = result
            .transaction_traces
            .iter()
            .map(|trace| {
                if let Some(code) = trace.messages.first().and_then(|message| {
                    if let TraceMessage::Before(before) = message {
                        before.code.as_ref()
                    } else {
                        None
                    }
                }) {
                    code.clone()
                } else {
                    Bytecode::new()
                }
            })
            .collect::<Vec<_>>();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());
        debug_assert_eq!(num_transactions, contracts.len());

        let block_header = block.header();

        self.indented(|logger| {
            logger.log_block_hash(&block);

            logger.indented(|logger| {
                logger.log_base_fee(block_header.base_fee_per_gas.as_ref());

                for (idx, transaction, result, trace, code) in izip!(
                    0..num_transactions,
                    transactions,
                    transaction_results,
                    transaction_traces,
                    contracts
                ) {
                    logger.log_block_transaction(transaction, &code, result.gas_used(), false);

                    logger.log_empty_line_between_transactions(idx, num_transactions);
                }
            });
        });

        self.log_empty_line();
    }

    fn log_mined_block(&mut self, result: edr_evm::MineBlockResult<BlockchainError>) {
        let edr_evm::MineBlockResult {
            block,
            transaction_results,
            transaction_traces,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        let contracts = result
            .transaction_traces
            .iter()
            .map(|trace| {
                if let Some(code) = trace.messages.first().and_then(|message| {
                    if let TraceMessage::Before(before) = message {
                        before.code.as_ref()
                    } else {
                        None
                    }
                }) {
                    code.clone()
                } else {
                    Bytecode::new()
                }
            })
            .collect::<Vec<_>>();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());
        debug_assert_eq!(num_transactions, contracts.len());

        self.indented(|logger| {
            if transactions.is_empty() {
                logger.log_empty_block(&block);
            } else {
                logger.log_block_number(&block);

                logger.indented(|logger| {
                    logger.log_block_hash(&block);

                    logger.indented(|logger| {
                        logger.log_base_fee(block.header().base_fee_per_gas.as_ref());

                        for (idx, transaction, result, trace, code) in izip!(
                            0..num_transactions,
                            transactions,
                            transaction_results,
                            transaction_traces,
                            contracts
                        ) {
                            logger.log_block_transaction(
                                transaction,
                                &code,
                                result.gas_used(),
                                false,
                            );

                            logger.log_empty_line_between_transactions(idx, num_transactions);
                        }
                    });
                });
            }
        });
    }

    /// Logs a warning about multiple blocks being mined.
    fn log_multiple_blocks_warning(&self) {
        self.indented(|logger| {
            logger
                .log("There were other pending transactions. More than one block had to be mined:")
        });
        self.log_empty_line();
    }

    /// Logs a warning about multiple transactions being mined.
    fn log_multiple_transactions_warning(&mut self) {
        self.indented(|logger| {
            logger.log("There were other pending transactions mined in the same block:")
        });
        self.log_empty_line();
    }

    fn log_with_title(&mut self, title: impl Into<String>, message: impl Display) {
        // repeat whitespace self.indentation times and concatenate with title
        let title = format!("{:indent$}{}", "", title.into(), indent = self.indentation);
        let message = format!("{message}");

        self.log_line_with_title_fn
            .call((title, message), ThreadsafeFunctionCallMode::Blocking);
    }

    fn log_single_transaction_mining_result(
        &mut self,
        result: &edr_evm::MineBlockResult<BlockchainError>,
        transaction: &PendingTransaction,
    ) {
        let trace = result
            .transaction_traces
            .first()
            .expect("A transaction exists, so the trace must exist as well.");

        let default_code = Bytecode::new();

        let code = trace
            .messages
            .first()
            .and_then(|message| {
                if let TraceMessage::Before(before) = message {
                    before.code.as_ref()
                } else {
                    None
                }
            })
            .unwrap_or(&default_code);

        self.indented(|logger| {
            logger.log_contract_and_function_name(code);

            let transaction_hash = transaction.hash();
            logger.log_with_title("Transaction", transaction_hash);

            logger.log_with_title("From", transaction.sender());
            if let Some(to) = transaction.to() {
                logger.log_with_title("To", to);
            }
            logger.log_with_title("Value", wei_to_human_readable(transaction.value()));
            logger.log_with_title(
                "Gas used",
                format!(
                    "{gas_used} of {gas_limit}",
                    gas_used = result
                        .transaction_results
                        .first()
                        .expect("A transaction exists, so the result must exist as well.")
                        .gas_used(),
                    gas_limit = transaction.gas_limit()
                ),
            );

            let block_number = result.block.header().number;
            logger.log_with_title(format!("Block #{block_number}"), result.block.hash());

            logger.log_console_log_messages();

            // TODO: Log error
        })
    }

    fn print(&mut self, message: impl Into<String>) {
        if !self.is_enabled {
            return;
        }

        let formatted = self.format(message);

        self.print_line_fn
            .call(formatted, ThreadsafeFunctionCallMode::Blocking);
    }

    fn print_empty_line(&mut self) {
        self.print("");
    }

    /// Prints the block number of an interval-mined block.
    fn print_interval_mined_block_number(
        &mut self,
        block_number: u64,
        is_empty: bool,
        base_fee_per_gas: Option<U256>,
    ) {
    }

    fn replace_last_log_line(&mut self, message: impl Into<String>) {
        let formatted = self.format(message);

        self.replace_last_log_line_fn
            .call(formatted, ThreadsafeFunctionCallMode::Blocking);
    }

    fn replace_last_print_line(&mut self, message: impl Into<String>) {
        if !self.is_enabled {
            return;
        }

        let formatted = self.format(message);

        self.replace_last_print_line_fn
            .call(formatted, ThreadsafeFunctionCallMode::Blocking);
    }
}

pub enum RequestLogging {
    IntervalMined {
        mining_result: edr_evm::MineBlockResult<BlockchainError>,
    },
    HardhatMined {
        mining_results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
    },
    /// Set when `eth_sendTransaction` or `eth_sendRawTransaction` is called.
    SendTransaction {
        mining_results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
        transaction: edr_evm::PendingTransaction,
    },
}

pub enum LoggingState {
    HardhatMinining {
        empty_blocks_range_start: Option<u64>,
    },
    IntervalMining {
        empty_blocks_range_start: Option<u64>,
    },
    Empty,
}

impl LoggingState {
    /// Converts the state into a hardhat mining state.
    pub fn into_hardhat_mining(self) -> Option<u64> {
        match self {
            Self::HardhatMinining {
                empty_blocks_range_start,
            } => empty_blocks_range_start,
            _ => None,
        }
    }

    /// Converts the state into an interval mining state.
    pub fn into_interval_mining(self) -> Option<u64> {
        match self {
            Self::IntervalMining {
                empty_blocks_range_start,
            } => empty_blocks_range_start,
            _ => None,
        }
    }
}

impl Default for LoggingState {
    fn default() -> Self {
        Self::Empty
    }
}

pub struct Logger {
    callbacks: LoggerCallbacks,
    request_logging: Option<RequestLogging>,
    state: LoggingState,
}

impl Logger {
    pub fn new(callbacks: LoggerCallbacks) -> Self {
        Self {
            callbacks,
            request_logging: None,
            state: LoggingState::default(),
        }
    }

    /// Logs any collected notifications to the console.
    pub fn flush(&mut self) {
        let state = std::mem::take(&mut self.state);

        if let Some(request_logging) = self.request_logging.take() {
            match request_logging {
                RequestLogging::IntervalMined { mining_result } => {
                    self.log_interval_mined(mining_result, state.into_interval_mining());
                }
                RequestLogging::HardhatMined { mining_results } => {
                    self.log_hardhat_mined(mining_results, state.into_hardhat_mining());
                }
                RequestLogging::SendTransaction {
                    mining_results,
                    transaction,
                } => {
                    self.log_send_transaction(mining_results, transaction);
                }
            }
        }
    }

    fn log_hardhat_mined(
        &mut self,
        mining_results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
        empty_blocks_range_start: Option<u64>,
    ) {
        for (idx, mining_result) in mining_results.into_iter().enumerate() {
            if mining_result.block.transactions().is_empty() {
                self.callbacks
                    .log_hardhat_mined_empty_block(&mining_result.block, empty_blocks_range_start);

                let block_number = mining_result.block.header().number;
                self.state = LoggingState::HardhatMinining {
                    empty_blocks_range_start: Some(
                        empty_blocks_range_start.unwrap_or(block_number),
                    ),
                };
            } else {
                self.callbacks.log_mined_block(mining_result);

                if idx < mining_results.len() - 1 {
                    self.callbacks.log_empty_line();
                }
            }
        }
    }

    fn log_interval_mined(
        &mut self,
        mining_result: edr_evm::MineBlockResult<BlockchainError>,
        empty_blocks_range_start: Option<u64>,
    ) {
        let block_header = mining_result.block.header();
        let block_number = block_header.number;

        if mining_result.block.transactions().is_empty() {
            if let Some(empty_blocks_range_start) = empty_blocks_range_start {
                self.callbacks.replace_last_print_line(format!(
                    "Mined empty block range #{empty_blocks_range_start} to #{block_number}"
                ));
            } else {
                let base_fee = if let Some(base_fee) = block_header.base_fee_per_gas.as_ref() {
                    format!(" with base fee: {base_fee}")
                } else {
                    String::new()
                };

                self.callbacks
                    .print(format!("Mined empty block #{block_number}{base_fee}"));
            }

            self.state = LoggingState::IntervalMining {
                empty_blocks_range_start: Some(
                    empty_blocks_range_start.unwrap_or(block_header.number),
                ),
            };
        } else {
            self.callbacks.log_interval_mined_block(mining_result);
            self.callbacks.print(format!("Mined block #{block_number}"));
            self.callbacks.print_empty_line();
        }
    }

    fn log_send_transaction(
        &mut self,
        mining_results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
        transaction: edr_evm::PendingTransaction,
    ) {
        if !mining_results.is_empty() {
            if mining_results.len() > 1 {
                self.callbacks.log_multiple_blocks_warning();
                self.callbacks
                    .log_auto_mined_block_results(mining_results, transaction.hash());
            } else if let Some(result) = mining_results.first() {
                let transactions = result.block.transactions();
                if transactions.len() > 1 {
                    self.callbacks.log_multiple_transactions_warning();
                    self.callbacks
                        .log_auto_mined_block_results(mining_results, transaction.hash());
                } else if let Some(transaction) = transactions.first() {
                    self.callbacks
                        .log_single_transaction_mining_result(&result, transaction)
                }
            }
        }
    }
}

impl edr_provider::Logger for Logger {
    type BlockchainError = BlockchainError;

    fn is_enabled(&self) -> bool {
        self.callbacks.is_enabled()
    }

    fn set_is_enabled(&mut self, is_enabled: bool) {
        self.callbacks.set_is_enabled(is_enabled);
    }

    fn on_block_auto_mined(&mut self, result: &edr_evm::MineBlockResult<Self::BlockchainError>) {
        let mining_results = match self.request_logging.as_mut() {
            Some(RequestLogging::SendTransaction { mining_results, .. }) => mining_results,
            _ => {
                unreachable!("on_block_auto_mined should only be called after on_send_transaction")
            }
        };

        mining_results.push(result.clone());
    }

    fn on_interval_mined(
        &mut self,
        mining_result: &edr_evm::MineBlockResult<Self::BlockchainError>,
    ) {
        self.request_logging = Some(RequestLogging::IntervalMined {
            mining_result: mining_result.clone(),
        });
    }

    fn on_hardhat_mined(&mut self, results: &[MineBlockResult<Self::BlockchainError>]) {}

    fn on_send_transaction(&mut self, transaction: &edr_evm::PendingTransaction) {
        self.request_logging = Some(RequestLogging::SendTransaction {
            mining_results: Vec::new(),
            transaction: transaction.clone(),
        });
    }
}

fn wei_to_human_readable(wei: U256) -> String {
    if wei == U256::ZERO {
        "0 ETH".to_string()
    } else if wei < U256::from(100_000) {
        format!("{wei} wei")
    } else if wei < U256::from(100_000_000_000_000) {
        to_decimal_string(wei, 9) + " gwei"
    } else {
        to_decimal_string(wei, 18) + " ETH"
    }
}

/// Converts the provided `value` to a decimal string after dividing it by
/// `10^exponent`. The returned string will have at most `MAX_DECIMALS`
/// decimals.
fn to_decimal_string(value: U256, exponent: u8) -> String {
    const MAX_DECIMALS: u8 = 4;

    let (integer, remainder) = value.div_rem(U256::from(10).pow(U256::from(exponent)));
    let decimal = remainder / U256::from(10).pow(U256::from(exponent - MAX_DECIMALS));

    // Remove trailing zeros
    let decimal = decimal.to_string().trim_end_matches('0').to_string();

    format!("{integer}.{decimal}")
}
