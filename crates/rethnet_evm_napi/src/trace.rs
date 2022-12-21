use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

#[napi(object)]
pub struct Trace {
    pub steps: Vec<Step>,
    pub return_value: Buffer,
}

impl From<rethnet_evm::trace::Trace> for Trace {
    fn from(value: rethnet_evm::trace::Trace) -> Self {
        let steps = value.steps.into_iter().map(From::from).collect();
        let return_value = Buffer::from(value.return_value.as_ref());

        Self {
            steps,
            return_value,
        }
    }
}

#[napi(object)]
pub struct Step {
    pub opcode: u8,
    pub gas_cost: BigInt,
    pub gas_refunded: i64,
    pub exit_code: u8,
}

impl From<rethnet_evm::trace::Step> for Step {
    fn from(value: rethnet_evm::trace::Step) -> Self {
        Self {
            opcode: value.opcode,
            gas_cost: BigInt::from(value.gas_cost),
            gas_refunded: value.gas_refunded,
            exit_code: value.exit_code as u8,
        }
    }
}
