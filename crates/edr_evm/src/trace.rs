use std::{cell::RefCell, fmt::Debug, rc::Rc, sync::Arc};

use edr_eth::{Address, Bytes, U256};
use revm::{
    handler::register::EvmHandler,
    interpreter::{
        opcode::{self, BoxedInstruction, InstructionTables},
        return_revert, CallInputs, CallOutcome, CreateInputs, CreateOutcome, InstructionResult,
        Interpreter, SuccessOrHalt,
    },
    primitives::{Bytecode, EVMError, ExecutionResult, Output},
    Database, Evm, EvmContext, FrameOrResult, FrameResult,
};

use crate::debug::GetContextData;

/// Registers trace collector handles to the EVM handler.
pub fn register_trace_collector_handles<
    DatabaseT: Database,
    ContextT: GetContextData<TraceCollector>,
>(
    handler: &mut EvmHandler<'_, ContextT, DatabaseT>,
) where
    DatabaseT::Error: Debug,
{
    // Every instruction inside flat table that is going to be wrapped by tracer
    // calls.
    let table = handler
        .instruction_table
        .take()
        .expect("Handler must have instruction table");

    let table = match table {
        InstructionTables::Plain(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
        InstructionTables::Boxed(table) => table
            .into_iter()
            .map(|i| instruction_handler(i))
            .collect::<Vec<_>>(),
    };

    // cast vector to array.
    handler.instruction_table = Some(InstructionTables::Boxed(
        table.try_into().unwrap_or_else(|_| unreachable!()),
    ));

    // call and create input stack shared between handlers. They are used to share
    // inputs in *_end Inspector calls.
    let call_input_stack = Rc::<RefCell<Vec<_>>>::new(RefCell::new(Vec::new()));
    let create_input_stack = Rc::<RefCell<Vec<_>>>::new(RefCell::new(Vec::new()));

    // Create handler
    let create_input_stack_inner = create_input_stack.clone();
    let old_handle = handler.execution.create.clone();
    handler.execution.create = Arc::new(
        move |ctx, inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            let tracer = ctx.external.get_context_data();
            tracer.create(&ctx.evm, &inputs);

            create_input_stack_inner.borrow_mut().push(inputs.clone());

            old_handle(ctx, inputs)
        },
    );

    // Call handler
    let call_input_stack_inner = call_input_stack.clone();
    let old_handle = handler.execution.call.clone();
    handler.execution.call = Arc::new(
        move |ctx, inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            let tracer = ctx.external.get_context_data();
            tracer.call(&mut ctx.evm, &inputs);

            call_input_stack_inner.borrow_mut().push(inputs.clone());

            old_handle(ctx, inputs)
        },
    );

    // call outcome
    let call_input_stack_inner = call_input_stack.clone();
    let old_handle = handler.execution.insert_call_outcome.clone();
    handler.execution.insert_call_outcome = Arc::new(
        move |ctx: &mut revm::Context<ContextT, DatabaseT>, frame, shared_memory, outcome| {
            let call_inputs = call_input_stack_inner.borrow_mut().pop().unwrap();

            let tracer = ctx.external.get_context_data();
            tracer.call_end(&ctx.evm, &call_inputs, &outcome);

            old_handle(ctx, frame, shared_memory, outcome)
        },
    );

    // create outcome
    let create_input_stack_inner = create_input_stack.clone();
    let old_handle = handler.execution.insert_create_outcome.clone();
    handler.execution.insert_create_outcome = Arc::new(move |ctx, frame, outcome| {
        let create_inputs = create_input_stack_inner.borrow_mut().pop().unwrap();

        let tracer = ctx.external.get_context_data();
        tracer.create_end(&ctx.evm, &create_inputs, &outcome);

        old_handle(ctx, frame, outcome)
    });

    // last frame outcome
    let old_handle = handler.execution.last_frame_return.clone();
    handler.execution.last_frame_return = Arc::new(move |ctx, frame_result| {
        let tracer = ctx.external.get_context_data();
        match frame_result {
            FrameResult::Call(outcome) => {
                let call_inputs = call_input_stack.borrow_mut().pop().unwrap();
                tracer.call_transaction_end(&ctx.evm, &call_inputs, outcome);
            }
            FrameResult::Create(outcome) => {
                let create_inputs = create_input_stack.borrow_mut().pop().unwrap();
                tracer.create_transaction_end(&ctx.evm, &create_inputs, outcome);
            }
        }
        old_handle(ctx, frame_result)
    });
}

/// Outer closure that calls tracer for every instruction.
fn instruction_handler<
    'a,
    ContextT: GetContextData<TraceCollector>,
    DatabaseT: Database,
    Instruction: Fn(&mut Interpreter, &mut Evm<'a, ContextT, DatabaseT>) + 'a,
>(
    instruction: Instruction,
) -> BoxedInstruction<'a, Evm<'a, ContextT, DatabaseT>> {
    Box::new(
        move |interpreter: &mut Interpreter, host: &mut Evm<'a, ContextT, DatabaseT>| {
            // SAFETY: as the PC was already incremented we need to subtract 1 to preserve
            // the old Inspector behavior.
            interpreter.instruction_pointer = unsafe { interpreter.instruction_pointer.sub(1) };

            host.context
                .external
                .get_context_data()
                .step(interpreter, &host.context.evm);

            // return PC to old value
            interpreter.instruction_pointer = unsafe { interpreter.instruction_pointer.add(1) };

            // execute instruction.
            instruction(interpreter, host);
        },
    )
}

