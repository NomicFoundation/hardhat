use revm::{blockchain::Blockchain, opcode, Database, EVMData, Inspector, Interpreter, Return};

use crate::trace::Trace;

#[derive(Default)]
pub struct RethnetInspector {
    trace: Trace,
    opcode_stack: Vec<u8>,
}

impl RethnetInspector {
    /// Converts the [`RethnetInspector`] into its [`Trace`].
    pub fn into_trace(self) -> Trace {
        self.trace
    }
}

impl<D, BC> Inspector<D, BC> for RethnetInspector
where
    D: Database,
    BC: Blockchain<Error = D::Error>,
{
    fn step(
        &mut self,
        interp: &mut Interpreter,
        _data: &mut EVMData<'_, D, BC>,
        _is_static: bool,
    ) -> Return {
        self.opcode_stack.push(interp.current_opcode());

        Return::Continue
    }

    fn step_end(
        &mut self,
        interp: &mut Interpreter,
        _data: &mut EVMData<'_, D, BC>,
        _is_static: bool,
        exit_code: Return,
    ) -> Return {
        let opcode = self
            .opcode_stack
            .pop()
            .expect("There must always be an opcode when ending a step");

        self.trace.add_step(opcode, interp.gas(), exit_code);

        if opcode == opcode::RETURN {
            self.trace.return_value = interp.return_value();
        }

        Return::Continue
    }
}
