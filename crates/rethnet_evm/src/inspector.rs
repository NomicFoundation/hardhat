use log::trace;
use revm::{opcode, Database, EVMData, Inspector, Interpreter, Return};

pub struct RethnetInspector;

impl Default for RethnetInspector {
    fn default() -> Self {
        Self
    }
}

impl<D> Inspector<D> for RethnetInspector
where
    D: Database,
{
    fn step(
        &mut self,
        interp: &mut Interpreter,
        _data: &mut EVMData<'_, D>,
        _is_static: bool,
    ) -> Return {
        let opcode = unsafe { *interp.instruction_pointer };
        trace!(
            "opcode: {:?} | fee: {} | gasLeft: {} | gasSpent: {}",
            opcode::OPCODE_JUMPMAP[usize::from(opcode)],
            opcode::spec_opcode_gas(_data.env.cfg.spec_id)[usize::from(opcode)].get_gas(),
            interp.gas().remaining(),
            interp.gas().spend()
        );

        Return::Continue
    }
}
