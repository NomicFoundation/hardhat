use core::fmt::Debug;

use edr_evm::{
    db::Database,
    evm::EvmHandler,
    trace::{register_trace_collector_handles, TraceCollector},
    GetContextData,
};

use crate::{
    console_log::{register_console_log_handles, ConsoleLogCollector},
    mock::{register_mocking_handles, Mocker},
};

/// Registers the EIP-3155 tracer handles.
pub fn register_debugger_handles<DatabaseT, ContextT>(
    handler: &mut EvmHandler<'_, ContextT, DatabaseT>,
) where
    DatabaseT: Database,
    DatabaseT::Error: Debug,
    ContextT: GetContextData<ConsoleLogCollector>
        + GetContextData<Mocker>
        + GetContextData<TraceCollector>,
{
    register_console_log_handles(handler);
    register_mocking_handles(handler);
    register_trace_collector_handles(handler);
}

pub struct Debugger {
    pub console_logger: ConsoleLogCollector,
    pub mocker: Mocker,
    pub trace_collector: TraceCollector,
}

impl Debugger {
    /// Creates a new instance with the provided mocker.
    pub fn with_mocker(mocker: Mocker) -> Self {
        Self {
            console_logger: ConsoleLogCollector::default(),
            mocker,
            trace_collector: TraceCollector::default(),
        }
    }
}

impl GetContextData<ConsoleLogCollector> for Debugger {
    fn get_context_data(&mut self) -> &mut ConsoleLogCollector {
        &mut self.console_logger
    }
}

impl GetContextData<Mocker> for Debugger {
    fn get_context_data(&mut self) -> &mut Mocker {
        &mut self.mocker
    }
}

impl GetContextData<TraceCollector> for Debugger {
    fn get_context_data(&mut self) -> &mut TraceCollector {
        &mut self.trace_collector
    }
}
