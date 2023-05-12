// Part of this code was inspired by foundry. For the original context see:
// https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/transaction/mod.rs
#![allow(missing_docs)]

//! transaction related data

mod kind;
mod request;
mod signed;

use crate::{
    access_list::{AccessList, AccessListItem},
    Address, Bytes, U256,
};

pub use self::{
    kind::TransactionKind,
    request::{
        EIP1559TransactionRequest, EIP2930TransactionRequest, LegacyTransactionRequest,
        TransactionRequest,
    },
    signed::{
        EIP1559SignedTransaction, EIP2930SignedTransaction, LegacySignedTransaction,
        SignedTransaction,
    },
};

/// Represents _all_ transaction requests received from RPC
#[derive(Clone, Debug, PartialEq, Eq, Default)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(deny_unknown_fields))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct EthTransactionRequest {
    /// from address
    pub from: Option<Address>,
    /// to address
    pub to: Option<Address>,
    /// legacy, gas Price
    #[cfg_attr(feature = "serde", serde(default))]
    pub gas_price: Option<U256>,
    /// max base fee per gas sender is willing to pay
    #[cfg_attr(feature = "serde", serde(default))]
    pub max_fee_per_gas: Option<U256>,
    /// miner tip
    #[cfg_attr(feature = "serde", serde(default))]
    pub max_priority_fee_per_gas: Option<U256>,
    /// gas
    pub gas: Option<u64>,
    /// value of th tx in wei
    pub value: Option<U256>,
    /// Any additional data sent
    pub data: Option<Bytes>,
    /// Transaction nonce
    pub nonce: Option<u64>,
    /// warm storage access pre-payment
    #[cfg_attr(feature = "serde", serde(default))]
    pub access_list: Option<Vec<AccessListItem>>,
    /// EIP-2718 type
    #[cfg_attr(feature = "serde", serde(rename = "type"))]
    pub transaction_type: Option<U256>,
}

impl EthTransactionRequest {
    /// Converts the request into a [TypedTransactionRequest]
    pub fn into_typed_request(self) -> Option<TransactionRequest> {
        let EthTransactionRequest {
            to,
            gas_price,
            max_fee_per_gas,
            max_priority_fee_per_gas,
            gas,
            value,
            data,
            nonce,
            mut access_list,
            ..
        } = self;
        match (gas_price, max_fee_per_gas, access_list.take()) {
            // legacy transaction
            (Some(_), None, None) => Some(TransactionRequest::Legacy(LegacyTransactionRequest {
                nonce: nonce.unwrap_or(0),
                gas_price: gas_price.unwrap_or_default(),
                gas_limit: gas.unwrap_or_default(),
                value: value.unwrap_or(U256::ZERO),
                input: data.unwrap_or_default(),
                kind: match to {
                    Some(to) => TransactionKind::Call(to),
                    None => TransactionKind::Create,
                },
                chain_id: None,
            })),
            // EIP2930
            (_, None, Some(access_list)) => {
                Some(TransactionRequest::EIP2930(EIP2930TransactionRequest {
                    nonce: nonce.unwrap_or(0),
                    gas_price: gas_price.unwrap_or_default(),
                    gas_limit: gas.unwrap_or_default(),
                    value: value.unwrap_or(U256::ZERO),
                    input: data.unwrap_or_default(),
                    kind: match to {
                        Some(to) => TransactionKind::Call(to),
                        None => TransactionKind::Create,
                    },
                    chain_id: 0,
                    access_list,
                }))
            }
            // EIP1559
            (None, Some(_), access_list) | (None, None, access_list @ None) => {
                // Empty fields fall back to the canonical transaction schema.
                Some(TransactionRequest::EIP1559(EIP1559TransactionRequest {
                    nonce: nonce.unwrap_or(0),
                    max_fee_per_gas: max_fee_per_gas.unwrap_or_default(),
                    max_priority_fee_per_gas: max_priority_fee_per_gas.unwrap_or(U256::ZERO),
                    gas_limit: gas.unwrap_or_default(),
                    value: value.unwrap_or(U256::ZERO),
                    input: data.unwrap_or_default(),
                    kind: match to {
                        Some(to) => TransactionKind::Call(to),
                        None => TransactionKind::Create,
                    },
                    chain_id: 0,
                    access_list: access_list.unwrap_or_default(),
                }))
            }
            _ => None,
        }
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Encodable for TransactionKind {
    fn length(&self) -> usize {
        match self {
            TransactionKind::Call(to) => to.length(),
            TransactionKind::Create => ([]).length(),
        }
    }
    fn encode(&self, out: &mut dyn open_fastrlp::BufMut) {
        match self {
            TransactionKind::Call(to) => to.encode(out),
            TransactionKind::Create => ([]).encode(out),
        }
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Decodable for TransactionKind {
    fn decode(buf: &mut &[u8]) -> Result<Self, open_fastrlp::DecodeError> {
        use bytes::Buf;

        if let Some(&first) = buf.first() {
            if first == 0x80 {
                buf.advance(1);
                Ok(TransactionKind::Create)
            } else {
                let addr = <Address as open_fastrlp::Decodable>::decode(buf)?;
                Ok(TransactionKind::Call(addr))
            }
        } else {
            Err(open_fastrlp::DecodeError::InputTooShort)
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TransactionEssentials {
    pub kind: TransactionKind,
    pub input: Bytes,
    pub nonce: u64,
    pub gas_limit: u64,
    pub gas_price: Option<U256>,
    pub max_fee_per_gas: Option<U256>,
    pub max_priority_fee_per_gas: Option<U256>,
    pub value: U256,
    pub chain_id: Option<u64>,
    pub access_list: AccessList,
}
