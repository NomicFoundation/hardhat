use auto_impl::auto_impl;
use revm::{
    db::{BlockHashRef, DatabaseComponents, StateRef, WrapDatabaseRef},
    handler::register::HandleRegister,
    Database,
};

/// Type for encapsulating contextual data and handler registration in an
/// `EvmBuilder`.
pub struct DebugContext<DatabaseT: Database, DebugDataT> {
    /// The contextual data.
    pub data: DebugDataT,
    /// The function to register handles.
    pub register_handles_fn: HandleRegister<DebugDataT, DatabaseT>,
}

pub struct EvmContext<BlockchainT: BlockHashRef, DebugDataT, StateT: StateRef> {
    pub debug:
        Option<DebugContext<WrapDatabaseRef<DatabaseComponents<StateT, BlockchainT>>, DebugDataT>>,
    pub state: StateT,
}

/// Trait for getting contextual data.
#[auto_impl(&mut)]
pub trait GetContextData<DataT> {
    /// Retrieves the contextual data.
    fn get_context_data(&mut self) -> &mut DataT;
}
