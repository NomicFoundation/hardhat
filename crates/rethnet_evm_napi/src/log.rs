use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

/// Ethereum log.
#[napi(object)]
pub struct Log {
    pub address: Buffer,
    pub topics: Vec<Buffer>,
    pub data: Buffer,
}

impl From<rethnet_evm::Log> for Log {
    fn from(log: rethnet_evm::Log) -> Self {
        let topics = log
            .topics
            .into_iter()
            .map(|topic| Buffer::from(topic.as_bytes()))
            .collect();

        Self {
            address: Buffer::from(log.address.as_bytes()),
            topics,
            data: Buffer::from(log.data.as_ref()),
        }
    }
}
