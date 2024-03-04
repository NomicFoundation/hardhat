use std::{cell::RefCell, collections::HashMap, fmt::Debug, rc::Rc, sync::Arc};

use edr_eth::{signature::SignatureError, utils::u256_to_padded_hex, B256};
use revm::{
    db::DatabaseComponents,
    handler::register::{EvmHandler, EvmInstructionTables},
    inspectors::GasInspector,
    interpreter::{
        opcode::{self, BoxedInstruction},
        CallInputs, CallOutcome, CreateInputs, CreateOutcome, InstructionResult, Interpreter,
    },
    primitives::{
        hex, Address, BlockEnv, Bytes, CfgEnvWithHandlerCfg, EVMError, ExecutionResult,
        ResultAndState, SpecId, U256,
    },
    Database, Evm, EvmContext, FrameOrResult, FrameResult, Inspector, JournalEntry,
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

fn register_eip_3155_tracer_handles<
    'a,
    DatabaseT: Database,
    ContextT: GetContextData<TracerEip3155>,
>(
    handler: &mut EvmHandler<'a, ContextT, DatabaseT>,
) {
    // Every instruction inside flat table that is going to be wrapped by tracer
    // calls.
    let table = handler
        .instruction_table
        .take()
        .expect("Handler must have instruction table");

    let table = match table {
        EvmInstructionTables::Plain(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
        EvmInstructionTables::Boxed(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
    };

    // cast vector to array.
    handler.instruction_table = Some(EvmInstructionTables::Boxed(
        table.try_into().unwrap_or_else(|_| unreachable!()),
    ));

    // call and create input stack shared between handlers. They are used to share
    // inputs in *_end Inspector calls.
    let call_input_stack = Rc::<RefCell<Vec<_>>>::new(RefCell::new(Vec::new()));
    let create_input_stack = Rc::<RefCell<Vec<_>>>::new(RefCell::new(Vec::new()));

    // Create handler
    let create_input_stack_inner = create_input_stack.clone();
    let old_handle = handler.execution.create.clone();
    handler.execution.create = Arc::new(
        move |ctx, mut inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            let tracer = ctx.external.get_context_data();
            // call tracer create to change input or return outcome.
            if let Some(outcome) = tracer.create(&mut ctx.evm, &mut inputs) {
                create_input_stack_inner.borrow_mut().push(inputs.clone());
                return Ok(FrameOrResult::Result(FrameResult::Create(outcome)));
            }
            create_input_stack_inner.borrow_mut().push(inputs.clone());

            let mut frame_or_result = old_handle(ctx, inputs);

            if let Ok(FrameOrResult::Frame(frame)) = &mut frame_or_result {
                let tracer = ctx.external.get_context_data();
                tracer.initialize_interp(&mut frame.frame_data_mut().interpreter, &mut ctx.evm);
            }
            frame_or_result
        },
    );

    // Call handler
    let call_input_stack_inner = call_input_stack.clone();
    let old_handle = handler.execution.call.clone();
    handler.execution.call = Arc::new(
        move |ctx, mut inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            let tracer = ctx.external.get_context_data();
            let _mems = inputs.return_memory_offset.clone();
            // call tracer callto change input or return outcome.
            if let Some(outcome) = tracer.call(&mut ctx.evm, &mut inputs) {
                call_input_stack_inner.borrow_mut().push(inputs.clone());
                return Ok(FrameOrResult::Result(FrameResult::Call(outcome)));
            }
            call_input_stack_inner.borrow_mut().push(inputs.clone());

            let mut frame_or_result = old_handle(ctx, inputs);

            if let Ok(FrameOrResult::Frame(frame)) = &mut frame_or_result {
                let tracer = ctx.external.get_context_data();
                tracer.initialize_interp(&mut frame.frame_data_mut().interpreter, &mut ctx.evm);
            }
            frame_or_result
        },
    );

    // call outcome
    let call_input_stack_inner = call_input_stack.clone();
    let old_handle = handler.execution.insert_call_outcome.clone();
    handler.execution.insert_call_outcome =
        Arc::new(move |ctx, frame, shared_memory, mut outcome| {
            let tracer = ctx.external.get_context_data();
            let call_inputs = call_input_stack_inner.borrow_mut().pop().unwrap();
            outcome = tracer.call_end(&mut ctx.evm, &call_inputs, outcome);
            old_handle(ctx, frame, shared_memory, outcome)
        });

    // create outcome
    let create_input_stack_inner = create_input_stack.clone();
    let old_handle = handler.execution.insert_create_outcome.clone();
    handler.execution.insert_create_outcome = Arc::new(move |ctx, frame, mut outcome| {
        let tracer = ctx.external.get_context_data();
        let create_inputs = create_input_stack_inner.borrow_mut().pop().unwrap();
        outcome = tracer.create_end(&mut ctx.evm, &create_inputs, outcome);
        old_handle(ctx, frame, outcome)
    });

    // last frame outcome
    let old_handle = handler.execution.last_frame_return.clone();
    handler.execution.last_frame_return = Arc::new(move |ctx, frame_result| {
        let tracer = ctx.external.get_context_data();
        match frame_result {
            FrameResult::Call(outcome) => {
                let call_inputs = call_input_stack.borrow_mut().pop().unwrap();
                *outcome = tracer.call_end(&mut ctx.evm, &call_inputs, outcome.clone());
            }
            FrameResult::Create(outcome) => {
                let create_inputs = create_input_stack.borrow_mut().pop().unwrap();
                *outcome = tracer.create_end(&mut ctx.evm, &create_inputs, outcome.clone());
            }
        }
        old_handle(ctx, frame_result)
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

            host.context
                .external
                .get_context_data()
                .step(interpreter, &mut host.context.evm);
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
/// Based on [REVM TracerEip3155](https://github.com/bluealloy/revm/blob/70cf969a25a45e3bb4e503926297d61a90c7eec5/crates/revm/src/inspector/tracer_eip3155.rs).
/// Original licensed under the MIT license.
#[derive(Debug)]
pub struct TracerEip3155 {
    config: DebugTraceConfig,
    logs: Vec<DebugTraceLogItem>,
    gas_inspector: GasInspector,
    contract_address: Address,
    gas_remaining: u64,
    memory: Vec<u8>,
    mem_size: usize,
    opcode: u8,
    pc: usize,
    skip: bool,
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
            gas_inspector: GasInspector::default(),
            contract_address: Address::default(),
            stack: Vec::new(),
            pc: 0,
            opcode: 0,
            gas_remaining: 0,
            memory: Vec::default(),
            mem_size: 0,
            skip: false,
            storage: HashMap::default(),
        }
    }

    fn record_log<DatabaseT: Database>(&mut self, context: &mut EvmContext<DatabaseT>) {
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

        // We don't support gas computation for these opcodes yet
        let gas_cost = if matches!(
            self.opcode,
            opcode::CREATE
                | opcode::CREATE2
                | opcode::CALL
                | opcode::CALLCODE
                | opcode::DELEGATECALL
                | opcode::STATICCALL
        ) {
            0
        } else {
            self.gas_inspector.last_gas_cost()
        };

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

    pub fn initialize_interp<DatabaseT: Database>(
        &mut self,
        interp: &mut Interpreter,
        context: &mut EvmContext<DatabaseT>,
    ) {
        self.gas_inspector.initialize_interp(interp, context);
    }

    fn step<DatabaseT: Database>(
        &mut self,
        interp: &mut Interpreter,
        context: &mut EvmContext<DatabaseT>,
    ) {
        self.contract_address = interp.contract.address;

        self.gas_inspector.step(interp, context);
        self.gas_remaining = self.gas_inspector.gas_remaining();

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
        self.gas_inspector.step_end(interp, context);

        // Omit extra return https://github.com/bluealloy/revm/pull/563
        if self.skip {
            self.skip = false;
        } else {
            self.record_log(context);
        }
    }

    fn call<DatabaseT: Database>(
        &mut self,
        context: &mut EvmContext<DatabaseT>,
        _inputs: &mut CallInputs,
    ) -> Option<CallOutcome> {
        self.record_log(context);
        None
    }

    fn call_end<DatabaseT: Database>(
        &mut self,
        context: &mut EvmContext<DatabaseT>,
        inputs: &CallInputs,
        outcome: CallOutcome,
    ) -> CallOutcome {
        self.skip = true;
        self.gas_inspector.call_end(context, inputs, outcome)
    }

    fn create<DatabaseT: Database>(
        &mut self,
        context: &mut EvmContext<DatabaseT>,
        _inputs: &mut CreateInputs,
    ) -> Option<CreateOutcome> {
        self.record_log(context);
        None
    }

    fn create_end<DatabaseT: Database>(
        &mut self,
        context: &mut EvmContext<DatabaseT>,
        inputs: &CreateInputs,
        outcome: CreateOutcome,
    ) -> CreateOutcome {
        self.skip = true;
        self.gas_inspector.create_end(context, inputs, outcome)
    }
}

impl GetContextData<TracerEip3155> for TracerEip3155 {
    fn get_context_data(&mut self) -> &mut TracerEip3155 {
        self
    }
}
