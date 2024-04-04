use std::{collections::HashMap, fmt::Debug, sync::Arc};

use edr_eth::{signature::SignatureError, utils::u256_to_padded_hex, B256};
use revm::{
    db::DatabaseComponents,
    handler::register::EvmHandler,
    interpreter::{
        opcode::{self, BoxedInstruction, InstructionTables},
        InstructionResult, Interpreter, InterpreterResult,
    },
    primitives::{
        hex, Address, BlockEnv, Bytes, CfgEnvWithHandlerCfg, ExecutionResult, ResultAndState,
        SpecId, U256,
    },
    Database, Evm, EvmContext, JournalEntry,
};

use crate::{
    blockchain::SyncBlockchain, debug::GetContextData, state::SyncState, ExecutableTransaction,
    TransactionError,
};

/// Get trace output for `debug_traceTransaction`
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn debug_trace_transaction<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    // Take ownership of the state so that we can apply throw-away modifications on it
    mut state: Box<dyn SyncState<StateErrorT>>,
    evm_config: CfgEnvWithHandlerCfg,
    trace_config: DebugTraceConfig,
    block_env: BlockEnv,
    transactions: Vec<ExecutableTransaction>,
    transaction_hash: &B256,
) -> Result<DebugTraceResult, DebugTraceError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    if evm_config.handler_cfg.spec_id < SpecId::SPURIOUS_DRAGON {
        // Matching Hardhat Network behaviour: https://github.com/NomicFoundation/hardhat/blob/af7e4ce6a18601ec9cd6d4aa335fa7e24450e638/packages/hardhat-core/src/internal/hardhat-network/provider/vm/ethereumjs.ts#L427
        return Err(DebugTraceError::InvalidSpecId {
            spec_id: evm_config.handler_cfg.spec_id,
        });
    }

    if evm_config.handler_cfg.spec_id > SpecId::MERGE && block_env.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao.into());
    }

    for transaction in transactions {
        if transaction.hash() == transaction_hash {
            let mut tracer = TracerEip3155::new(trace_config);

            let ResultAndState { result, .. } = {
                let mut evm = Evm::builder()
                    .with_ref_db(DatabaseComponents {
                        state: state.as_ref(),
                        block_hash: blockchain,
                    })
                    .with_external_context(&mut tracer)
                    .with_cfg_env_with_handler_cfg(evm_config)
                    .append_handler_register(register_eip_3155_tracer_handles)
                    .with_block_env(block_env)
                    .with_tx_env(transaction.into())
                    .build();

                evm.transact().map_err(TransactionError::from)?
            };

            return Ok(execution_result_to_debug_result(result, tracer));
        } else {
            let ResultAndState { state: changes, .. } = {
                let mut evm = Evm::builder()
                    .with_ref_db(DatabaseComponents {
                        state: state.as_ref(),
                        block_hash: blockchain,
                    })
                    .with_cfg_env_with_handler_cfg(evm_config.clone())
                    .with_block_env(block_env.clone())
                    .with_tx_env(transaction.into())
                    .build();

                evm.transact().map_err(TransactionError::from)?
            };

            state.commit(changes);
        }
    }

    Err(DebugTraceError::InvalidTransactionHash {
        transaction_hash: *transaction_hash,
        block_number: block_env.number,
    })
}

/// Convert an `ExecutionResult` to a `DebugTraceResult`.
pub fn execution_result_to_debug_result(
    execution_result: ExecutionResult,
    tracer: TracerEip3155,
) -> DebugTraceResult {
    match execution_result {
        ExecutionResult::Success {
            gas_used, output, ..
        } => DebugTraceResult {
            pass: true,
            gas_used,
            output: Some(output.into_data()),
            logs: tracer.logs,
        },
        ExecutionResult::Revert { gas_used, output } => DebugTraceResult {
            pass: false,
            gas_used,
            output: Some(output),
            logs: tracer.logs,
        },
        ExecutionResult::Halt { gas_used, .. } => DebugTraceResult {
            pass: false,
            gas_used,
            output: None,
            logs: tracer.logs,
        },
    }
}

/// Config options for `debug_traceTransaction`
#[derive(Debug, Default, Clone)]
pub struct DebugTraceConfig {
    /// Disable storage trace.
    pub disable_storage: bool,
    /// Disable memory trace.
    pub disable_memory: bool,
    /// Disable stack trace.
    pub disable_stack: bool,
}

