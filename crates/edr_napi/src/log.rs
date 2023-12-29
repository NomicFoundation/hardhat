mod execution;

use std::mem;

pub use execution::ExecutionLog;
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

enum LogType {
    Execution(edr_eth::log::Log),
    Filter(edr_eth::log::FilterLog),
    Full(edr_eth::log::FullBlockLog),
}

/// Ethereum log.
#[napi]
pub struct Log {
    inner: LogType,
}

impl From<edr_eth::log::FilterLog> for Log {
    fn from(value: edr_eth::log::FilterLog) -> Self {
        Self {
            inner: LogType::Filter(value),
        }
    }
}

impl From<edr_eth::log::FullBlockLog> for Log {
    fn from(inner: edr_eth::log::FullBlockLog) -> Self {
        Self {
            inner: LogType::Full(inner),
        }
    }
}

impl From<edr_eth::log::Log> for Log {
    fn from(inner: edr_eth::log::Log) -> Self {
        Self {
            inner: LogType::Execution(inner),
        }
    }
}

#[napi]
impl Log {
    #[doc = "Returns the address of the log's originator."]
    #[napi(getter)]
    pub fn address(&self) -> Buffer {
        Buffer::from(match &self.inner {
            LogType::Execution(log) => log.address.as_slice(),
            LogType::Filter(log) => log.address.as_slice(),
            LogType::Full(log) => log.address.as_slice(),
        })
    }

    #[doc = "Returns the hash of the block the log is included in."]
    #[napi(getter)]
    pub fn block_hash(&self) -> Option<Buffer> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Filter(log) => Some(Buffer::from(log.block_hash.as_slice())),
            LogType::Full(log) => Some(Buffer::from(log.block_hash.as_slice())),
        }
    }

    #[doc = "Returns the number of the block the log is included in."]
    #[napi(getter)]
    pub fn block_number(&self) -> Option<BigInt> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Filter(log) => Some(BigInt::from(log.block_number)),
            LogType::Full(log) => Some(BigInt::from(log.block_number)),
        }
    }

    #[doc = "Returns the data of the log."]
    #[napi(getter)]
    pub fn data(&self, env: Env) -> napi::Result<JsBuffer> {
        let data = match &self.inner {
            LogType::Execution(log) => log.data.clone(),
            LogType::Filter(log) => log.data.clone(),
            LogType::Full(log) => log.data.clone(),
        };

        unsafe {
            env.create_buffer_with_borrowed_data(
                data.as_ptr(),
                data.len(),
                data,
                |data: edr_eth::Bytes, _env| {
                    mem::drop(data);
                },
            )
        }
        .map(JsBufferValue::into_raw)
    }

    #[doc = "Returns the index of the log within the block."]
    #[napi(getter)]
    pub fn log_index(&self) -> Option<BigInt> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Filter(log) => Some(BigInt::from(log.log_index)),
            LogType::Full(log) => Some(BigInt::from(log.log_index)),
        }
    }

    #[doc = "Returns whether the log was removed."]
    #[napi(getter)]
    #[allow(clippy::unused_self)]
    pub fn removed(&self) -> bool {
        false
    }

    #[doc = "Returns the topics of the log."]
    #[napi(getter)]
    pub fn topics(&self) -> Vec<Buffer> {
        match &self.inner {
            LogType::Execution(log) => &log.topics,
            LogType::Filter(log) => &log.topics,
            LogType::Full(log) => &log.topics,
        }
        .iter()
        .map(|topic| Buffer::from(topic.as_slice()))
        .collect()
    }

    #[doc = "Returns the hash of the transaction the log is included in."]
    #[napi(getter)]
    pub fn transaction_hash(&self) -> Option<Buffer> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Filter(log) => Some(Buffer::from(log.transaction_hash.as_slice())),
            LogType::Full(log) => Some(Buffer::from(log.transaction_hash.as_slice())),
        }
    }

    #[doc = "Returns the index of the transaction the log is included in."]
    #[napi(getter)]
    pub fn transaction_index(&self) -> Option<BigInt> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Filter(log) => Some(BigInt::from(log.transaction_index)),
            LogType::Full(log) => Some(BigInt::from(log.transaction_index)),
        }
    }
}
