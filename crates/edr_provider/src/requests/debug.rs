use core::fmt::Debug;

use edr_eth::{
    remote::{eth::CallRequest, BlockSpec},
    B256,
};
use edr_evm::{state::StateOverrides, DebugTraceResult};
use serde::{Deserialize, Deserializer};

use crate::{
    data::ProviderData,
    requests::{
        eth::{resolve_block_spec_for_call_request, resolve_call_request},
        validation::validate_call_request,
    },
    ProviderError,
};

pub fn handle_debug_trace_transaction<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    transaction_hash: B256,
    config: Option<DebugTraceConfig>,
) -> Result<DebugTraceResult, ProviderError<LoggerErrorT>> {
    data.debug_trace_transaction(
        &transaction_hash,
        config.map(Into::into).unwrap_or_default(),
    )
    .map_err(|error| match error {
        ProviderError::InvalidTransactionHash(tx_hash) => ProviderError::InvalidInput(format!(
            "Unable to find a block containing transaction {tx_hash}"
        )),
        _ => error,
    })
}

pub fn handle_debug_trace_call<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    call_request: CallRequest,
    block_spec: Option<BlockSpec>,
    config: Option<DebugTraceConfig>,
) -> Result<DebugTraceResult, ProviderError<LoggerErrorT>> {
    let block_spec = resolve_block_spec_for_call_request(block_spec);
    validate_call_request(data.spec_id(), &call_request, &block_spec)?;

    let transaction =
        resolve_call_request(data, call_request, &block_spec, &StateOverrides::default())?;
    data.debug_trace_call(
        transaction,
        &block_spec,
        config.map(Into::into).unwrap_or_default(),
    )
}

/// Config options for `debug_traceTransaction`
#[derive(Clone, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugTraceConfig {
    /// Which tracer to use. This argument is currently unsupported.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(deserialize_with = "deserialize_tracer")]
    #[serde(default)]
    pub tracer: Option<Tracer>,
    /// Disable storage trace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    pub disable_storage: Option<bool>,
    /// Disable memory trace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    pub disable_memory: Option<bool>,
    /// Disable stack trace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    pub disable_stack: Option<bool>,
}

#[derive(Clone, Debug, Default, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum Tracer {
    #[default]
    #[serde(rename = "default")]
    Default,
}

fn deserialize_tracer<'de, DeserializerT>(
    deserializer: DeserializerT,
) -> Result<Option<Tracer>, DeserializerT::Error>
where
    DeserializerT: Deserializer<'de>,
{
    const HARDHAT_ERROR: &str = "Hardhat currently only supports the default tracer, so no tracer parameter should be passed.";

    let tracer = Option::<Tracer>::deserialize(deserializer)
        .map_err(|_error| serde::de::Error::custom(HARDHAT_ERROR))?;

    if tracer.is_some() {
        Err(serde::de::Error::custom(HARDHAT_ERROR))
    } else {
        Ok(tracer)
    }
}

impl From<DebugTraceConfig> for edr_evm::DebugTraceConfig {
    fn from(value: DebugTraceConfig) -> Self {
        let DebugTraceConfig {
            disable_storage,
            disable_memory,
            disable_stack,
            // Tracer argument is not supported by Hardhat
            tracer: _,
        } = value;
        Self {
            disable_storage: disable_storage.unwrap_or_default(),
            disable_memory: disable_memory.unwrap_or_default(),
            disable_stack: disable_stack.unwrap_or_default(),
        }
    }
}
