use std::{fmt::Debug, marker::PhantomData};

use edr_eth::{Address, Bytes, B256, U256};
use revm::{
    db::WrapDatabaseRef,
    interpreter::{CallInputs, CreateInputs, Gas, InstructionResult, Interpreter},
    Database, EVMData, Inspector,
};

use crate::{
    trace::{Trace, TraceCollector},
    SyncDatabase,
};

// TODO: Improve this design by introducing a InspectorMut trait

/// Inspector that allows two inspectors to operate side-by-side. The immutable
/// inspector runs first, followed by the mutable inspector. To ensure both
/// inspectors observe a valid state, you have to ensure that only the mutable
/// inspector modifies state. The returned values are solely determined by the
/// mutable inspector.
#[derive(Debug)]
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
        interp: &mut Interpreter,
        data: &mut EVMData<'_, DB>,
    ) -> InstructionResult {
        self.immutable.initialize_interp(interp, data);
        self.mutable.initialize_interp(interp, data)
    }

    fn step(&mut self, interp: &mut Interpreter, data: &mut EVMData<'_, DB>) -> InstructionResult {
        self.immutable.step(interp, data);
        self.mutable.step(interp, data)
    }

    fn log(
        &mut self,
        evm_data: &mut EVMData<'_, DB>,
        address: &Address,
        topics: &[B256],
        data: &Bytes,
    ) {
        self.immutable.log(evm_data, address, topics, data);
        self.mutable.log(evm_data, address, topics, data);
    }

    fn step_end(
        &mut self,
        interp: &mut Interpreter,
        data: &mut EVMData<'_, DB>,
        eval: InstructionResult,
    ) -> InstructionResult {
        self.immutable.step_end(interp, data, eval);
        self.mutable.step_end(interp, data, eval)
    }

    fn call(
        &mut self,
        data: &mut EVMData<'_, DB>,
        inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, Bytes) {
        self.immutable.call(data, inputs);
        self.mutable.call(data, inputs)
    }

    fn call_end(
        &mut self,
        data: &mut EVMData<'_, DB>,
        inputs: &CallInputs,
        remaining_gas: Gas,
        ret: InstructionResult,
        out: Bytes,
    ) -> (InstructionResult, Gas, Bytes) {
        self.immutable
            .call_end(data, inputs, remaining_gas, ret, out.clone());
        self.mutable.call_end(data, inputs, remaining_gas, ret, out)
    }

    fn create(
        &mut self,
        data: &mut EVMData<'_, DB>,
        inputs: &mut CreateInputs,
    ) -> (InstructionResult, Option<Address>, Gas, Bytes) {
        self.immutable.create(data, inputs);
        self.mutable.create(data, inputs)
    }

    fn create_end(
        &mut self,
        data: &mut EVMData<'_, DB>,
        inputs: &CreateInputs,
        ret: InstructionResult,
        address: Option<Address>,
        remaining_gas: Gas,
        out: Bytes,
    ) -> (InstructionResult, Option<Address>, Gas, Bytes) {
        self.immutable
            .create_end(data, inputs, ret, address, remaining_gas, out.clone());
        self.mutable
            .create_end(data, inputs, ret, address, remaining_gas, out)
    }

    fn selfdestruct(&mut self, contract: Address, target: Address, value: U256) {
        self.immutable.selfdestruct(contract, target, value);
        self.mutable.selfdestruct(contract, target, value);
    }
}

/// Container for storing inspector and tracer.
pub enum InspectorContainer<'inspector, BlockchainErrorT, StateErrorT>
where
    BlockchainErrorT: Debug,
    StateErrorT: Debug,
{
    /// No inspector or tracer.
    None,
    /// Only a tracer.
    Collector(TraceCollector),
    /// Both a tracer and an inspector.
    Dual(
        DualInspector<
            TraceCollector,
            &'inspector mut dyn Inspector<
                WrapDatabaseRef<
                    &'inspector SyncDatabase<'inspector, 'inspector, BlockchainErrorT, StateErrorT>,
                >,
            >,
            WrapDatabaseRef<
                &'inspector SyncDatabase<'inspector, 'inspector, BlockchainErrorT, StateErrorT>,
            >,
        >,
    ),
    /// Only an inspector.
    Inspector(
        &'inspector mut dyn Inspector<
            WrapDatabaseRef<
                &'inspector SyncDatabase<'inspector, 'inspector, BlockchainErrorT, StateErrorT>,
            >,
        >,
    ),
}

impl<'inspector, BlockchainErrorT, StateErrorT>
    InspectorContainer<'inspector, BlockchainErrorT, StateErrorT>
where
    BlockchainErrorT: Debug + Send,
    StateErrorT: Debug + Send,
{
    /// Constructs a new instance.
    pub fn new(
        with_trace: bool,
        tracer: Option<
            &'inspector mut dyn Inspector<
                WrapDatabaseRef<
                    &'inspector SyncDatabase<'inspector, 'inspector, BlockchainErrorT, StateErrorT>,
                >,
            >,
        >,
    ) -> Self {
        if with_trace {
            if let Some(tracer) = tracer {
                InspectorContainer::Dual(DualInspector::new(TraceCollector::default(), tracer))
            } else {
                InspectorContainer::Collector(TraceCollector::default())
            }
        } else if let Some(tracer) = tracer {
            InspectorContainer::Inspector(tracer)
        } else {
            InspectorContainer::None
        }
    }

    /// Returns the inspector, if it exists.
    pub fn as_dyn_inspector(
        &mut self,
    ) -> Option<
        &mut dyn Inspector<
            WrapDatabaseRef<
                &'inspector SyncDatabase<'inspector, 'inspector, BlockchainErrorT, StateErrorT>,
            >,
        >,
    > {
        match self {
            InspectorContainer::None => None,
            InspectorContainer::Collector(c) => Some(c),
            InspectorContainer::Dual(d) => Some(d),
            InspectorContainer::Inspector(t) => Some(t),
        }
    }

    /// Returns the tracer, if it exists.
    pub fn into_tracer(self) -> Option<TraceCollector> {
        match self {
            InspectorContainer::None | InspectorContainer::Inspector(_) => None,
            InspectorContainer::Collector(c) => Some(c),
            InspectorContainer::Dual(d) => Some(d.into_parts().0),
        }
    }

    /// Clears and returns the trace, if it exists.
    pub fn clear_trace(&mut self) -> Option<Trace> {
        match self {
            InspectorContainer::None | InspectorContainer::Inspector(_) => None,
            InspectorContainer::Collector(collector) => {
                let tracer = std::mem::take(collector);
                Some(tracer.into_trace())
            }
            InspectorContainer::Dual(dual) => {
                let tracer = std::mem::take(&mut dual.immutable);
                Some(tracer.into_trace())
            }
        }
    }
}
