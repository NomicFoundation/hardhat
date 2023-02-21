use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

use crate::log::Log;

#[napi(object)]
pub struct Receipt {
    pub cumulative_block_gas_used: BigInt,
    pub logs_bloom: Buffer,
    pub logs: Vec<Log>,
    pub status: bool,
}
