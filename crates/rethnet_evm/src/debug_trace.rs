use crate::blockchain::SyncBlockchain;
use crate::evm::build_evm;
use crate::state::SyncState;
use crate::TransactionError;
use rethnet_eth::signature::SignatureError;
use rethnet_eth::transaction::SignedTransaction;
use rethnet_eth::B256;
use revm::inspectors::GasInspector;
use revm::interpreter::{
    opcode, CallInputs, CreateInputs, Gas, InstructionResult, Interpreter, Stack,
};
use revm::primitives::{hex, B160, U256};
use revm::primitives::{BlockEnv, Bytes, CfgEnv, ExecutionResult, ResultAndState, SpecId};
use revm::{EVMData, Inspector, JournalEntry};
use std::collections::HashMap;
use std::fmt::Debug;

/// Get trace output for `debug_traceTransaction`
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub fn debug_trace_transaction<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    // Take ownership of the state so that we can apply throw-away modifications on it
    // TODO depends on https://github.com/NomicFoundation/hardhat/pull/4254
    // mut state: Box<dyn SyncState<StateErrorT>>,
    state: &mut dyn SyncState<StateErrorT>,
    cfg: CfgEnv,
    block_env: BlockEnv,
    transactions: Vec<SignedTransaction>,
    transaction_hash: B256,
) -> Result<DebugTraceResult, DebugTraceError<BlockchainErrorT, StateErrorT>>
where
    BlockchainErrorT: Debug + Send + 'static,
    StateErrorT: Debug + Send + 'static,
{
    if cfg.spec_id < SpecId::SPURIOUS_DRAGON {
        // Matching Hardhat Network behaviour: https://github.com/NomicFoundation/hardhat/blob/af7e4ce6a18601ec9cd6d4aa335fa7e24450e638/packages/hardhat-core/src/internal/hardhat-network/provider/vm/ethereumjs.ts#L427
        return Err(DebugTraceError::InvalidSpecId {
            spec_id: cfg.spec_id,
        });
    }

    if cfg.spec_id > SpecId::MERGE && block_env.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao.into());
    }

    for tx in transactions {
        let tx_hash = tx.hash();

        let evm = build_evm(
            blockchain,
            state,
            cfg.clone(),
            tx.try_into()?,
            block_env.clone(),
        );

        if tx_hash == transaction_hash {
            let mut tracer = TracerEip3155::new();
            let ResultAndState {
                result: execution_result,
                ..
            } = evm
                .inspect_ref(&mut tracer)
                .map_err(TransactionError::from)?;
            let debug_result = match execution_result {
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
            };

            return Ok(debug_result);
        } else {
            let ResultAndState { state: changes, .. } =
                evm.transact_ref().map_err(TransactionError::from)?;
            state.commit(changes);
        }
    }

    Err(DebugTraceError::InvalidTransactionHash {
        tx_hash: transaction_hash,
        block_number: block_env.number,
    })
}

#[derive(Debug, thiserror::Error)]
pub enum DebugTraceError<BlockchainErrorT, StateErrorT> {
    /// Invalid hardfork spec argument.
    #[error("Invalid spec id: {spec_id:?}. `debug_traceTransaction` is not supported prior to Spurious Dragon")]
    InvalidSpecId { spec_id: SpecId },
    /// Invalid transaction hash argument.
    #[error("Transaction hash {tx_hash} not found in block {block_number}")]
    InvalidTransactionHash { tx_hash: B256, block_number: U256 },
    #[error(transparent)]
    SignatureError(#[from] SignatureError),
    #[error(transparent)]
    TransactionError(#[from] TransactionError<BlockchainErrorT, StateErrorT>),
}

/// Result of a `debug_traceTransaction` call.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct DebugTraceResult {
    /// Whether transaction was executed successfully.
    pub pass: bool,
    /// All gas used by the transaction.
    pub gas_used: u64,
    /// Return values of the function.
    pub output: Option<Bytes>,
    /// The EIP-3155 debug logs.
    pub logs: Vec<DebugTraceLogItem>,
}

/// The output of an EIP-3155 trace.
/// The required fields match <https://eips.ethereum.org/EIPS/eip-3155#output> except for
/// `returnData` and `refund` which are not used currently by Hardhat.
/// The `opName`, `error`, `memory` and `storage` optional fields are supported as well.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
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
    pub stack: Vec<String>,
    /// Depth of the call stack
    pub depth: u64,
    /// Size of memory array.
    pub mem_size: u64,
    /// Name of the operation.
    pub op_name: String,
    /// Description of an error.
    pub error: Option<String>,
    /// Array of all allocated values as hex strings.
    pub memory: Vec<String>,
    /// Map of all stored values with keys and values encoded as hex strings.
    pub storage: HashMap<String, String>,
}