/// Stack tracing message
#[derive(Clone, Debug)]
pub enum TraceMessage {
    /// Event that occurs before a call or create message.
    Before(BeforeMessage),
    /// Event that occurs every step of a call or create message.
    Step(Step),
    /// Event that occurs after a call or create message.
    After(ExecutionResult),
}

/// Temporary before message type for handling traces
#[derive(Clone, Debug)]
pub struct BeforeMessage {
    /// Call depth
    pub depth: usize,
    /// Caller
    pub caller: Address,
    /// Callee
    pub to: Option<Address>,
    /// Transaction gas limit
    pub gas_limit: u64,
    /// Input data
    pub data: Bytes,
    /// Value
    pub value: U256,
    /// Code address
    pub code_address: Option<Address>,
    /// Bytecode
    pub code: Option<Bytecode>,
}

/// A trace for an EVM call.
#[derive(Clone, Debug, Default)]
pub struct Trace {
    // /// The individual steps of the call
    // pub steps: Vec<Step>,
    /// Messages
    pub messages: Vec<TraceMessage>,
    /// The return value of the call
    pub return_value: Bytes,
}

/// A single EVM step.
#[derive(Clone, Debug)]
pub struct Step {
    /// The program counter
    pub pc: u64,
    /// The call depth
    pub depth: u64,
    /// The executed op code
    pub opcode: u8,
    /// The top entry on the stack. None if the stack is empty.
    pub stack_top: Option<U256>,
    // /// The amount of gas that was used by the step
    // pub gas_cost: u64,
    // /// The amount of gas that was refunded by the step
    // pub gas_refunded: i64,
    // /// The contract being executed
    // pub contract: AccountInfo,
    // /// The address of the contract
    // pub contract_address: Address,
}

impl Trace {
    /// Adds a before message
    pub fn add_before(&mut self, message: BeforeMessage) {
        self.messages.push(TraceMessage::Before(message));
    }

    /// Adds a result message
    pub fn add_after(&mut self, result: ExecutionResult) {
        self.messages.push(TraceMessage::After(result));
    }

    /// Adds a VM step to the trace.
    pub fn add_step(&mut self, depth: u64, pc: usize, opcode: u8, stack_top: Option<U256>) {
        self.messages.push(TraceMessage::Step(Step {
            pc: pc as u64,
            depth,
            opcode,
            stack_top,
        }));
    }
}

/// Object that gathers trace information during EVM execution and can be turned
/// into a trace upon completion.
#[derive(Debug)]
pub struct TraceCollector {
    traces: Vec<Trace>,
    pending_before: Option<BeforeMessage>,
    is_new_trace: bool,
}

impl TraceCollector {
    /// Converts the [`TraceCollector`] into its [`Trace`].
    pub fn into_traces(self) -> Vec<Trace> {
        self.traces
    }

    /// Returns the traces collected so far.
    pub fn traces(&self) -> &[Trace] {
        &self.traces
    }

    fn current_trace_mut(&mut self) -> &mut Trace {
        self.traces.last_mut().expect("Trace must have been added")
    }

    fn validate_before_message(&mut self) {
        if let Some(message) = self.pending_before.take() {
            self.current_trace_mut().add_before(message);
        }
    }

    fn call<DatabaseT: Database>(&mut self, data: &mut EvmContext<DatabaseT>, inputs: &CallInputs)
    where
        DatabaseT::Error: Debug,
    {
        if self.is_new_trace {
            self.is_new_trace = false;
            self.traces.push(Trace::default());
        }

        self.validate_before_message();

        // This needs to be split into two functions to avoid borrow checker issues
        #[allow(clippy::map_unwrap_or)]
        let code = data
            .journaled_state
            .state
            .get(&inputs.contract)
            .map(|account| account.info.clone())
            .map(|mut account_info| {
                if let Some(code) = account_info.code.take() {
                    code
                } else {
                    data.db.code_by_hash(account_info.code_hash).unwrap()
                }
            })
            .unwrap_or_else(|| {
                data.db.basic(inputs.contract).unwrap().map_or(
                    // If an invalid contract address was provided, return empty code
                    Bytecode::new(),
                    |account_info| {
                        account_info.code.unwrap_or_else(|| {
                            data.db.code_by_hash(account_info.code_hash).unwrap()
                        })
                    },
                )
            });

        self.pending_before = Some(BeforeMessage {
            depth: data.journaled_state.depth,
            caller: inputs.context.caller,
            to: Some(inputs.context.address),
            gas_limit: inputs.gas_limit,
            data: inputs.input.clone(),
            value: inputs.context.apparent_value,
            code_address: Some(inputs.context.code_address),
            code: Some(code),
        });
    }

