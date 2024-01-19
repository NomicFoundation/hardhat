use std::{ops::Deref, sync::Arc};

use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

use crate::log::Log;

#[napi]
pub struct Receipt {
    inner: Arc<edr_eth::receipt::BlockReceipt>,
}

impl Deref for Receipt {
    type Target = edr_eth::receipt::BlockReceipt;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl From<Arc<edr_eth::receipt::BlockReceipt>> for Receipt {
    fn from(inner: Arc<edr_eth::receipt::BlockReceipt>) -> Self {
        Self { inner }
    }
}

#[napi]
impl Receipt {
    #[doc = "Returns the hash of the block the receipt is included in."]
    #[napi(getter)]
    pub fn block_hash(&self) -> Buffer {
        Buffer::from(self.block_hash.as_slice())
    }

    #[doc = "Returns the number of the block the receipt is included in."]
    #[napi(getter)]
    pub fn block_number(&self) -> BigInt {
        BigInt::from(self.block_number)
    }

    #[doc = "Return the address of the transaction's receiver, if any."]
    #[napi(getter)]
    pub fn callee(&self) -> Option<Buffer> {
        self.to.map(|address| Buffer::from(address.as_slice()))
    }

    #[doc = "Returns the address of the transaction's sender."]
    #[napi(getter)]
    pub fn caller(&self) -> Buffer {
        Buffer::from(self.from.as_slice())
    }

    #[doc = "Returns the address of a created contract, if any."]
    #[napi(getter)]
    pub fn contract_address(&self) -> Option<Buffer> {
        self.contract_address
            .map(|address| Buffer::from(address.as_slice()))
    }

    #[doc = "Returns the cumulative gas used after this transaction was executed."]
    #[napi(getter)]
    pub fn cumulative_gas_used(&self) -> BigInt {
        BigInt::from(self.cumulative_gas_used)
    }

    #[doc = "Returns the gas used by the receipt's transaction."]
    #[napi(getter)]
    pub fn gas_used(&self) -> BigInt {
        BigInt::from(self.gas_used)
    }

    #[napi(getter)]
    pub fn logs(&self) -> Vec<Log> {
        self.logs.iter().map(|log| log.clone().into()).collect()
    }

    #[doc = "Returns the bloom filter of the receipt's logs."]
    #[napi(getter)]
    pub fn logs_bloom(&self) -> Buffer {
        Buffer::from(self.logs_bloom.as_slice())
    }

    #[doc = "Returns the effective gas price of the receipt's transaction."]
    #[napi(getter)]
    pub fn effective_gas_price(&self) -> Option<BigInt> {
        self.effective_gas_price.map(|price| BigInt {
            sign_bit: false,
            words: price.as_limbs().to_vec(),
        })
    }

    #[doc = "Returns the state root of the receipt, if any."]
    #[doc = "Only available for pre-Byzantium receipts. For Byzantium receipts, use `status` instead."]
    #[napi(getter)]
    pub fn state_root(&self) -> Option<Buffer> {
        self.inner
            .state_root()
            .map(|root| Buffer::from(root.as_slice()))
    }

    #[doc = "Returns the status code of the receipt, if any."]
    #[doc = "Only available for post-Byzantium receipts. For pre-Byzantium receipts, use `stateRoot` instead."]
    #[napi(getter)]
    pub fn status(&self) -> Option<u8> {
        self.status_code()
    }

    #[doc = "Returns the type of the receipt's transaction."]
    #[napi(getter, js_name = "type")]
    pub fn transaction_type(&self) -> u64 {
        self.inner.transaction_type()
    }

    #[doc = "Returns the hash of the receipt's transaction."]
    #[napi(getter)]
    pub fn transaction_hash(&self) -> Buffer {
        Buffer::from(self.transaction_hash.as_slice())
    }

    #[doc = "Returns the index of the receipt's transaction in the block."]
    #[napi(getter)]
    pub fn transaction_index(&self) -> BigInt {
        BigInt::from(self.transaction_index)
    }
}
