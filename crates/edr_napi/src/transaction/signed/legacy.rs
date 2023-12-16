use std::{mem, sync::OnceLock};

use edr_eth::{transaction::TransactionKind, Address, Bytes};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

use crate::{cast::TryCast, signature::Signature};

#[napi(object)]
pub struct LegacySignedTransaction {
    pub nonce: BigInt,
    pub gas_price: BigInt,
    pub gas_limit: BigInt,
    /// 160-bit address for receiver
    /// Creates a contract if no address is provided.
    pub to: Option<Buffer>,
    pub value: BigInt,
    pub input: JsBuffer,
    pub signature: Signature,
}

impl LegacySignedTransaction {
    pub fn from_eip155(
        env: &Env,
        transaction: &edr_eth::transaction::Eip155SignedTransaction,
    ) -> napi::Result<Self> {
        let input = transaction.input.clone();
        let input = unsafe {
            env.create_buffer_with_borrowed_data(
                input.as_ptr(),
                input.len(),
                input,
                |input: Bytes, _env| {
                    mem::drop(input);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            nonce: BigInt::from(transaction.nonce),
            gas_price: BigInt {
                sign_bit: false,
                words: transaction.gas_price.as_limbs().to_vec(),
            },
            gas_limit: BigInt::from(transaction.gas_limit),
            to: if let TransactionKind::Call(to) = transaction.kind {
                Some(Buffer::from(to.as_bytes()))
            } else {
                None
            },
            value: BigInt {
                sign_bit: false,
                words: transaction.value.as_limbs().to_vec(),
            },
            input,
            signature: Signature::from(&transaction.signature),
        })
    }

    pub fn from_legacy(
        env: &Env,
        transaction: &edr_eth::transaction::LegacySignedTransaction,
    ) -> napi::Result<Self> {
        let input = transaction.input.clone();
        let input = unsafe {
            env.create_buffer_with_borrowed_data(
                input.as_ptr(),
                input.len(),
                input,
                |input: Bytes, _env| {
                    mem::drop(input);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            nonce: BigInt::from(transaction.nonce),
            gas_price: BigInt {
                sign_bit: false,
                words: transaction.gas_price.as_limbs().to_vec(),
            },
            gas_limit: BigInt::from(transaction.gas_limit),
            to: if let TransactionKind::Call(to) = transaction.kind {
                Some(Buffer::from(to.as_bytes()))
            } else {
                None
            },
            value: BigInt {
                sign_bit: false,
                words: transaction.value.as_limbs().to_vec(),
            },
            input,
            signature: Signature::from(&transaction.signature),
        })
    }
}

impl TryFrom<LegacySignedTransaction> for edr_eth::transaction::Eip155SignedTransaction {
    type Error = napi::Error;

    fn try_from(value: LegacySignedTransaction) -> Result<Self, Self::Error> {
        Ok(Self {
            nonce: value.nonce.try_cast()?,
            gas_price: value.gas_price.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            kind: if let Some(to) = value.to {
                let to = Address::from_slice(&to);
                TransactionKind::Call(to)
            } else {
                TransactionKind::Create
            },
            value: value.value.try_cast()?,
            input: Bytes::copy_from_slice(value.input.into_value()?.as_ref()),
            signature: value.signature.try_into()?,
            hash: OnceLock::new(),
        })
    }
}

impl TryFrom<LegacySignedTransaction> for edr_eth::transaction::LegacySignedTransaction {
    type Error = napi::Error;

    fn try_from(value: LegacySignedTransaction) -> Result<Self, Self::Error> {
        Ok(Self {
            nonce: value.nonce.try_cast()?,
            gas_price: value.gas_price.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            kind: if let Some(to) = value.to {
                let to = Address::from_slice(&to);
                TransactionKind::Call(to)
            } else {
                TransactionKind::Create
            },
            value: value.value.try_cast()?,
            input: Bytes::copy_from_slice(value.input.into_value()?.as_ref()),
            signature: value.signature.try_into()?,
            hash: OnceLock::new(),
        })
    }
}
