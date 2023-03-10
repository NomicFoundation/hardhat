use std::marker::PhantomData;

use revm::{Database, Inspector};

// TODO: Improve this design by introducing a InspectorMut trait

/// Inspector that allows two inspectors to operate side-by-side. The immutable inspector runs
/// first, followed by the mutable inspector. To ensure both inspectors observe a valid state, you
/// have to ensure that only the mutable inspector modifies state. The returned values are solely
/// determined by the mutable inspector.
pub struct DualInspector<A, B, DB>
where
    A: Inspector<DB>,
    B: Inspector<DB>,
    DB: Database,
{
    immutable: A,
    mutable: B,
    phantom: PhantomData<DB>,
}

impl<A, B, DB> DualInspector<A, B, DB>
where
    A: Inspector<DB>,
    B: Inspector<DB>,
    DB: Database,
{
    /// Constructs a `DualInspector` from the provided inspectors.
    pub fn new(immutable: A, mutable: B) -> Self {
        Self {
            immutable,
            mutable,
            phantom: PhantomData,
        }
    }

    /// Returns the two inspectors wrapped by the `DualInspector`.
    pub fn into_parts(self) -> (A, B) {
        (self.immutable, self.mutable)
    }
}

impl<A, B, DB> Inspector<DB> for DualInspector<A, B, DB>
where
    A: Inspector<DB>,
    B: Inspector<DB>,
    DB: Database,
{
    fn initialize_interp(
        &mut self,
        interp: &mut revm::interpreter::Interpreter,
        data: &mut revm::EVMData<'_, DB>,
        is_static: bool,
    ) -> revm::interpreter::InstructionResult {
        self.immutable.initialize_interp(interp, data, is_static);
        self.mutable.initialize_interp(interp, data, is_static)
    }

    fn step(
        &mut self,
        interp: &mut revm::interpreter::Interpreter,
        data: &mut revm::EVMData<'_, DB>,
        is_static: bool,
    ) -> revm::interpreter::InstructionResult {
        self.immutable.step(interp, data, is_static);
        self.mutable.step(interp, data, is_static)
    }

    fn log(
        &mut self,
        evm_data: &mut revm::EVMData<'_, DB>,
        address: &rethnet_eth::B160,
        topics: &[rethnet_eth::B256],
        data: &rethnet_eth::Bytes,
    ) {
        self.immutable.log(evm_data, address, topics, data);
        self.mutable.log(evm_data, address, topics, data)
    }

    fn step_end(
        &mut self,
        interp: &mut revm::interpreter::Interpreter,
        data: &mut revm::EVMData<'_, DB>,
        is_static: bool,
        eval: revm::interpreter::InstructionResult,
    ) -> revm::interpreter::InstructionResult {
        self.immutable.step_end(interp, data, is_static, eval);
        self.mutable.step_end(interp, data, is_static, eval)
    }

    fn call(
        &mut self,
        data: &mut revm::EVMData<'_, DB>,
        inputs: &mut revm::interpreter::CallInputs,
        is_static: bool,
    ) -> (
        revm::interpreter::InstructionResult,
        revm::interpreter::Gas,
        rethnet_eth::Bytes,
    ) {
        self.immutable.call(data, inputs, is_static);
        self.mutable.call(data, inputs, is_static)
    }

    fn call_end(
        &mut self,
        data: &mut revm::EVMData<'_, DB>,
        inputs: &revm::interpreter::CallInputs,
        remaining_gas: revm::interpreter::Gas,
        ret: revm::interpreter::InstructionResult,
        out: rethnet_eth::Bytes,
        is_static: bool,
    ) -> (
        revm::interpreter::InstructionResult,
        revm::interpreter::Gas,
        rethnet_eth::Bytes,
    ) {
        self.immutable
            .call_end(data, inputs, remaining_gas, ret, out.clone(), is_static);
        self.mutable
            .call_end(data, inputs, remaining_gas, ret, out, is_static)
    }

    fn create(
        &mut self,
        data: &mut revm::EVMData<'_, DB>,
        inputs: &mut revm::interpreter::CreateInputs,
    ) -> (
        revm::interpreter::InstructionResult,
        Option<rethnet_eth::B160>,
        revm::interpreter::Gas,
        rethnet_eth::Bytes,
    ) {
        self.immutable.create(data, inputs);
        self.mutable.create(data, inputs)
    }

    fn create_end(
        &mut self,
        data: &mut revm::EVMData<'_, DB>,
        inputs: &revm::interpreter::CreateInputs,
        ret: revm::interpreter::InstructionResult,
        address: Option<rethnet_eth::B160>,
        remaining_gas: revm::interpreter::Gas,
        out: rethnet_eth::Bytes,
    ) -> (
        revm::interpreter::InstructionResult,
        Option<rethnet_eth::B160>,
        revm::interpreter::Gas,
        rethnet_eth::Bytes,
    ) {
        self.immutable
            .create_end(data, inputs, ret, address, remaining_gas, out.clone());
        self.mutable
            .create_end(data, inputs, ret, address, remaining_gas, out)
    }

    fn selfdestruct(&mut self) {
        self.immutable.selfdestruct();
        self.mutable.selfdestruct();
    }
}
