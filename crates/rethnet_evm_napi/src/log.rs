mod execution;

use std::mem;

use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

pub use execution::ExecutionLog;

enum LogType {
    Execution(rethnet_eth::log::Log),
    Full(rethnet_eth::log::FullBlockLog),
}

/// Ethereum log.
#[napi]
pub struct Log {
    inner: LogType,
}

impl From<rethnet_eth::log::FullBlockLog> for Log {
    fn from(inner: rethnet_eth::log::FullBlockLog) -> Self {
        Self {
            inner: LogType::Full(inner),
        }
    }
}

impl From<rethnet_eth::log::Log> for Log {
    fn from(inner: rethnet_eth::log::Log) -> Self {
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
            LogType::Execution(log) => log.address.as_bytes(),
            LogType::Full(log) => log.address.as_bytes(),
        })
    }

    #[doc = "Returns the hash of the block the log is included in."]
    #[napi(getter)]
    pub fn block_hash(&self) -> Option<Buffer> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Full(log) => Some(Buffer::from(log.block_hash.as_bytes())),
        }
    }

    #[doc = "Returns the number of the block the log is included in."]
    #[napi(getter)]
    pub fn block_number(&self) -> Option<BigInt> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Full(log) => Some(BigInt {
                sign_bit: false,
                words: log.block_number.as_limbs().to_vec(),
            }),
        }
    }

    #[doc = "Returns the data of the log."]
    #[napi(getter)]
    pub fn data(&self, env: Env) -> napi::Result<JsBuffer> {
        let data = match &self.inner {
            LogType::Execution(log) => log.data.clone(),
            LogType::Full(log) => log.data.clone(),
        };

        unsafe {
            env.create_buffer_with_borrowed_data(
                data.as_ptr(),
                data.len(),
                data,
                |data: rethnet_eth::Bytes, _env| {
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
            LogType::Full(log) => &log.topics,
        }
        .iter()
        .map(|topic| Buffer::from(topic.as_bytes()))
        .collect()
    }

    #[doc = "Returns the hash of the transaction the log is included in."]
    #[napi(getter)]
    pub fn transaction_hash(&self) -> Option<Buffer> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Full(log) => Some(Buffer::from(log.transaction_hash.as_bytes())),
        }
    }

    #[doc = "Returns the index of the transaction the log is included in."]
    #[napi(getter)]
    pub fn transaction_index(&self) -> Option<BigInt> {
        match &self.inner {
            LogType::Execution(_) => None,
            LogType::Full(log) => Some(BigInt::from(log.transaction_index)),
        }
    }
}
