use napi::bindgen_prelude::{BigInt, Buffer};
use napi::Status;
use napi_derive::napi;
use rethnet_eth::B256;
use rethnet_evm::{BlockEnv, CfgEnv};

use crate::transaction::TransactionRequest;
use crate::{
    block::BlockConfig, blockchain::Blockchain, config::ConfigOptions, state::StateManager,
};

// TODO handle the `RpcDebugTracingConfig` argument from `VmAdapter`
/// Get trace output for `debug_traceTransaction`
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn debug_trace_transaction(
    blockchain: &Blockchain,
    state_manager: &StateManager,
    cfg: ConfigOptions,
    block_config: BlockConfig,
    transactions: Vec<TransactionRequest>,
    transaction_hash: Buffer,
) -> napi::Result<DebugTraceResult> {
    let cfg = CfgEnv::try_from(cfg)?;
    let block_env = BlockEnv::try_from(block_config)?;
    // TODO this panics if the buffer is not 32 bytes
    let transaction_hash = B256::from_slice(&transaction_hash);

    let transactions = transactions
        .into_iter()
        .map(rethnet_eth::transaction::TransactionRequest::try_from)
        .collect::<Result<Vec<_>, _>>()?;

    rethnet_evm::debug_trace_transaction(
        &*blockchain.read().await,
        &mut *state_manager.write().await,
        cfg,
        block_env,
        transactions,
        transaction_hash,
    )
    .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
    .try_into()
}

#[napi(object)]
pub struct DebugTraceResult {
    #[napi(readonly)]
    pub failed: bool,
    #[napi(readonly)]
    pub gas_used: BigInt,
    #[napi(readonly)]
    pub output: Option<Buffer>,
    #[napi(readonly)]
    pub struct_logs: Vec<DebugTraceLogItem>,
}

impl TryFrom<rethnet_evm::DebugTraceResult> for DebugTraceResult {
    type Error = napi::Error;

    fn try_from(value: rethnet_evm::DebugTraceResult) -> Result<Self, Self::Error> {
        let output = if let Some(output) = value.output {
            Some(Buffer::from(output.as_ref()))
        } else {
            None
        };
        Ok(Self {
            failed: value.failed,
            gas_used: value.gas_used.try_into()?,
            output: output,
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
    #[napi(readonly)]
    pub pc: BigInt,
    // Op code
    #[napi(readonly)]
    pub op: u8,
    /// Gas left before executing this operation as hex number.
    #[napi(readonly)]
    pub gas: String,
    /// Gas cost of this operation as hex number.
    #[napi(readonly)]
    pub gas_cost: String,
    /// Array of all values (hex numbers) on the stack
    #[napi(readonly)]
    pub stack: Vec<String>,
    /// Depth of the call stack
    #[napi(readonly)]
    pub depth: BigInt,
    /// Data returned by function call as hex string.
    #[napi(readonly)]
    pub return_data: String,
    /// Amount of global gas refunded as hex number.
    #[napi(readonly)]
    pub refund: String,
    /// Size of memory array
    #[napi(readonly)]
    pub mem_size: BigInt,
    /// Name of the operation
    #[napi(readonly)]
    pub op_name: Option<String>,
}

impl TryFrom<rethnet_evm::DebugTraceLogItem> for DebugTraceLogItem {
    type Error = napi::Error;

    fn try_from(value: rethnet_evm::DebugTraceLogItem) -> Result<Self, Self::Error> {
        Ok(Self {
            pc: value.pc.try_into()?,
            op: value.op,
            gas: value.gas,
            gas_cost: value.gas_cost,
            stack: value.stack,
            depth: value.depth.try_into()?,
            return_data: value.return_data,
            refund: value.refund,
            mem_size: value.mem_size.try_into()?,
            op_name: None,
        })
    }
}
