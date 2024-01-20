use std::{
    fmt::Display,
    sync::mpsc::{channel, Sender},
};

use edr_eth::{rlp::Encodable, Bytes, B256, U256};
use edr_evm::{
    blockchain::BlockchainError,
    precompile::{self, Precompiles},
    trace::TraceMessage,
    ExecutableTransaction, ExecutionResult, SyncBlock,
};
use itertools::izip;
use napi::{Env, JsFunction, NapiRaw, Status};
use napi_derive::napi;

use crate::{
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

struct DecodeConsoleLogInputsCall {
    inputs: Vec<Bytes>,
    sender: Sender<napi::Result<Vec<String>>>,
}

#[napi(object)]
pub struct LoggerConfig {
    /// Whether to enable the logger.
    pub enable: bool,
    #[napi(ts_type = "(inputs: Buffer[]) => string[]")]
    pub decode_console_log_inputs_callback: JsFunction,
    #[napi(ts_type = "(message: string, replace: boolean) => void")]
    pub print_line_callback: JsFunction,
}

#[derive(Clone)]
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

#[derive(Clone)]
enum LogLine {
    Single(String),
    WithTitle(String, String),
}

#[derive(Clone)]
pub struct Logger {
    collector: LogCollector,
}

impl Logger {
    pub fn new(env: &Env, config: LoggerConfig) -> napi::Result<Self> {
        Ok(Self {
            collector: LogCollector::new(env, config)?,
        })
    }
}

impl edr_provider::Logger for Logger {
    type BlockchainError = BlockchainError;

    fn is_enabled(&self) -> bool {
        self.collector.is_enabled
    }

    fn set_is_enabled(&mut self, is_enabled: bool) {
        self.collector.is_enabled = is_enabled;
    }

    fn on_call(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &ExecutableTransaction,
        result: &edr_provider::CallResult,
    ) {
        self.collector.on_call(spec_id, transaction, result);
    }

    fn on_interval_mined(
        &mut self,
        spec_id: edr_eth::SpecId,
        mining_result: &edr_provider::DebugMineBlockResult<Self::BlockchainError>,
    ) {
        self.collector.on_interval_mined(spec_id, mining_result);
    }

    fn on_hardhat_mined(
        &mut self,
        spec_id: edr_eth::SpecId,
        mining_results: Vec<edr_provider::DebugMineBlockResult<Self::BlockchainError>>,
    ) {
        self.collector.on_hardhat_mined(spec_id, mining_results);
    }

    fn on_send_transaction(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &edr_evm::ExecutableTransaction,
        mining_results: Vec<edr_provider::DebugMineBlockResult<Self::BlockchainError>>,
    ) {
        self.collector
            .on_send_transaction(spec_id, transaction, mining_results);
    }

    fn previous_request_logs(&self) -> Vec<String> {
        // TODO
        Vec::new()
    }

    fn previous_request_raw_traces(&self) -> Option<Vec<edr_evm::trace::Trace>> {
        // TODO
        None
    }
}

#[derive(Clone)]
struct LogCollector {
    indentation: usize,
    is_enabled: bool,
    decode_console_log_inputs_fn: ThreadsafeFunction<DecodeConsoleLogInputsCall>,
    logs: Vec<LogLine>,
    print_line_fn: ThreadsafeFunction<(String, bool)>,
    state: LoggingState,
    title_length: usize,
}

impl LogCollector {
    pub fn new(env: &Env, config: LoggerConfig) -> napi::Result<Self> {
        let decode_console_log_inputs_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the tracer.
            unsafe { config.decode_console_log_inputs_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<DecodeConsoleLogInputsCall>| {
                // Bytes[]
                let inputs = ctx
                    .env
                    .create_array_with_length(ctx.value.inputs.length())
                    .and_then(|mut inputs| {
                        for (idx, input) in ctx.value.inputs.into_iter().enumerate() {
                            unsafe {
                                ctx.env.create_buffer_with_borrowed_data(
                                    input.as_ptr(),
                                    input.len(),
                                    input,
                                    |input: Bytes, _env| {
                                        std::mem::drop(input);
                                    },
                                )
                            }
                            .and_then(|input| inputs.set_element(idx as u32, input.into_raw()))?;
                        }

                        Ok(inputs)
                    })?;

                let sender = ctx.value.sender.clone();

                let promise = ctx.callback.call(None, &[inputs])?;
                let result =
                    await_promise::<Vec<String>, Vec<String>>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let print_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the tracer.
            unsafe { config.print_line_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<(String, bool)>| {
                // String
                let message = ctx.env.create_string_from_std(ctx.value.0)?;

                // bool
                let replace = ctx.env.get_boolean(ctx.value.1)?;

                ctx.callback
                    .call(None, &[message.into_unknown(), replace.into_unknown()])?;
                Ok(())
            },
        )?;

        Ok(Self {
            decode_console_log_inputs_fn,
            indentation: 0,
            is_enabled: config.enable,
            logs: Vec::new(),
            print_line_fn,
            state: LoggingState::default(),
            title_length: 0,
        })
    }

    fn on_call(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &ExecutableTransaction,
        result: &edr_provider::CallResult,
    ) {
        let edr_provider::CallResult {
            console_log_inputs,
            gas_used,
            output,
            trace,
        } = result;

        self.indented(|logger| {
            logger.log_contract_and_function_name::<true>(spec_id, &trace);

            logger.log_with_title("From", format!("0x{:x}", transaction.caller()));
            if let Some(to) = transaction.to() {
                logger.log_with_title("To", format!("0x{to:x}"));
            }
            logger.log_with_title("Value", wei_to_human_readable(transaction.value()));
            logger.log_with_title(
                "Gas used",
                format!(
                    "{gas_used} of {gas_limit}",
                    gas_limit = transaction.gas_limit()
                ),
            );

            logger.log_console_log_messages(console_log_inputs);

            // TODO: Log error
            // if let ExecutionResult::Halt { reason, .. } = result {
            //     logger.log_empty_line();
            //     logger.log(format!("{reason:?}"));
            // }
        });
    }

    fn on_hardhat_mined(
        &mut self,
        spec_id: edr_eth::SpecId,
        mining_results: Vec<edr_provider::DebugMineBlockResult<BlockchainError>>,
    ) {
        let state = std::mem::take(&mut self.state);
        let empty_blocks_range_start = state.into_hardhat_mining();

        let num_results = mining_results.len();
        for (idx, mining_result) in mining_results.into_iter().enumerate() {
            if mining_result.block.transactions().is_empty() {
                self.log_hardhat_mined_empty_block(&mining_result.block, empty_blocks_range_start);

                let block_number = mining_result.block.header().number;
                self.state = LoggingState::HardhatMinining {
                    empty_blocks_range_start: Some(
                        empty_blocks_range_start.unwrap_or(block_number),
                    ),
                };
            } else {
                self.log_mined_block(spec_id, mining_result);

                if idx < num_results - 1 {
                    self.log_empty_line();
                }
            }
        }
    }

    fn on_interval_mined(
        &mut self,
        spec_id: edr_eth::SpecId,
        mining_result: &edr_provider::DebugMineBlockResult<BlockchainError>,
    ) {
        let state = std::mem::take(&mut self.state);
        let empty_blocks_range_start = state.into_interval_mining();

        let block_header = mining_result.block.header();
        let block_number = block_header.number;

        if mining_result.block.transactions().is_empty() {
            if let Some(empty_blocks_range_start) = empty_blocks_range_start {
                self.print::<true>(format!(
                    "Mined empty block range #{empty_blocks_range_start} to #{block_number}"
                ));
            } else {
                let base_fee = if let Some(base_fee) = block_header.base_fee_per_gas.as_ref() {
                    format!(" with base fee: {base_fee}")
                } else {
                    String::new()
                };

                self.print::<false>(format!("Mined empty block #{block_number}{base_fee}"));
            }

            self.state = LoggingState::IntervalMining {
                empty_blocks_range_start: Some(
                    empty_blocks_range_start.unwrap_or(block_header.number),
                ),
            };
        } else {
            self.log_interval_mined_block(spec_id, mining_result);
            self.print::<false>(format!("Mined block #{block_number}"));
            self.print_empty_line();
        }
    }

    fn on_send_transaction(
        &mut self,
        spec_id: edr_eth::SpecId,
        transaction: &edr_evm::ExecutableTransaction,
        mining_results: Vec<edr_provider::DebugMineBlockResult<BlockchainError>>,
    ) {
        if !mining_results.is_empty() {
            if mining_results.len() > 1 {
                self.log_multiple_blocks_warning();
                self.log_auto_mined_block_results(spec_id, mining_results, transaction.hash());
            } else if let Some(result) = mining_results.first() {
                let transactions = result.block.transactions();
                if transactions.len() > 1 {
                    self.log_multiple_transactions_warning();
                    self.log_auto_mined_block_results(spec_id, mining_results, transaction.hash());
                } else if let Some(transaction) = transactions.first() {
                    self.log_single_transaction_mining_result(spec_id, result, transaction);
                }
            }
        }
    }

    fn format(&self, message: impl Into<String>) -> String {
        let message = message.into();

        if message.is_empty() {
            message
        } else {
            message
                .split('\n')
                .map(|line| format!("{:indent$}{line}", "", indent = self.indentation))
                .collect::<Vec<_>>()
                .join("\n")
        }
    }

    fn indented(&mut self, display_fn: impl FnOnce(&mut Self)) {
        self.indentation += 2;
        display_fn(self);
        self.indentation -= 2;
    }

    fn log(&mut self, message: impl Into<String>) {
        let formatted = self.format(message);

        self.logs.push(LogLine::Single(formatted));
    }

    fn log_auto_mined_block_results(
        &mut self,
        spec_id: edr_eth::SpecId,
        results: Vec<edr_provider::DebugMineBlockResult<BlockchainError>>,
        sent_transaction_hash: &B256,
    ) {
        for result in results {
            self.log_block_from_auto_mine(spec_id, result, sent_transaction_hash);
        }
    }

    fn log_base_fee(&mut self, base_fee: Option<&U256>) {
        if let Some(base_fee) = base_fee {
            self.log(format!("Base fee: {base_fee}"));
        }
    }

    fn log_block_from_auto_mine(
        &mut self,
        spec_id: edr_eth::SpecId,
        result: edr_provider::DebugMineBlockResult<BlockchainError>,
        transaction_hash_to_highlight: &edr_eth::B256,
    ) {
        let edr_provider::DebugMineBlockResult {
            block,
            transaction_results,
            transaction_traces,
            console_log_inputs,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());

        let block_header = block.header();

        self.indented(|logger| {
            logger.log_block_id(&block);

            logger.indented(|logger| {
                logger.log_base_fee(block_header.base_fee_per_gas.as_ref());

                for (idx, transaction, result, trace) in izip!(
                    0..num_transactions,
                    transactions,
                    transaction_results,
                    transaction_traces
                ) {
                    let should_highlight_hash =
                        *transaction.hash() == *transaction_hash_to_highlight;
                    logger.log_block_transaction(
                        spec_id,
                        transaction,
                        &result,
                        &trace,
                        &console_log_inputs,
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
        spec_id: edr_eth::SpecId,
        transaction: &edr_evm::ExecutableTransaction,
        result: &edr_evm::ExecutionResult,
        trace: &edr_evm::trace::Trace,
        console_log_inputs: &[Bytes],
        should_highlight_hash: bool,
    ) {
        let transaction_hash = transaction.hash();
        if should_highlight_hash {
            self.log_with_title("Transaction", transaction_hash.to_string());
        } else {
            // TODO: Make bold
            self.log_with_title(
                "Transaction",
                format!(
                    "bold
{transaction_hash}",
                ),
            );
        }

        self.indented(|logger| {
            logger.log_contract_and_function_name::<false>(spec_id, trace);
            logger.log_with_title("From", format!("0x{:x}", transaction.caller()));
            if let Some(to) = transaction.to() {
                logger.log_with_title("To", format!("0x{to:x}"));
            }
            logger.log_with_title("Value", wei_to_human_readable(transaction.value()));
            logger.log_with_title(
                "Gas used",
                format!(
                    "{gas_used} of {gas_limit}",
                    gas_used = result.gas_used(),
                    gas_limit = transaction.gas_limit()
                ),
            );

            logger.log_console_log_messages(console_log_inputs);

            if let ExecutionResult::Halt { reason, .. } = &result {
                logger.log_empty_line();
                logger.log(format!("{reason:?}"));
            }
        });
    }

    fn log_console_log_messages(&mut self, console_log_inputs: &[Bytes]) {
        let (sender, receiver) = channel();

        let status = self.decode_console_log_inputs_fn.call(
            DecodeConsoleLogInputsCall {
                inputs: console_log_inputs.to_vec(),
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        let console_log_inputs = receiver
            .recv()
            .unwrap()
            .expect("Failed call to decode_console_log_inputs");
        // This is a special case, as we always want to print the console.log messages.
        // The difference is how. If we have a logger, we should use that, so that logs
        // are printed in order. If we don't, we just print the messages here.
        if self.is_enabled {
            if !console_log_inputs.is_empty() {
                self.log_empty_line();
                self.log("console.log:");

                self.indented(|logger| {
                    for input in console_log_inputs {
                        logger.log(input);
                    }
                });
            }
        } else {
            for input in console_log_inputs {
                self.print::<false>(input);
            }
        }
    }

    fn log_contract_and_function_name<const PRINT_INVALID_CONTRACT_WARNING: bool>(
        &mut self,
        spec_id: edr_eth::SpecId,
        trace: &edr_evm::trace::Trace,
    ) {
        const UNRECOGNIZED_CONTRACT_NAME: &str = "<UnrecognizedContract>";

        if let Some(TraceMessage::Before(before_message)) = trace.messages.first() {
            if let Some(to) = before_message.to {
                let is_precompile = {
                    let num_precompiles =
                        Precompiles::new(precompile::SpecId::from_spec_id(spec_id)).len();
                    precompile::is_precompile(to, num_precompiles)
                };

                if is_precompile {
                    let precompile = u16::from_be_bytes([to[18], to[19]]);
                    self.log_with_title(
                        "Precompile call",
                        format!("<PrecompileContract {precompile}>"),
                    );
                } else {
                    let is_code_empty = before_message
                        .code
                        .as_ref()
                        .map_or(true, edr_evm::Bytecode::is_empty);

                    if is_code_empty {
                        if PRINT_INVALID_CONTRACT_WARNING {
                            self.log(
                                "WARNING: Calling an account which is
not a contract",
                            );
                        }
                    } else {
                        self.log_with_title(
                            "Contract call",
                        // TODO: Check whether the contract code model is set
                        // if let Some(contract) =
                        //      self.contract_model.get(&code) {
                                "<TODO: contract.name#functionName>"
                     // } else {
                        //     UNRECOGNIZED_CONTRACT_NAME
                        //}
                    );
                    }
                }
            } else {
                self.log_with_title(
                    "Contract deployment",
                    // TODO: This should use the contract code model
                    if let Some(_code) = before_message.code.as_ref() {
                        "<TODO: contract.name>"
                    } else {
                        UNRECOGNIZED_CONTRACT_NAME
                    },
                );

                if let Some(code_address) = &before_message.code_address {
                    if let Some(TraceMessage::After(after_message)) = trace.messages.last() {
                        if after_message.is_success() {
                            self.log_with_title("Contract address", format!("0x{code_address:x}"));
                        }
                    }
                }
            }
        }
    }

    fn log_empty_block(&mut self, block: &dyn SyncBlock<Error = BlockchainError>) {
        let block_header = block.header();
        let block_number = block_header.number;

        let base_fee = if let Some(base_fee) = block_header.base_fee_per_gas.as_ref() {
            format!(
                " with base fee:
{base_fee}"
            )
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
            self.log_empty_line();
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
                    "Mined empty block range #{empty_blocks_range_start} to
#{block_number}",
                    block_number = block.header().number
                ));
            } else {
                logger.log_empty_block(block);
            }
        });
    }

    /// Logs the result of interval mining a block.
    fn log_interval_mined_block(
        &mut self,
        spec_id: edr_eth::SpecId,
        result: &edr_provider::DebugMineBlockResult<BlockchainError>,
    ) {
        let edr_provider::DebugMineBlockResult {
            block,
            transaction_results,
            transaction_traces,
            console_log_inputs,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());

        let block_header = block.header();

        self.indented(|logger| {
            logger.log_block_hash(block);

            logger.indented(|logger| {
                logger.log_base_fee(block_header.base_fee_per_gas.as_ref());

                for (idx, transaction, result, trace) in izip!(
                    0..num_transactions,
                    transactions,
                    transaction_results,
                    transaction_traces
                ) {
                    logger.log_block_transaction(
                        spec_id,
                        transaction,
                        result,
                        trace,
                        console_log_inputs,
                        false,
                    );

                    logger.log_empty_line_between_transactions(idx, num_transactions);
                }
            });
        });

        self.log_empty_line();
    }

    fn log_mined_block(
        &mut self,
        spec_id: edr_eth::SpecId,
        result: edr_provider::DebugMineBlockResult<BlockchainError>,
    ) {
        let edr_provider::DebugMineBlockResult {
            block,
            transaction_results,
            transaction_traces,
            console_log_inputs,
        } = result;

        let transactions = block.transactions();
        let num_transactions = transactions.len();

        debug_assert_eq!(num_transactions, transaction_results.len());
        debug_assert_eq!(num_transactions, transaction_traces.len());

        self.indented(|logger| {
            if transactions.is_empty() {
                logger.log_empty_block(&block);
            } else {
                logger.log_block_number(&block);

                logger.indented(|logger| {
                    logger.log_block_hash(&block);

                    logger.indented(|logger| {
                        logger.log_base_fee(block.header().base_fee_per_gas.as_ref());

                        for (idx, transaction, result, trace) in izip!(
                            0..num_transactions,
                            transactions,
                            transaction_results,
                            transaction_traces
                        ) {
                            logger.log_block_transaction(
                                spec_id,
                                transaction,
                                &result,
                                &trace,
                                &console_log_inputs,
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
    fn log_multiple_blocks_warning(&mut self) {
        self.indented(|logger| {
            logger.log(
                "There were other pending transactions. More than one
block had to be mined:",
            );
        });
        self.log_empty_line();
    }

    /// Logs a warning about multiple transactions being mined.
    fn log_multiple_transactions_warning(&mut self) {
        self.indented(|logger| {
            logger.log(
                "There were other pending transactions mined in the
same block:",
            );
        });
        self.log_empty_line();
    }

    fn log_with_title(&mut self, title: impl Into<String>, message: impl Display) {
        // repeat whitespace self.indentation times and concatenate with title
        let title = format!("{:indent$}{}", "", title.into(), indent = self.indentation);
        if title.len() > self.title_length {
            self.title_length = title.len();
        }

        let message = format!("{message}");
        self.logs.push(LogLine::WithTitle(title, message));
    }

    fn log_single_transaction_mining_result(
        &mut self,
        spec_id: edr_eth::SpecId,
        result: &edr_provider::DebugMineBlockResult<BlockchainError>,
        transaction: &ExecutableTransaction,
    ) {
        let trace = result.transaction_traces.first().expect(
            "A transaction exists, so the trace must exist as
well.",
        );

        let transaction_result = result.transaction_results.first().expect(
            "A transaction exists, so the result must exist as
well.",
        );

        self.indented(|logger| {
            logger.log_contract_and_function_name::<false>(spec_id, trace);

            let transaction_hash = transaction.hash();
            logger.log_with_title("Transaction", transaction_hash);

            logger.log_with_title("From", format!("0x{:x}", transaction.caller()));
            if let Some(to) = transaction.to() {
                logger.log_with_title("To", format!("0x{to:x}"));
            }
            logger.log_with_title("Value", wei_to_human_readable(transaction.value()));
            logger.log_with_title(
                "Gas used",
                format!(
                    "{gas_used} of {gas_limit}",
                    gas_used = transaction_result.gas_used(),
                    gas_limit = transaction.gas_limit()
                ),
            );

            let block_number = result.block.header().number;
            logger.log_with_title(format!("Block #{block_number}"), result.block.hash());

            // TODO: Get converted strings from Hardhat
            logger.log_console_log_messages(&result.console_log_inputs);

            if let ExecutionResult::Halt { reason, .. } = &transaction_result {
                logger.log_empty_line();
                logger.log(format!("{reason:?}"));
            }
        });
    }

    fn print<const REPLACE: bool>(&mut self, message: impl Into<String>) {
        if !self.is_enabled {
            return;
        }

        let formatted = self.format(message);

        let status = self
            .print_line_fn
            .call((formatted, REPLACE), ThreadsafeFunctionCallMode::Blocking);

        assert_eq!(status, napi::Status::Ok);
    }

    fn print_empty_line(&mut self) {
        self.print::<false>("");
    }

    fn replace_last_log_line(&mut self, message: impl Into<String>) {
        let formatted = self.format(message);

        *self.logs.last_mut().expect("There must be a log line") = LogLine::Single(formatted);
    }
}

fn wei_to_human_readable(wei: U256) -> String {
    if wei == U256::ZERO {
        "0 ETH".to_string()
    } else if wei < U256::from(100_000u64) {
        format!("{wei} wei")
    } else if wei < U256::from(100_000_000_000_000u64) {
        let mut decimal = to_decimal_string(wei, 9);
        decimal.push_str(" gwei");
        decimal
    } else {
        let mut decimal = to_decimal_string(wei, 18);
        decimal.push_str(" ETH");
        decimal
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
