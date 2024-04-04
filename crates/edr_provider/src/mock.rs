use std::sync::Arc;

use dyn_clone::DynClone;
use edr_eth::{Address, Bytes};
use edr_evm::{
    db::Database,
    evm::{EvmHandler, FrameOrResult, FrameResult},
    interpreter::{CallOutcome, Gas, InstructionResult, InterpreterResult},
    EVMError, GetContextData,
};

/// The result of executing a call override.
#[derive(Debug)]
pub struct CallOverrideResult {
    pub output: Bytes,
    pub should_revert: bool,
}

pub trait SyncCallOverride:
    Fn(Address, Bytes) -> Option<CallOverrideResult> + DynClone + Send + Sync
{
}

impl<F> SyncCallOverride for F where
    F: Fn(Address, Bytes) -> Option<CallOverrideResult> + DynClone + Send + Sync
{
}

dyn_clone::clone_trait_object!(SyncCallOverride);

/// Registers the `Mocker`'s handles.
pub fn register_mocking_handles<DatabaseT: Database, ContextT: GetContextData<Mocker>>(
    handler: &mut EvmHandler<'_, ContextT, DatabaseT>,
) {
    let old_handle = handler.execution.call.clone();
    handler.execution.call = Arc::new(
        move |ctx, inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            let mocker = ctx.external.get_context_data();
            if let Some(CallOverrideResult {
                output,
                should_revert,
            }) = mocker.override_call(inputs.contract, inputs.input.clone())
            {
                let result = if should_revert {
                    InstructionResult::Revert
                } else {
                    InstructionResult::Return
                };

                Ok(FrameOrResult::Result(FrameResult::Call(CallOutcome::new(
                    InterpreterResult {
                        result,
                        output,
                        gas: Gas::new(inputs.gas_limit),
                    },
                    inputs.return_memory_offset,
                ))))
            } else {
                old_handle(ctx, inputs)
            }
        },
    );
}

pub struct Mocker {
    call_override: Option<Arc<dyn SyncCallOverride>>,
}

impl Mocker {
    /// Constructs a new instance with the provided call override.
    pub fn new(call_override: Option<Arc<dyn SyncCallOverride>>) -> Self {
        Self { call_override }
    }

    fn override_call(&self, contract: Address, input: Bytes) -> Option<CallOverrideResult> {
        self.call_override.as_ref().and_then(|f| f(contract, input))
    }
}
