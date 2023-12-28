use std::mem;

use edr_eth::B256;
use napi::{bindgen_prelude::Buffer, Env, JsBuffer, JsBufferValue};
use napi_derive::napi;

use crate::cast::TryCast;

/// Ethereum execution log.
#[napi(object)]
pub struct ExecutionLog {
    pub address: Buffer,
    pub topics: Vec<Buffer>,
    pub data: JsBuffer,
}

impl ExecutionLog {
    pub fn new(env: &Env, log: &edr_evm::Log) -> napi::Result<Self> {
        let topics = log
            .topics
            .iter()
            .map(|topic| Buffer::from(topic.as_slice()))
            .collect();

        let data = log.data.clone();
        let data = unsafe {
            env.create_buffer_with_borrowed_data(
                data.as_ptr(),
                data.len(),
                data,
                |data: edr_eth::Bytes, _env| {
                    mem::drop(data);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            address: Buffer::from(log.address.as_slice()),
            topics,
            data,
        })
    }
}

impl TryCast<edr_evm::Log> for ExecutionLog {
    type Error = napi::Error;

    fn try_cast(self) -> Result<edr_evm::Log, Self::Error> {
        let address = edr_eth::Address::from_slice(self.address.as_ref());
        let topics = self
            .topics
            .into_iter()
            .map(TryCast::<B256>::try_cast)
            .collect::<napi::Result<_>>()?;

        let data = edr_eth::Bytes::copy_from_slice(self.data.into_value()?.as_ref());

        Ok(edr_evm::Log {
            address,
            topics,
            data,
        })
    }
}
