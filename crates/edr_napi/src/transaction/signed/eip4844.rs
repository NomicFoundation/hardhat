use std::{mem, sync::OnceLock};

use edr_eth::{Address, Bytes};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsBuffer, JsBufferValue,
};
use napi_derive::napi;

use crate::{access_list::AccessListItem, cast::TryCast};

#[napi(object)]
pub struct Eip4844SignedTransaction {
    pub chain_id: BigInt,
    pub nonce: BigInt,
    pub max_priority_fee_per_gas: BigInt,
    pub max_fee_per_gas: BigInt,
    pub max_fee_per_blob_gas: BigInt,
    pub gas_limit: BigInt,
    /// 160-bit address for receiver
    pub to: Buffer,
    pub value: BigInt,
    pub input: JsBuffer,
    pub access_list: Vec<AccessListItem>,
    pub blob_hashes: Vec<Buffer>,
    pub odd_y_parity: bool,
    pub r: BigInt,
    pub s: BigInt,
}

impl Eip4844SignedTransaction {
    /// Constructs a [`Eip4844SignedTransaction`] instance.
    pub fn new(
        env: &Env,
        transaction: &edr_eth::transaction::Eip4844SignedTransaction,
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
            max_fee_per_blob_gas: BigInt {
                sign_bit: false,
                words: transaction.max_fee_per_blob_gas.as_limbs().to_vec(),
            },
            gas_limit: BigInt::from(transaction.gas_limit),
            to: Buffer::from(transaction.to.as_slice()),
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
            blob_hashes: transaction
                .blob_hashes
                .iter()
                .map(|hash| Buffer::from(hash.as_slice()))
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

impl TryFrom<Eip4844SignedTransaction> for edr_eth::transaction::Eip4844SignedTransaction {
    type Error = napi::Error;

    fn try_from(value: Eip4844SignedTransaction) -> Result<Self, Self::Error> {
        Ok(Self {
            chain_id: value.chain_id.try_cast()?,
            nonce: value.nonce.try_cast()?,
            max_priority_fee_per_gas: value.max_priority_fee_per_gas.try_cast()?,
            max_fee_per_gas: value.max_fee_per_gas.try_cast()?,
            max_fee_per_blob_gas: value.max_fee_per_blob_gas.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            to: Address::from_slice(&value.to),
            value: value.value.try_cast()?,
            input: Bytes::copy_from_slice(value.input.into_value()?.as_ref()),
            access_list: value
                .access_list
                .into_iter()
                .map(TryFrom::try_from)
                .collect::<Result<Vec<edr_eth::access_list::AccessListItem>, _>>()?
                .into(),
            blob_hashes: value
                .blob_hashes
                .into_iter()
                .map(Buffer::try_cast)
                .collect::<napi::Result<_>>()?,
            odd_y_parity: value.odd_y_parity,
            r: value.r.try_cast()?,
            s: value.s.try_cast()?,
            hash: OnceLock::new(),
        })
    }
}
