use crate::blockchain::SyncBlockchain;
use crate::evm::build_evm;
use crate::state::SyncState;
use crate::TransactionError;
use rethnet_eth::transaction::TransactionRequest;
use rethnet_eth::B256;
use revm::inspectors::GasInspector;
use revm::interpreter::{
    opcode, CallInputs, CreateInputs, Gas, InstructionResult, Interpreter, Stack,
};
use revm::primitives::{hex, B160, U256};
use revm::primitives::{BlockEnv, Bytes, CfgEnv, ExecutionResult, ResultAndState, SpecId};
use revm::{EVMData, Inspector};
use std::fmt::Debug;

/// Get trace output for `debug_traceTransaction`
#[cfg_attr(feature = "tracing", tracing::instrument)]
pub fn debug_trace_transaction<BlockchainErrorT, StateErrorT>(
    blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
    state: &mut dyn SyncState<StateErrorT>,
    cfg: CfgEnv,
    block_env: BlockEnv,
    transactions: Vec<TransactionRequest>,
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
            message: "`debug_traceTransaction` is not supported prior to Spurious Dragon"
                .to_string(),
        });
    }

    if cfg.spec_id > SpecId::MERGE && block_env.prevrandao.is_none() {
        return Err(TransactionError::MissingPrevrandao.into());
    }

    // Clone the state so that we can apply throw-away modifications on it
    // TODO figure out why this doesn't work
    // let mut state = state.clone();

    for tx in transactions {
        let tx_hash = tx.hash();

        let evm = build_evm(blockchain, state, cfg.clone(), tx.into(), block_env.clone());

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
                    failed: false,
                    gas_used,
                    output: Some(output.into_data()),
                    logs: tracer.logs,
                },
                ExecutionResult::Revert { gas_used, output } => DebugTraceResult {
                    failed: true,
                    gas_used,
                    output: Some(output),
                    logs: tracer.logs,
                },
                ExecutionResult::Halt { gas_used, .. } => DebugTraceResult {
                    failed: true,
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

    return Err(DebugTraceError::InvalidTransactionHash {
        tx_hash: transaction_hash,
        block_number: block_env.number,
    });
}

#[derive(Debug, thiserror::Error)]
pub enum DebugTraceError<BlockchainErrorT, StateErrorT> {
    /// Invalid hardfork spec argument.
    #[error("Invalid spec id {spec_id:?}: {message}")]
    InvalidSpecId { message: String, spec_id: SpecId },
    /// Invalid transaction hash argument.
    #[error("Transaction hash {tx_hash} not found in block {block_number}")]
    InvalidTransactionHash { tx_hash: B256, block_number: U256 },
    #[error(transparent)]
    TransactionError(#[from] TransactionError<BlockchainErrorT, StateErrorT>),
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct DebugTraceResult {
    pub failed: bool,
    pub gas_used: u64,
    pub output: Option<Bytes>,
    pub logs: Vec<DebugTraceLogItem>,
}

/// The output of an EIP-3155 trace.
/// Fields match: https://eips.ethereum.org/EIPS/eip-3155#output
/// Not all optional fields are supported.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct DebugTraceLogItem {
    /// Program Counter
    pub pc: u64,
    // Op code
    pub op: u8,
    /// Gas left before executing this operation as hex number.
    pub gas: String,
    /// Gas cost of this operation as hex number.
    pub gas_cost: String,
    /// Array of all values (hex numbers) on the stack
    pub stack: Vec<String>,
    /// Depth of the call stack
    pub depth: u64,
    /// Data returned by function call as hex string.
    pub return_data: String,
    /// Amount of global gas refunded as hex number.
    pub refund: String,
    /// Size of memory array
    pub mem_size: u64,
    /// Name of the operation
    pub op_name: Option<String>,
}

// Based on https://github.com/bluealloy/revm/blob/70cf969a25a45e3bb4e503926297d61a90c7eec5/crates/revm/src/inspector/tracer_eip3155.rs
// Original licensed under the MIT license.
struct TracerEip3155 {
    logs: Vec<DebugTraceLogItem>,

    gas_inspector: GasInspector,

    stack: Stack,
    pc: usize,
    opcode: u8,
    gas: u64,
    mem_size: usize,
    skip: bool,
}

impl TracerEip3155 {
    fn new() -> Self {
        Self {
            logs: Vec::default(),
            gas_inspector: GasInspector::default(),
            stack: Stack::new(),
            pc: 0,
            opcode: 0,
            gas: 0,
            mem_size: 0,
            skip: false,
        }
    }

    fn record_log(&mut self, depth: u64) {
        let short_stack: Vec<String> = self.stack.data().iter().map(|&b| short_hex(b)).collect();
        // TODO the fields with todo!() are not supported by revm::TraceEip3155, but they're
        // mandatory according to the EIP. We need to figure out if we can add support for them
        // or if they're really needed by Hardhat.
        let log_item = DebugTraceLogItem {
            pc: self.pc as u64,
            op: self.opcode,
            gas: format!("0x{:x}", self.gas),
            gas_cost: format!("0x{:x}", self.gas_inspector.last_gas_cost()),
            stack: short_stack,
            depth,
            return_data: todo!(),
            refund: todo!(),
            mem_size: todo!(),
            op_name: opcode::OPCODE_JUMPMAP[self.opcode as usize].map(String::from),
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

    // get opcode by calling `interp.contract.opcode(interp.program_counter())`.
    // all other information can be obtained from interp.
    fn step(
        &mut self,
        interp: &mut Interpreter,
        data: &mut dyn EVMData<DatabaseErrorT>,
    ) -> InstructionResult {
        self.gas_inspector.step(interp, data);
        self.stack = interp.stack.clone();
        self.pc = interp.program_counter();
        self.opcode = interp.current_opcode();
        self.mem_size = interp.memory.len();
        self.gas = self.gas_inspector.gas_remaining();
        //
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

        self.record_log(data.journaled_state().depth());
        InstructionResult::Continue
    }

    fn call(
        &mut self,
        data: &mut dyn EVMData<DatabaseErrorT>,
        _inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, Bytes) {
        self.record_log(data.journaled_state().depth());
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
        if data.journaled_state().depth() == 0 {
            todo!()
            // let log_line = json!({
            //     //stateroot
            //     "output": format!("0x{}", hex::encode(out.as_ref())),
            //     "gasUsed": format!("0x{:x}", self.gas_inspector.gas_remaining()),
            //     //time
            //     //fork
            // });
            //
            // writeln!(self.output, "{}", serde_json::to_string(&log_line).unwrap())
            //     .expect("If output fails we can ignore the logging");
        }
        (ret, remaining_gas, out)
    }

    fn create(
        &mut self,
        data: &mut dyn EVMData<DatabaseErrorT>,
        _inputs: &mut CreateInputs,
    ) -> (InstructionResult, Option<B160>, Gas, Bytes) {
        self.record_log(data.journaled_state().depth());
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

// From https://github.com/bluealloy/revm/blob/70cf969a25a45e3bb4e503926297d61a90c7eec5/crates/revm/src/inspector/tracer_eip3155.rs
// Original licensed under the MIT license.
fn short_hex(b: U256) -> String {
    let s = hex::encode(b.to_be_bytes_vec())
        .trim_start_matches('0')
        .to_string();
    if s.is_empty() {
        "0x0".to_string()
    } else {
        format!("0x{s}")
    }
}
