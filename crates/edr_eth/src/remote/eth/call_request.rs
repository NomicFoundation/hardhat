use alloy_primitives::Bytes;
use revm_primitives::Address;

use crate::{access_list::AccessListItem, U256};

/// For specifying input to methods requiring a transaction object, like
/// `eth_call` and `eth_estimateGas`
#[derive(Clone, Debug, Default, PartialEq, serde::Deserialize, serde::Serialize)]
#[cfg_attr(feature = "serde", serde(deny_unknown_fields))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct CallRequest {
    /// the address from which the transaction should be sent
    pub from: Option<Address>,
    /// the address to which the transaction should be sent
    pub to: Option<Address>,
    #[cfg_attr(feature = "serde", serde(default, with = "crate::serde::optional_u64"))]
    /// gas
    pub gas: Option<u64>,
    /// gas price
    pub gas_price: Option<U256>,
    /// max base fee per gas sender is willing to pay
    pub max_fee_per_gas: Option<U256>,
    /// miner tip
    pub max_priority_fee_per_gas: Option<U256>,
    /// transaction value
    pub value: Option<U256>,
    /// transaction data
    pub data: Option<Bytes>,
    /// warm storage access pre-payment
    pub access_list: Option<Vec<AccessListItem>>,
}
