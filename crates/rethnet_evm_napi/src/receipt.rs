use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env,
};
use napi_derive::napi;

use crate::log::Log;

#[napi(object)]
pub struct Receipt {
    pub status_code: u8,
    pub gas_used: BigInt,
    pub logs_bloom: Buffer,
    pub logs: Vec<Log>,
}

impl Receipt {
    pub fn new(env: &Env, receipt: &rethnet_eth::receipt::TypedReceipt) -> napi::Result<Self> {
        match receipt {
            rethnet_eth::receipt::TypedReceipt::Legacy(receipt)
            | rethnet_eth::receipt::TypedReceipt::EIP2930(receipt)
            | rethnet_eth::receipt::TypedReceipt::EIP1559(receipt) => {
                let logs = receipt
                    .logs
                    .iter()
                    .map(|log| Log::with_eth_log(env, log))
                    .collect::<napi::Result<_>>()?;

                Ok(Self {
                    status_code: receipt.status_code,
                    gas_used: BigInt {
                        sign_bit: false,
                        words: receipt.gas_used.as_limbs().to_vec(),
                    },
                    logs_bloom: Buffer::from(receipt.logs_bloom.as_bytes()),
                    logs,
                })
            }
        }
    }
}