    fn call_end<DatabaseT: Database>(
        &mut self,
        data: &EvmContext<DatabaseT>,
        _inputs: &CallInputs,
        outcome: &CallOutcome,
    ) {
        match outcome.instruction_result() {
            return_revert!() if self.pending_before.is_some() => {
                self.pending_before = None;
                return;
            }
            _ => (),
        }

        self.validate_before_message();

        let ret = *outcome.instruction_result();
        let safe_ret = if ret == InstructionResult::CallTooDeep
            || ret == InstructionResult::OutOfFunds
            || ret == InstructionResult::StateChangeDuringStaticCall
        {
            InstructionResult::Revert
        } else {
            ret
        };

        let result = match safe_ret.into() {
            SuccessOrHalt::Success(reason) => ExecutionResult::Success {
                reason,
                gas_used: outcome.gas().spend(),
                gas_refunded: outcome.gas().refunded() as u64,
                logs: data.journaled_state.logs.clone(),
                output: Output::Call(outcome.output().clone()),
            },
            SuccessOrHalt::Revert => ExecutionResult::Revert {
                gas_used: outcome.gas().spend(),
                output: outcome.output().clone(),
            },
            SuccessOrHalt::Halt(reason) => ExecutionResult::Halt {
                reason,
                gas_used: outcome.gas().limit(),
            },
            SuccessOrHalt::InternalContinue | SuccessOrHalt::InternalCallOrCreate => {
                panic!("Internal error: {safe_ret:?}")
            }
            SuccessOrHalt::FatalExternalError => panic!("Fatal external error"),
        };

        self.current_trace_mut().add_after(result);
    }

    fn create<DatabaseT: Database>(&mut self, data: &EvmContext<DatabaseT>, inputs: &CreateInputs) {
        if self.is_new_trace {
            self.is_new_trace = false;
            self.traces.push(Trace::default());
        }

        self.validate_before_message();

        self.pending_before = Some(BeforeMessage {
            depth: data.journaled_state.depth,
            caller: inputs.caller,
            to: None,
            gas_limit: inputs.gas_limit,
            data: inputs.init_code.clone(),
            value: inputs.value,
            code_address: None,
            code: None,
        });
    }

    fn create_end<DatabaseT: Database>(
        &mut self,
        data: &EvmContext<DatabaseT>,
        _inputs: &CreateInputs,
        outcome: &CreateOutcome,
    ) {
        self.validate_before_message();

        let ret = *outcome.instruction_result();
        let safe_ret =
            if ret == InstructionResult::CallTooDeep || ret == InstructionResult::OutOfFunds {
                InstructionResult::Revert
            } else {
                ret
            };

        let result = match safe_ret.into() {
            SuccessOrHalt::Success(reason) => ExecutionResult::Success {
                reason,
                gas_used: outcome.gas().spend(),
                gas_refunded: outcome.gas().refunded() as u64,
                logs: data.journaled_state.logs.clone(),
                output: Output::Create(outcome.output().clone(), outcome.address),
            },
            SuccessOrHalt::Revert => ExecutionResult::Revert {
                gas_used: outcome.gas().spend(),
                output: outcome.output().clone(),
            },
            SuccessOrHalt::Halt(reason) => ExecutionResult::Halt {
                reason,
                gas_used: outcome.gas().limit(),
            },
            SuccessOrHalt::InternalContinue | SuccessOrHalt::InternalCallOrCreate => {
                panic!("Internal error: {safe_ret:?}")
            }
            SuccessOrHalt::FatalExternalError => panic!("Fatal external error"),
        };

        self.current_trace_mut().add_after(result);
    }

    fn step<DatabaseT: Database>(&mut self, interp: &Interpreter, data: &EvmContext<DatabaseT>) {
        // Skip the step
        let skip_step = self.pending_before.as_ref().map_or(false, |message| {
            message.code.is_some() && interp.current_opcode() == opcode::STOP
        });

        self.validate_before_message();

        if !skip_step {
            self.current_trace_mut().add_step(
                data.journaled_state.depth(),
                interp.program_counter(),
                interp.current_opcode(),
                interp.stack.data().last().cloned(),
            );
        }
    }

    fn call_transaction_end<DatabaseT: Database>(
        &mut self,
        data: &EvmContext<DatabaseT>,
        inputs: &CallInputs,
        outcome: &CallOutcome,
    ) {
        self.is_new_trace = true;
        self.call_end(data, inputs, outcome);
    }

    fn create_transaction_end<DatabaseT: Database>(
        &mut self,
        data: &EvmContext<DatabaseT>,
        inputs: &CreateInputs,
        outcome: &CreateOutcome,
    ) {
        self.is_new_trace = true;
        self.create_end(data, inputs, outcome);
    }
}

impl Default for TraceCollector {
    fn default() -> Self {
        Self {
            traces: Vec::new(),
            pending_before: None,
            is_new_trace: true,
        }
    }
}

impl GetContextData<TraceCollector> for TraceCollector {
    fn get_context_data(&mut self) -> &mut TraceCollector {
        self
    }
}
