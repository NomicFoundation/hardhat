use std::{mem, sync::OnceLock};

use edr_eth::{transaction::TransactionKind, Address, Bytes};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

use crate::{access_list::AccessListItem, cast::TryCast};

#[napi(object)]
pub struct Eip1559SignedTransaction {
    pub chain_id: BigInt,
    pub nonce: BigInt,
    pub max_priority_fee_per_gas: BigInt,
    pub max_fee_per_gas: BigInt,
    pub gas_limit: BigInt,
    /// 160-bit address for receiver
    /// Creates a contract if no address is provided.
    pub to: Option<Buffer>,
    pub value: BigInt,
    pub input: JsBuffer,
    pub access_list: Vec<AccessListItem>,
    pub odd_y_parity: bool,
    pub r: BigInt,
    pub s: BigInt,
}

impl Eip1559SignedTransaction {
    /// Constructs an instance.
    pub fn new(
        env: &Env,
        transaction: &edr_eth::transaction::Eip1559SignedTransaction,
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
            chain_id: BigInt::from(transaction.chain_id),
            nonce: BigInt::from(transaction.nonce),
            max_priority_fee_per_gas: BigInt {
                sign_bit: false,
                words: transaction.max_priority_fee_per_gas.as_limbs().to_vec(),
            },
            max_fee_per_gas: BigInt {
                sign_bit: false,
                words: transaction.max_fee_per_gas.as_limbs().to_vec(),
            },
            gas_limit: BigInt::from(transaction.gas_limit),
            to: if let TransactionKind::Call(to) = transaction.kind {
                Some(Buffer::from(to.as_slice()))
            } else {
                None
            },
            value: BigInt {
                sign_bit: false,
                words: transaction.value.as_limbs().to_vec(),
            },
            input,
            access_list: transaction
                .access_list
                .0
                .iter()
                .map(AccessListItem::from)
                .collect(),
            odd_y_parity: transaction.odd_y_parity,
            r: BigInt {
                sign_bit: false,
                words: transaction.r.as_limbs().to_vec(),
            },
            s: BigInt {
                sign_bit: false,
                words: transaction.s.as_limbs().to_vec(),
            },
        })
    }
}

impl TryFrom<Eip1559SignedTransaction> for edr_eth::transaction::Eip1559SignedTransaction {
    type Error = napi::Error;

    fn try_from(value: Eip1559SignedTransaction) -> Result<Self, Self::Error> {
        Ok(Self {
            chain_id: value.chain_id.try_cast()?,
            nonce: value.nonce.try_cast()?,
            max_priority_fee_per_gas: value.max_priority_fee_per_gas.try_cast()?,
            max_fee_per_gas: value.max_fee_per_gas.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            kind: if let Some(to) = value.to {
                let to = Address::from_slice(&to);
                TransactionKind::Call(to)
            } else {
                TransactionKind::Create
            },
            value: value.value.try_cast()?,
            input: Bytes::copy_from_slice(value.input.into_value()?.as_ref()),
            access_list: value
                .access_list
                .into_iter()
                .map(TryFrom::try_from)
                .collect::<Result<Vec<edr_eth::access_list::AccessListItem>, _>>()?
                .into(),
            odd_y_parity: value.odd_y_parity,
            r: value.r.try_cast()?,
            s: value.s.try_cast()?,
            hash: OnceLock::new(),
        })
    }
}
