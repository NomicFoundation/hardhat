use std::mem;

use napi::{bindgen_prelude::Buffer, Env, JsBuffer, JsBufferValue};
use napi_derive::napi;

/// Ethereum log.
#[napi(object)]
pub struct Log {
    pub address: Buffer,
    pub topics: Vec<Buffer>,
    pub data: JsBuffer,
}

impl Log {
    pub fn with_evm_log(env: &Env, log: &rethnet_evm::Log) -> napi::Result<Self> {
        let topics = log
            .topics
            .iter()
            .map(|topic| Buffer::from(topic.as_bytes()))
            .collect();

        let data = log.data.clone();
        let data = unsafe {
            env.create_buffer_with_borrowed_data(
                data.as_ptr(),
                data.len(),
                data,
                |data: rethnet_eth::Bytes, _env| {
                    mem::drop(data);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            address: Buffer::from(log.address.as_bytes()),
            topics,
            data,
        })
    }

    pub fn with_eth_log(env: &Env, log: &rethnet_eth::log::Log) -> napi::Result<Self> {
        let topics = log
            .topics
            .iter()
            .map(|topic| Buffer::from(topic.as_bytes()))
            .collect();

        let data = log.data.clone();
        let data = unsafe {
            env.create_buffer_with_borrowed_data(
                data.as_ptr(),
                data.len(),
                data,
                |data: rethnet_eth::Bytes, _env| {
                    mem::drop(data);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            address: Buffer::from(log.address.as_bytes()),
            topics,
            data,
        })
    }
}
