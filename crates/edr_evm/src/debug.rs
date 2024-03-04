use auto_impl::auto_impl;
use revm::{handler::register::HandleRegister, Database};

pub struct DebugContext<DatabaseT: Database, DebugDataT> {
    pub data: DebugDataT,
    pub register_handles_fn: HandleRegister<DebugDataT, DatabaseT>,
}

/// Trait for getting contextual data.
#[auto_impl(&mut)]
pub trait GetContextData<DataT> {
    /// Retrieves the contextual data.
    fn get_context_data(&mut self) -> &mut DataT;
}
