use std::ops::Deref;

use napi::{bindgen_prelude::Either3, Env};
use napi_derive::napi;

use crate::{
    block::Block,
    trace::{TracingMessage, TracingMessageResult, TracingStep},
    transaction::result::ExecutionResult,
};

#[napi]
pub struct MineBlockResult {
    inner: rethnet_evm::MineBlockResult,
}

impl Deref for MineBlockResult {
    type Target = rethnet_evm::MineBlockResult;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl From<rethnet_evm::MineBlockResult> for MineBlockResult {
    fn from(value: rethnet_evm::MineBlockResult) -> Self {
        Self { inner: value }
    }
}

#[napi]
impl MineBlockResult {
    #[doc = "Retrieves the mined block."]
    #[napi(getter)]
    pub fn block(&self) -> Block {
        Block::from(self.block.clone())
    }

    #[doc = "Retrieves the transactions' results."]
    #[napi(getter)]
    pub fn results(&self, env: Env) -> napi::Result<Vec<ExecutionResult>> {
        self.transaction_results
            .iter()
            .map(|result| ExecutionResult::new(&env, result))
            .collect()
    }

    #[doc = "Retrieves the transactions' traces."]
    #[napi(getter)]
    pub fn traces(
        &self,
        env: Env,
    ) -> napi::Result<Vec<Vec<Either3<TracingMessage, TracingStep, TracingMessageResult>>>> {
        self.transaction_traces
            .iter()
            .map(|trace| {
                trace
                    .messages
                    .iter()
                    .map(|message| match message {
                        rethnet_evm::trace::TraceMessage::Before(message) => {
                            TracingMessage::new(&env, message).map(Either3::A)
                        }
                        rethnet_evm::trace::TraceMessage::Step(step) => {
                            Ok(Either3::B(TracingStep::new(step)))
                        }
                        rethnet_evm::trace::TraceMessage::After(result) => {
                            ExecutionResult::new(&env, result).map(|execution_result| {
                                Either3::C(TracingMessageResult { execution_result })
                            })
                        }
                    })
                    .collect()
            })
            .collect()
    }
}