// Based on https://github.com/bluealloy/revm/blob/70cf969a25a45e3bb4e503926297d61a90c7eec5/crates/revm/src/inspector/tracer_eip3155.rs
// Original licensed under the MIT license.
struct TracerEip3155 {
    logs: Vec<DebugTraceLogItem>,

    gas_inspector: GasInspector,

    gas_remaining: u64,
    memory: Vec<u8>,
    mem_size: usize,
    opcode: u8,
    pc: usize,
    skip: bool,
    stack: Stack,
    storage: HashMap<String, String>,
}

impl TracerEip3155 {
    fn new() -> Self {
        Self {
            logs: Vec::default(),
            gas_inspector: GasInspector::default(),
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

    fn record_log<DatabaseErrorT>(&mut self, data: &mut dyn EVMData<DatabaseErrorT>) {
        let depth = data.journaled_state().depth();

        let stack: Vec<String> = self.stack.data().iter().map(to_hex_word).collect();

        let memory = self.memory.chunks(32).map(hex::encode).collect();

        if matches!(self.opcode, opcode::SLOAD | opcode::SSTORE) {
            let journaled_state = data.journaled_state();
            let last_entry = journaled_state.journal.last().and_then(|v| v.last());
            if let Some(JournalEntry::StorageChange { address, key, .. }) = last_entry {
                let value = journaled_state.state[address].storage[key].present_value();
                self.storage.insert(to_hex_word(key), to_hex_word(&value));
            }
        }

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

        let log_item = DebugTraceLogItem {
            pc: self.pc as u64,
            op: self.opcode,
            gas: format!("0x{:x}", self.gas_remaining),
            gas_cost: format!("0x{:x}", self.gas_inspector.last_gas_cost()),
            stack,
            depth,
            mem_size: self.mem_size as u64,
            op_name,
            error,
            memory,
            storage: self.storage.clone(),
        };
        self.logs.push(log_item);
    }
}

impl<DatabaseErrorT> Inspector<DatabaseErrorT> for TracerEip3155 {
    fn initialize_interp(
        &mut self,
        interp: &mut Interpreter,
        data: &mut dyn EVMData<DatabaseErrorT>,
    ) -> InstructionResult {
        self.gas_inspector.initialize_interp(interp, data);
        InstructionResult::Continue
    }

    fn step(
        &mut self,
        interp: &mut Interpreter,
        data: &mut dyn EVMData<DatabaseErrorT>,
    ) -> InstructionResult {
        self.gas_inspector.step(interp, data);
        self.stack = interp.stack.clone();
        self.pc = interp.program_counter();
        self.opcode = interp.current_opcode();
        self.memory = interp.memory.data().clone();
        self.mem_size = interp.memory.len();
        self.gas_remaining = self.gas_inspector.gas_remaining();

        InstructionResult::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut Interpreter,
        data: &mut dyn EVMData<DatabaseErrorT>,
        eval: InstructionResult,
    ) -> InstructionResult {
        self.gas_inspector.step_end(interp, data, eval);
        if self.skip {
            self.skip = false;
            return InstructionResult::Continue;
        };

        self.record_log(data);
        InstructionResult::Continue
    }

    fn call(
        &mut self,
        data: &mut dyn EVMData<DatabaseErrorT>,
        _inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, Bytes) {
        self.record_log(data);
        (InstructionResult::Continue, Gas::new(0), Bytes::new())
    }

    fn call_end(
        &mut self,
        data: &mut dyn EVMData<DatabaseErrorT>,
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
        data: &mut dyn EVMData<DatabaseErrorT>,
        _inputs: &mut CreateInputs,
    ) -> (InstructionResult, Option<B160>, Gas, Bytes) {
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
        data: &mut dyn EVMData<DatabaseErrorT>,
        inputs: &CreateInputs,
        ret: InstructionResult,
        address: Option<B160>,
        remaining_gas: Gas,
        out: Bytes,
    ) -> (InstructionResult, Option<B160>, Gas, Bytes) {
        self.gas_inspector
            .create_end(data, inputs, ret, address, remaining_gas, out.clone());
        self.skip = true;
        (ret, address, remaining_gas, out)
    }
}

fn to_hex_word(word: &U256) -> String {
    if word == &U256::ZERO {
        // For 0 zero, the #066x formatter doesn't add padding.
        format!("0x{}", "0".repeat(64))
    } else {
        // 66 = 64 hex chars + 0x prefix
        format!("{word:#066x}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_hex_word() {
        assert_eq!(
            to_hex_word(&U256::ZERO),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        assert_eq!(
            to_hex_word(&U256::from(1)),
            "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
    }
}
