use edr_eth::{B256, U256};
use edr_evm::{
    blockchain::BlockchainError, trace::TraceMessage, Bytecode, PendingTransaction, SyncBlock,
};
use itertools::izip;
use napi::{bindgen_prelude::BigInt, Env, JsFunction, NapiRaw};
use napi_derive::napi;

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
    max_title_length: usize,
    print_line_fn: ThreadsafeFunction<String>,
    replace_last_line_fn: ThreadsafeFunction<String>,
}

impl LoggerCallbacks {
    pub fn new(
        env: &Env,
        log_line_callback: JsFunction,
        print_line_callback: JsFunction,
        replace_last_line_callback: JsFunction,
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
        let replace_last_line_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { replace_last_line_callback.raw() },
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
            max_title_length: 0,
            print_line_fn,
            replace_last_line_fn,
        })
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

    fn log_base_fee(&mut self, base_fee: Option<&U256>) {
        if let Some(base_fee) = base_fee {
            self.log(format!("Base fee: {base_fee}"));
        }
    }

    fn log_block_from_automine(
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
                        code,
                        result.gas_used,
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
        gas_used: &U256,
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

    fn log_automined_block_results(
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

            self.log_block_from_automine(result, contracts, sent_transaction_hash);
        }
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

    fn log_with_title(&mut self, title: impl Into<String>, message: impl Into<String>) {
        // repeat whitespace self.indentation times and concatenate with title
        let title = format!("{:indent$}{}", "", title.into(), indent = self.indentation);

        // We always use the max title length we've seen. Otherwise the value move a lot
        // with each tx/call.
        self.max_title_length = self.max_title_length.max(title.len());

        self.log_with_title(title, message.into());
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

    fn replace_last_log_line(&mut self, message: impl Into<String>) {
        let formatted = self.format(message);

        self.replace_last_line_fn
            .call(formatted, ThreadsafeFunctionCallMode::Blocking);
    }
}

pub struct Logger {
    callbacks: LoggerCallbacks,
    mining_results: Vec<edr_evm::MineBlockResult<BlockchainError>>,
    /// Set when `eth_sendTransaction` or `eth_sendRawTransaction` is called.
    send_transaction: Option<edr_evm::PendingTransaction>,
}

impl Logger {
    pub fn new(callbacks: LoggerCallbacks) -> Self {
        Self {
            callbacks,
            mining_results: Vec::new(),
            send_transaction: None,
        }
    }

    /// Logs any collected notifications to the console.
    pub fn flush(&mut self) {
        if let Some(transaction) = self.send_transaction.take() {
            if !self.mining_results.is_empty() {
                let mining_results = std::mem::take(&mut self.mining_results);

                if mining_results.len() > 1 {
                    self.callbacks.log_multiple_blocks_warning();
                    self.callbacks
                        .log_automined_block_results(mining_results, transaction.hash());
                } else if let Some(result) = mining_results.first() {
                    let transactions = result.block.transactions();
                    if transactions.len() > 1 {
                        self.callbacks.log_multiple_transactions_warning();
                        self.callbacks
                            .log_automined_block_results(mining_results, transaction.hash());
                    } else if let Some(transaction) = transactions.first() {
                        self.callbacks
                            .log_single_transaction_mining_result(&result.block, transaction)
                    }
                }
            }
        }
    }
}

impl edr_provider::Logger for Logger {
    type BlockchainError = BlockchainError;

    fn on_block_mined(&mut self, result: &edr_evm::MineBlockResult<Self::BlockchainError>) {
        self.mining_results.push(result.clone());
    }

    fn on_send_transaction(&mut self, transaction: &edr_evm::PendingTransaction) {
        todo!()
    }
}

// impl edr_provider::Logger for LoggerCallbacks {
//     type BlockchainError = edr_provider::ProviderError;

//     fn is_printing(&self) -> bool {
//         self.is_enabled
//     }

//     fn log_block_from_automine(
//         &mut self,
//         result: edr_evm::MineBlockResult<Self::BlockchainError>,
//         contracts: Vec<edr_evm::Bytecode>,
//         transaction_hash_to_highlight: &edr_eth::B256,
//     ) {
//         let edr_evm::MineBlockResult {
//             block,
//             transaction_results,
//             transaction_traces,
//         } = result;

//         let transactions = block.transactions();
//         let num_transactions = transactions.len();

//         debug_assert_eq!(num_transactions, transaction_results.len());
//         debug_assert_eq!(num_transactions, transaction_traces.len());
//         debug_assert_eq!(num_transactions, contracts.len());

//         let block_header = block.header();

//         self.indented(|logger| {
//             logger.log_block_id(&block);

//             logger.indented(|logger| {
//                 logger.log_base_fee(&block_header.base_fee_per_gas.as_ref());

//                 for (idx, transaction, result, trace, code) in izip!(
//                     0..num_transactions,
//                     transactions,
//                     transaction_results,
//                     transaction_traces,
//                     contracts
//                 )
//                 .enumerate()
//                 {
//                     let should_highlight_hash =
//                         *transaction.hash() ==
// *transaction_hash_to_highlight;
// logger.log_block_transaction(                         transaction,
//                         code,
//                         result.gas_used,
//                         should_highlight_hash,
//                     );

//                     logger.log_empty_line_between_transactions(idx,
// num_transactions);                 }
//             });
//         });

//         self.log_empty_line();
//     }

//     fn log_mined_block(
//         &mut self,
//         result: edr_evm::MineBlockResult<Self::BlockchainError>,
//         contracts: Vec<edr_evm::Bytecode>,
//     ) {
//         let edr_evm::MineBlockResult {
//             block,
//             transaction_results,
//             transaction_traces,
//         } = result;

//         let transactions = block.transactions();
//         let num_transactions = transactions.len();

//         debug_assert_eq!(num_transactions, transaction_results.len());
//         debug_assert_eq!(num_transactions, transaction_traces.len());
//         debug_assert_eq!(num_transactions, contracts.len());

//         self.indented(|logger| {
//             if transactions.is_empty() {
//                 logger.log_empty_block(&block);
//             } else {
//                 logger.log_block_number(&block);

//                 logger.indented(|logger| {
//
// logger.log_base_fee(&block.header().base_fee_per_gas.as_ref());

//                     for (idx, transaction, result, trace, code) in izip!(
//                         0..num_transactions,
//                         transactions,
//                         transaction_results,
//                         transaction_traces,
//                         contracts
//                     )
//                     .enumerate()
//                     {
//                         logger.log_block_transaction(transaction, code,
// result.gas_used, false);

//                         logger.log_empty_line_between_transactions(idx,
// num_transactions);                     }
//                 });
//             }
//         });
//     }
// }

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

    let (integer, remainder) = value.div_rem(&U256::from(10.pow(exponent)));
    let decimal = remainder / 10.pow(exponent - MAX_DECIMALS);

    // Remove trailing zeros
    let decimal = decimal.to_string().trim_end_matches('0').to_string();

    format!("{integer}.{decimal}")
}
