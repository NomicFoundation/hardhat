use napi::bindgen_prelude::{BigInt, Buffer};
use napi::Status;
use napi_derive::napi;
use rethnet_eth::B256;
use rethnet_evm::{BlockEnv, CfgEnv};
use std::collections::HashMap;

use crate::transaction::signed::SignedTransaction;
use crate::{
    block::BlockConfig, blockchain::Blockchain, cast::TryCast, config::ConfigOptions,
    state::StateManager,
};

/// Get trace output for `debug_traceTransaction`
#[napi]
#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub async fn debug_trace_transaction(
    blockchain: &Blockchain,
    state_manager: &StateManager,
    cfg: ConfigOptions,
    block_config: BlockConfig,
    transactions: Vec<SignedTransaction>,
    transaction_hash: Buffer,
) -> napi::Result<DebugTraceResult> {
    let cfg = CfgEnv::try_from(cfg)?;
    let block_env = BlockEnv::try_from(block_config)?;
    let transaction_hash = TryCast::<B256>::try_cast(transaction_hash)?;

    let transactions = transactions
        .into_iter()
        .map(TryCast::<rethnet_eth::transaction::SignedTransaction>::try_cast)
        .collect::<Result<Vec<_>, _>>()?;

    // TODO depends on https://github.com/NomicFoundation/hardhat/pull/4254
    // let state = { state_manager.read().await.clone() };

    let result = rethnet_evm::debug_trace_transaction(
        &*blockchain.read().await,
        &mut *state_manager.write().await,
        cfg,
        block_env,
        transactions,
        transaction_hash,
    )
    .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
    .try_into()?;
    Ok(result)
}

#[napi(object)]
pub struct DebugTraceResult {
    pub pass: bool,
    pub gas_used: BigInt,
    pub output: Option<Buffer>,
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
    pub stack: Vec<String>,
    /// Depth of the call stack
    pub depth: BigInt,
    /// Size of memory array
    pub mem_size: BigInt,
    /// Name of the operation
    pub op_name: String,
    /// Description of an error as a hex string.
    pub error: Option<String>,
    /// Array of all allocated values as hex strings.
    pub memory: Vec<String>,
    /// Map of all stored values with keys and values encoded as hex strings.
    pub storage: HashMap<String, String>,
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
            mem_size: value.mem_size.try_into()?,
            op_name: value.op_name,
            error: value.error,
            memory: value.memory,
            storage: value.storage,
        })
    }
}