/// Debug trace error.
#[derive(Debug, thiserror::Error)]
pub enum DebugTraceError<BlockchainErrorT, StateErrorT> {
    /// Invalid hardfork spec argument.
    #[error("Invalid spec id: {spec_id:?}. `debug_traceTransaction` is not supported prior to Spurious Dragon")]
    InvalidSpecId {
        /// The hardfork.
        spec_id: SpecId,
    },
    /// Invalid transaction hash argument.
    #[error("Transaction hash {transaction_hash} not found in block {block_number}")]
    InvalidTransactionHash {
        /// The transaction hash.
        transaction_hash: B256,
        /// The block number.
        block_number: U256,
    },
    /// Signature error.
    #[error(transparent)]
    SignatureError(#[from] SignatureError),
    /// Transaction error.
    #[error(transparent)]
    TransactionError(#[from] TransactionError<BlockchainErrorT, StateErrorT>),
}

/// Result of a `debug_traceTransaction` call.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugTraceResult {
    /// Whether transaction was executed successfully.
    pub pass: bool,
    /// All gas used by the transaction.
    pub gas_used: u64,
    /// Return values of the function.
    pub output: Option<Bytes>,
    /// The EIP-3155 debug logs.
    #[serde(rename = "structLogs")]
    pub logs: Vec<DebugTraceLogItem>,
}

/// The output of an EIP-3155 trace.
/// The required fields match <https://eips.ethereum.org/EIPS/eip-3155#output> except for
/// `returnData` and `refund` which are not used currently by Hardhat.
/// The `opName`, `error`, `memory` and `storage` optional fields are supported
/// as well.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugTraceLogItem {
    /// Program Counter
    pub pc: u64,
    /// Op code
    pub op: u8,
    /// Gas left before executing this operation as hex number.
    pub gas: String,
    /// Gas cost of this operation as hex number.
    pub gas_cost: String,
    /// Array of all values (hex numbers) on the stack
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<Vec<String>>,
    /// Depth of the call stack
    pub depth: u64,
    /// Size of memory array.
    pub mem_size: u64,
    /// Name of the operation.
    pub op_name: String,
    /// Description of an error.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Array of all allocated values as hex strings.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<Vec<String>>,
    /// Map of all stored values with keys and values encoded as hex strings.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub storage: Option<HashMap<String, String>>,
}

/// Register EIP-3155 tracer handles.
pub fn register_eip_3155_tracer_handles<
    DatabaseT: Database,
    ContextT: GetContextData<TracerEip3155>,
