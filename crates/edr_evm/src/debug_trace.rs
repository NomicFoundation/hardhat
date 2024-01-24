use std::{collections::HashMap, fmt::Debug};

use edr_eth::{signature::SignatureError, utils::u256_to_padded_hex, B256};
use revm::{
    inspectors::GasInspector,
    interpreter::{opcode, CallInputs, CreateInputs, Gas, InstructionResult, Interpreter, Stack},
    primitives::{
        hex, Address, BlockEnv, Bytes, CfgEnv, ExecutionResult, ResultAndState, SpecId, U256,
    },
    EVMData, Inspector, JournalEntry,
};

use crate::{
    blockchain::SyncBlockchain, evm::build_evm, state::SyncState, ExecutableTransaction,
    TransactionError,
};

/// Get trace output for `debug_traceTransaction`
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub fn debug_trace_transaction<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    // Take ownership of the state so that we can apply throw-away modifications on it
    mut state: Box<dyn SyncState<StateErrorT>>,
    evm_config: CfgEnv,
    trace_config: DebugTraceConfig,
    block_env: BlockEnv,
    transactions: Vec<ExecutableTransaction>,
    transaction_hash: &B256,
) -> Result<DebugTraceResult, DebugTraceError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    if evm_config.spec_id < SpecId::SPURIOUS_DRAGON {
        // Matching Hardhat Network behaviour: https://github.com/NomicFoundation/hardhat/blob/af7e4ce6a18601ec9cd6d4aa335fa7e24450e638/packages/hardhat-core/src/internal/hardhat-network/provider/vm/ethereumjs.ts#L427
        return Err(DebugTraceError::InvalidSpecId {
            spec_id: evm_config.spec_id,
        });
    }

    if evm_config.spec_id > SpecId::MERGE && block_env.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao.into());
    }

    for transaction in transactions {
        if transaction.hash() == transaction_hash {
            let evm = build_evm(
                blockchain,
                &state,
                evm_config,
                transaction.into(),
                block_env,
            );
            let mut tracer = TracerEip3155::new(trace_config);
            let ResultAndState {
                result: execution_result,
                ..
            } = evm
                .inspect_ref(&mut tracer)
                .map_err(TransactionError::from)?;

            return Ok(execution_result_to_debug_result(execution_result, tracer));
        } else {
            let evm = build_evm(
                blockchain,
                &state,
                evm_config.clone(),
                transaction.into(),
                block_env.clone(),
            );
            let ResultAndState { state: changes, .. } =
                evm.transact_ref().map_err(TransactionError::from)?;
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
    stack: Stack,
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
            stack: Stack::new(),
            pc: 0,
            opcode: 0,
            gas_remaining: 0,
            memory: Vec::default(),
            mem_size: 0,
            skip: false,
            storage: HashMap::default(),
        }
    }

    fn record_log<DatabaseErrorT>(&mut self, data: &mut EVMData<'_, DatabaseErrorT>) {
        let depth = data.journaled_state.depth();

        let stack = if self.config.disable_stack {
            None
        } else {
            Some(
                self.stack
                    .data()
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
                let last_entry = data.journaled_state.journal.last().and_then(|v| v.last());
                if let Some(JournalEntry::StorageChange { address, key, .. }) = last_entry {
                    let value = data.journaled_state.state[address].storage[key].present_value();
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
}

impl<DatabaseErrorT> Inspector<DatabaseErrorT> for TracerEip3155 {
    fn initialize_interp(
        &mut self,
        interp: &mut Interpreter,
        data: &mut EVMData<'_, DatabaseErrorT>,
    ) -> InstructionResult {
        self.gas_inspector.initialize_interp(interp, data);
        InstructionResult::Continue
    }

    fn step(
        &mut self,
        interp: &mut Interpreter,
        data: &mut EVMData<'_, DatabaseErrorT>,
    ) -> InstructionResult {
        self.contract_address = interp.contract.address;

        self.gas_inspector.step(interp, data);
        self.gas_remaining = self.gas_inspector.gas_remaining();

        if !self.config.disable_stack {
            self.stack = interp.stack.clone();
        }

        if !self.config.disable_memory {
            self.memory = interp.memory.data().clone();
        }

        self.mem_size = interp.memory.len();

        self.opcode = interp.current_opcode();

        self.pc = interp.program_counter();

        InstructionResult::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut Interpreter,
        data: &mut EVMData<'_, DatabaseErrorT>,
        eval: InstructionResult,
    ) -> InstructionResult {
        self.gas_inspector.step_end(interp, data, eval);

        // Omit extra return https://github.com/bluealloy/revm/pull/563
        if self.skip {
            self.skip = false;
            return InstructionResult::Continue;
        };

        self.record_log(data);
        InstructionResult::Continue
    }

    fn call(
        &mut self,
        data: &mut EVMData<'_, DatabaseErrorT>,
        _inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, Bytes) {
        self.record_log(data);
        (InstructionResult::Continue, Gas::new(0), Bytes::new())
    }

    fn call_end(
        &mut self,
        data: &mut EVMData<'_, DatabaseErrorT>,
        inputs: &CallInputs,
        remaining_gas: Gas,
        ret: InstructionResult,
        out: Bytes,
    ) -> (InstructionResult, Gas, Bytes) {
        self.gas_inspector
            .call_end(data, inputs, remaining_gas, ret, out.clone());
        self.skip = true;
        (ret, remaining_gas, out)
    }

    fn create(
        &mut self,
        data: &mut EVMData<'_, DatabaseErrorT>,
        _inputs: &mut CreateInputs,
    ) -> (InstructionResult, Option<Address>, Gas, Bytes) {
        self.record_log(data);
        (
            InstructionResult::Continue,
            None,
            Gas::new(0),
            Bytes::default(),
        )
    }

    fn create_end(
        &mut self,
        data: &mut EVMData<'_, DatabaseErrorT>,
        inputs: &CreateInputs,
        ret: InstructionResult,
        address: Option<Address>,
        remaining_gas: Gas,
        out: Bytes,
    ) -> (InstructionResult, Option<Address>, Gas, Bytes) {
        self.gas_inspector
            .create_end(data, inputs, ret, address, remaining_gas, out.clone());
        self.skip = true;
        (ret, address, remaining_gas, out)
    }
}
