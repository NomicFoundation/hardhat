use rethnet_eth::Bytes;
use revm::{
    interpreter::{opcode, Gas, InstructionResult, Interpreter},
    Database, EVMData, Inspector,
};

/// A trace for an EVM call.
#[derive(Default)]
pub struct Trace {
    /// The individual steps of the call
    pub steps: Vec<Step>,
    /// The return value of the call
    pub return_value: Bytes,
    gas: Option<Gas>,
}

/// A single EVM step.
pub struct Step {
    /// The executed op code
    pub opcode: u8,
    /// The amount of gas that was used by the step
    pub gas_cost: u64,
    /// The amount of gas that was refunded by the step
    pub gas_refunded: i64,
    /// The exit code of the step
    pub exit_code: InstructionResult,
}

impl Trace {
    /// Adds a VM step to the trace.
    pub fn add_step(&mut self, opcode: u8, gas: &Gas, exit_code: InstructionResult) {
        let step = if let Some(old_gas) = self.gas.replace(*gas) {
            Step {
                opcode,
                gas_cost: gas.spend() - old_gas.spend(),
                gas_refunded: gas.refunded() - old_gas.refunded(),
                exit_code,
            }
        } else {
            Step {
                opcode,
                gas_cost: gas.spend(),
                gas_refunded: gas.refunded(),
                exit_code,
            }
        };

        self.steps.push(step);
    }
}

/// Object that gathers trace information during EVM execution and can be turned into a trace upon completion.
#[derive(Default)]
pub struct TraceCollector {
    trace: Trace,
    opcode_stack: Vec<u8>,
}

impl TraceCollector {
    /// Converts the [`Tracer`] into its [`Trace`].
    pub fn into_trace(self) -> Trace {
        self.trace
    }
}

impl<D> Inspector<D> for TraceCollector
where
    D: Database,
{
    fn step(
        &mut self,
        interp: &mut Interpreter,
        _data: &mut EVMData<'_, D>,
        _is_static: bool,
    ) -> InstructionResult {
        self.opcode_stack.push(interp.current_opcode());

        InstructionResult::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut Interpreter,
        _data: &mut EVMData<'_, D>,
        _is_static: bool,
        exit_code: InstructionResult,
    ) -> InstructionResult {
        let opcode = self
            .opcode_stack
            .pop()
            .expect("There must always be an opcode when ending a step");

        self.trace.add_step(opcode, interp.gas(), exit_code);

        if opcode == opcode::RETURN || opcode == opcode::REVERT {
            self.trace.return_value = interp.return_value();
        }

        exit_code
    }
}
