use std::collections::HashMap;

use edr_eth::B256;
use edr_evm::{
    execution_result_to_debug_result, BlockEnv, CfgEnv, ResultAndState, TracerEip3155, TxEnv,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::runtime,
    Status,
};
use napi_derive::napi;

use crate::{
    block::BlockConfig,
    blockchain::Blockchain,
    cast::TryCast,
    config::ConfigOptions,
    state::State,
    transaction::{PendingTransaction, TransactionRequest},
};

/// Get trace output for `debug_traceTransaction`
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn debug_trace_transaction(
    blockchain: &Blockchain,
    state: &State,
    evm_config: ConfigOptions,
    trace_config: DebugTraceConfig,
    block_config: BlockConfig,
    // Need to take reference as `FromNapiValue` is not implemented for `PendingTransaction`
    transactions: Vec<&PendingTransaction>,
    transaction_hash: Buffer,
) -> napi::Result<DebugTraceResult> {
    let evm_config = CfgEnv::try_from(evm_config)?;
    let block_env = BlockEnv::try_from(block_config)?;
    let transaction_hash = TryCast::<B256>::try_cast(transaction_hash)?;

    let transactions: Vec<edr_evm::ExecutableTransaction> =
        transactions.into_iter().map(|tx| (*tx).clone()).collect();

    let blockchain = (*blockchain).clone();
    let state = (*state).clone();

    runtime::Handle::current()
        .spawn_blocking(move || {
            edr_evm::debug_trace_transaction(
                &*blockchain.read(),
                state.read().clone(),
                evm_config,
                trace_config.into(),
                block_env,
                transactions,
                &transaction_hash,
            )
            .map_or_else(
                |error| Err(napi::Error::new(Status::GenericFailure, error.to_string())),
                TryInto::try_into,
            )
        })
        .await
        .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
}

/// Get trace output for `debug_traceTransaction`
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn debug_trace_call(
    blockchain: &Blockchain,
    state: &State,
    evm_config: ConfigOptions,
    trace_config: DebugTraceConfig,
    block_config: BlockConfig,
    transaction: TransactionRequest,
) -> napi::Result<DebugTraceResult> {
    let evm_config = CfgEnv::try_from(evm_config)?;
    let block = BlockEnv::try_from(block_config)?;
    let transaction = TxEnv::try_from(transaction)?;

    let mut tracer = TracerEip3155::new(trace_config.into());

    let blockchain = (*blockchain).clone();
    let state = (*state).clone();

    runtime::Handle::current()
        .spawn_blocking(move || {
            let ResultAndState {
                result: execution_result,
                ..
            } = edr_evm::guaranteed_dry_run(
                &*blockchain.read(),
                &*state.read(),
                &edr_evm::state::StateOverrides::default(),
                evm_config,
                transaction,
                block,
                Some(&mut tracer),
            )
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?;

            execution_result_to_debug_result(execution_result, tracer).try_into()
        })
        .await
        .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))?
}

#[napi(object)]
pub struct DebugTraceConfig {
    pub disable_storage: Option<bool>,
    pub disable_memory: Option<bool>,
    pub disable_stack: Option<bool>,
}

impl From<DebugTraceConfig> for edr_evm::DebugTraceConfig {
    fn from(value: DebugTraceConfig) -> Self {
        Self {
            disable_storage: value.disable_storage.unwrap_or_default(),
            disable_memory: value.disable_memory.unwrap_or_default(),
            disable_stack: value.disable_stack.unwrap_or_default(),
        }
    }
}

#[napi(object)]
pub struct DebugTraceResult {
    pub pass: bool,
    pub gas_used: BigInt,
    pub output: Option<Buffer>,
    pub struct_logs: Vec<DebugTraceLogItem>,
}

impl TryFrom<edr_evm::DebugTraceResult> for DebugTraceResult {
    type Error = napi::Error;

    fn try_from(value: edr_evm::DebugTraceResult) -> Result<Self, Self::Error> {
        let output = value.output.map(|o| Buffer::from(o.as_ref()));
        Ok(Self {
            pass: value.pass,
            gas_used: value.gas_used.try_into()?,
            output,
            struct_logs: value
                .logs
                .into_iter()
                .map(DebugTraceLogItem::try_from)
                .collect::<Result<Vec<_>, _>>()?,
        })
    }
}

#[napi(object)]
pub struct DebugTraceLogItem {
    /// Program Counter
    pub pc: BigInt,
    // Op code
    pub op: u8,
    /// Gas left before executing this operation as hex number.
    pub gas: String,
    /// Gas cost of this operation as hex number.
    pub gas_cost: String,
    /// Array of all values (hex numbers) on the stack
    pub stack: Option<Vec<String>>,
    /// Depth of the call stack
    pub depth: BigInt,
    /// Size of memory array
    pub mem_size: BigInt,
    /// Name of the operation
    pub op_name: String,
    /// Description of an error as a hex string.
    pub error: Option<String>,
    /// Array of all allocated values as hex strings.
    pub memory: Option<Vec<String>>,
    /// Map of all stored values with keys and values encoded as hex strings.
    pub storage: Option<HashMap<String, String>>,
}

impl TryFrom<edr_evm::DebugTraceLogItem> for DebugTraceLogItem {
    type Error = napi::Error;

    fn try_from(value: edr_evm::DebugTraceLogItem) -> Result<Self, Self::Error> {
        Ok(Self {
            pc: value.pc.try_into()?,
            op: value.op,
            gas: value.gas,
            gas_cost: value.gas_cost,
            stack: value.stack,
            depth: value.depth.try_into()?,
            mem_size: value.mem_size.try_into()?,
            op_name: value.op_name,
            error: value.error,
            memory: value.memory,
            storage: value.storage,
        })
    }
}
