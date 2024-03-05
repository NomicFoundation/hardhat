use auto_impl::auto_impl;
use revm::{handler::register::HandleRegister, Database};

pub struct DebugContext<DatabaseT: Database, DebugDataT> {
    pub data: DebugDataT,
    pub register_handles_fn: HandleRegister<DebugDataT, DatabaseT>,
}

impl<DatabaseT: Database, DebugDataT: Clone> Clone for DebugContext<DatabaseT, DebugDataT> {
    fn clone(&self) -> Self {
        Self {
            data: self.data.clone(),
            register_handles_fn: self.register_handles_fn.clone(),
        }
    }
}

impl<DatabaseT: Database, DebugDataT: Copy> Copy for DebugContext<DatabaseT, DebugDataT> {}

/// Trait for getting contextual data.
#[auto_impl(&mut)]
pub trait GetContextData<DataT> {
    /// Retrieves the contextual data.
    fn get_context_data(&mut self) -> &mut DataT;
}
