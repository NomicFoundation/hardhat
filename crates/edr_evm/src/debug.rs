use auto_impl::auto_impl;
use revm::db::{DatabaseComponents, StateRef, WrapDatabaseRef};

use crate::blockchain::SyncBlockchain;

/// Type for registering handles, specialised for EDR database component types.
pub type HandleRegister<'evm, BlockchainErrorT, DebugDataT, StateT> =
    revm::handler::register::HandleRegister<
        DebugDataT,
        WrapDatabaseRef<
            DatabaseComponents<
                StateT,
                &'evm dyn SyncBlockchain<BlockchainErrorT, <StateT as StateRef>::Error>,
            >,
        >,
    >;

/// Type for encapsulating contextual data and handler registration in an
/// `EvmBuilder`.
pub struct DebugContext<'evm, BlockchainErrorT, DebugDataT, StateT: StateRef> {
    /// The contextual data.
    pub data: DebugDataT,
    /// The function to register handles.
    pub register_handles_fn: HandleRegister<'evm, BlockchainErrorT, DebugDataT, StateT>,
}

pub struct EvmContext<'evm, BlockchainErrorT, DebugDataT, StateT: StateRef> {
    pub debug: Option<DebugContext<'evm, BlockchainErrorT, DebugDataT, StateT>>,
    pub state: StateT,
}

/// Trait for getting contextual data.
#[auto_impl(&mut)]
pub trait GetContextData<DataT> {
    /// Retrieves the contextual data.
    fn get_context_data(&mut self) -> &mut DataT;
}
