use revm::{
    db::{DatabaseComponents, WrapDatabaseRef},
    handler::register,
};

use crate::{blockchain::SyncBlockchain, state::SyncState};

pub type HandleRegister<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>
where
    'blockchain: 'register,
    'state: 'register,
= register::HandleRegister<
    'register,
    DebugDataT,
    WrapDatabaseRef<
        DatabaseComponents<
            &'state dyn SyncState<StateErrorT>,
            &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
        >,
    >,
>;

pub struct DebugContext<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>
where
    'blockchain: 'register,
    'state: 'register,
{
    pub data: DebugDataT,
    pub handle_registers: Vec<
        HandleRegister<'blockchain, 'register, 'state, DebugDataT, BlockchainErrorT, StateErrorT>,
    >,
}

/// Trait for getting contextual data.
pub trait GetContextData<DataT> {
    /// Retrieves the contextual data.
    fn get_context_data(&mut self) -> &mut DataT;
}
