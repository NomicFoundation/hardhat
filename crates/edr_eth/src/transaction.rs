// Part of this code was inspired by foundry. For the original context see:
// https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/transaction/mod.rs
#![allow(missing_docs)]

//! transaction related data

mod detailed;
mod kind;
mod request;
mod signed;

pub use self::{detailed::DetailedTransaction, kind::TransactionKind, request::*, signed::*};
use crate::{access_list::AccessListItem, Address, Bytes, U256};

/// Represents _all_ transaction requests received from RPC
#[derive(Clone, Debug, PartialEq, Eq, Default)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(deny_unknown_fields))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct EthTransactionRequest {
    /// from address
    pub from: Address,
    /// to address
    #[cfg_attr(feature = "serde", serde(default))]
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
    #[cfg_attr(feature = "serde", serde(default, with = "crate::serde::optional_u64"))]
    pub gas: Option<u64>,
    /// value of th tx in wei
    pub value: Option<U256>,
    /// Any additional data sent
    pub data: Option<Bytes>,
    /// Transaction nonce
    #[cfg_attr(feature = "serde", serde(default, with = "crate::serde::optional_u64"))]
    pub nonce: Option<u64>,
    /// Chain ID
    #[cfg_attr(feature = "serde", serde(default, with = "crate::serde::optional_u64"))]
    pub chain_id: Option<u64>,
    /// warm storage access pre-payment
    #[cfg_attr(feature = "serde", serde(default))]
    pub access_list: Option<Vec<AccessListItem>>,
    /// EIP-2718 type
    #[cfg_attr(feature = "serde", serde(default, rename = "type"))]
    pub transaction_type: Option<U256>,
}
