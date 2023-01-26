use rethnet_eth::Bytes;
use revm::interpreter::{Gas, InstructionResult};

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