>(
    handler: &mut EvmHandler<'_, ContextT, DatabaseT>,
) {
    // Every instruction inside flat table that is going to be wrapped by tracer
    // calls.
    let table = handler
        .instruction_table
        .take()
        .expect("Handler must have instruction table");

    let table = match table {
        InstructionTables::Plain(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
        InstructionTables::Boxed(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
    };

    // cast vector to array.
    handler.instruction_table = Some(InstructionTables::Boxed(
        table.try_into().unwrap_or_else(|_| unreachable!()),
    ));

    // call outcome
    let old_handle = handler.execution.insert_call_outcome.clone();
    handler.execution.insert_call_outcome = Arc::new(move |ctx, frame, shared_memory, outcome| {
        let tracer = ctx.external.get_context_data();
        tracer.on_inner_frame_result(&outcome.result);

        old_handle(ctx, frame, shared_memory, outcome)
    });

    // create outcome
    let old_handle = handler.execution.insert_create_outcome.clone();
    handler.execution.insert_create_outcome = Arc::new(move |ctx, frame, outcome| {
        let tracer = ctx.external.get_context_data();
        tracer.on_inner_frame_result(&outcome.result);

        old_handle(ctx, frame, outcome)
    });
}

/// Outer closure that calls tracer for every instruction.
fn instruction_handler<
    'a,
    ContextT: GetContextData<TracerEip3155>,
    DatabaseT: Database,
    Instruction: Fn(&mut Interpreter, &mut Evm<'a, ContextT, DatabaseT>) + 'a,
>(
    instruction: Instruction,
) -> BoxedInstruction<'a, Evm<'a, ContextT, DatabaseT>> {
    Box::new(
        move |interpreter: &mut Interpreter, host: &mut Evm<'a, ContextT, DatabaseT>| {
            // SAFETY: as the PC was already incremented we need to subtract 1 to preserve
            // the old Inspector behavior.
            interpreter.instruction_pointer = unsafe { interpreter.instruction_pointer.sub(1) };

            host.context.external.get_context_data().step(interpreter);
            if interpreter.instruction_result != InstructionResult::Continue {
                return;
            }

            // return PC to old value
            interpreter.instruction_pointer = unsafe { interpreter.instruction_pointer.add(1) };

            // execute instruction.
            instruction(interpreter, host);

            host.context
                .external
                .get_context_data()
                .step_end(interpreter, &mut host.context.evm);
        },
    )
}

/// An EIP-3155 compatible EVM tracer.
#[derive(Debug)]
pub struct TracerEip3155 {
    config: DebugTraceConfig,
    logs: Vec<DebugTraceLogItem>,
    contract_address: Address,
    gas_remaining: u64,
    memory: Vec<u8>,
    mem_size: usize,
    opcode: u8,
    pc: usize,
    stack: Vec<U256>,
    // Contract-specific storage
    storage: HashMap<Address, HashMap<String, String>>,
}

impl TracerEip3155 {
    /// Create a new tracer.
    pub fn new(config: DebugTraceConfig) -> Self {
        Self {
            config,
            logs: Vec::default(),
            contract_address: Address::default(),
            stack: Vec::new(),
            pc: 0,
            opcode: 0,
            gas_remaining: 0,
            memory: Vec::default(),
            mem_size: 0,
            storage: HashMap::default(),
        }
    }

    fn step(&mut self, interp: &mut Interpreter) {
        self.contract_address = interp.contract.address;
        self.gas_remaining = interp.gas().remaining();

        if !self.config.disable_stack {
            self.stack = interp.stack.data().clone();
        }

        if !self.config.disable_memory {
            self.memory = interp.shared_memory.context_memory().to_vec();
        }

        self.mem_size = interp.shared_memory.context_memory().len();

        self.opcode = interp.current_opcode();

        self.pc = interp.program_counter();
    }

    fn step_end<DatabaseT: Database>(
        &mut self,
        interp: &mut Interpreter,
        context: &mut EvmContext<DatabaseT>,
    ) {
        let depth = context.journaled_state.depth();

        let stack = if self.config.disable_stack {
            None
        } else {
            Some(
                self.stack
                    .iter()
                    .map(u256_to_padded_hex)
                    .collect::<Vec<String>>(),
            )
        };

        let memory = if self.config.disable_memory {
            None
        } else {
            Some(self.memory.chunks(32).map(hex::encode).collect())
        };

        let storage = if self.config.disable_storage {
            None
        } else {
            if matches!(self.opcode, opcode::SLOAD | opcode::SSTORE) {
                let last_entry = context
                    .journaled_state
                    .journal
                    .last()
                    .and_then(|v| v.last());
                if let Some(JournalEntry::StorageChange { address, key, .. }) = last_entry {
                    let value = context.journaled_state.state[address].storage[key].present_value();
                    let contract_storage = self.storage.entry(self.contract_address).or_default();
                    contract_storage.insert(u256_to_padded_hex(key), u256_to_padded_hex(&value));
                }
            }
            Some(
                self.storage
                    .get(&self.contract_address)
                    .cloned()
                    .unwrap_or_default(),
            )
        };

        let mut error = None;
        let op_name = opcode::OPCODE_JUMPMAP[self.opcode as usize].map_or_else(
            || {
                // Matches message from Hardhat
                // https://github.com/NomicFoundation/hardhat/blob/37c5c5845969b15995cc96cb6bd0596977f8b1f8/packages/hardhat-core/src/internal/hardhat-network/stack-traces/vm-debug-tracer.ts#L452
                let fallback = format!("opcode 0x${:x} not defined", self.opcode);
                error = Some(fallback.clone());
                fallback
            },
            String::from,
        );

        let gas_cost = self.gas_remaining.saturating_sub(interp.gas().remaining());
        let log_item = DebugTraceLogItem {
            pc: self.pc as u64,
            op: self.opcode,
            gas: format!("0x{:x}", self.gas_remaining),
            gas_cost: format!("0x{gas_cost:x}"),
            stack,
            depth,
            mem_size: self.mem_size as u64,
            op_name,
            error,
            memory,
            storage,
        };
        self.logs.push(log_item);
    }

    fn on_inner_frame_result(&mut self, result: &InterpreterResult) {
        self.gas_remaining = if result.result.is_error() {
            0
        } else {
            result.gas.remaining()
        };
    }
}

impl GetContextData<TracerEip3155> for TracerEip3155 {
    fn get_context_data(&mut self) -> &mut TracerEip3155 {
        self
    }
}
