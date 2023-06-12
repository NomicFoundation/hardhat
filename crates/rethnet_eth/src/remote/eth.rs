#![cfg(feature = "serde")]

// Parts of this code were adapted from github.com/gakonst/ethers-rs and are distributed under its
// licenses:
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-MIT
// For the original context, see https://github.com/gakonst/ethers-rs/tree/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3

use std::fmt::Debug;

use crate::{Address, Bloom, Bytes, B256, U256};

use super::{optional_u64_from_hex, withdrawal::Withdrawal};

#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct AccessListEntry {
    address: Address,
    storage_keys: Vec<U256>,
}

#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    /// The transaction's hash
    pub hash: B256,
    pub nonce: U256,
    pub block_hash: Option<B256>,
    pub block_number: Option<U256>,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub transaction_index: Option<u64>,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub gas_price: Option<U256>,
    pub gas: U256,
    pub input: Bytes,
    #[serde(deserialize_with = "u64_from_hex")]
    pub v: u64,
    pub r: U256,
    pub s: U256,
    #[serde(default, deserialize_with = "optional_u64_from_hex")]
    pub chain_id: Option<u64>,
    #[serde(
        rename = "type",
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "optional_u64_from_hex"
    )]
    pub transaction_type: Option<u64>,
    #[serde(default)]
    pub access_list: Option<Vec<AccessListEntry>>,
    #[serde(default)]
    pub max_fee_per_gas: Option<U256>,
    #[serde(default)]
    pub max_priority_fee_per_gas: Option<U256>,
}

fn u64_from_hex<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: &str = serde::Deserialize::deserialize(deserializer)?;
    Ok(u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"))
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Log {
    pub address: Address,
    pub topics: Vec<B256>,
    pub data: Bytes,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_hash: Option<B256>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_number: Option<U256>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<B256>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        deserialize_with = "optional_u64_from_hex"
    )]
    pub transaction_index: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_index: Option<U256>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_log_index: Option<U256>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct TransactionReceipt {
    pub block_hash: Option<B256>,
    pub block_number: Option<U256>,
    pub contract_address: Option<Address>,
    pub cumulative_gas_used: U256,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_gas_price: Option<U256>,
    pub from: Address,
    pub gas_used: Option<U256>,
    pub logs: Vec<Log>,
    pub logs_bloom: Bloom,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub root: Option<B256>,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub status: Option<u64>,
    pub to: Option<Address>,
    pub transaction_hash: B256,
    #[serde(deserialize_with = "u64_from_hex")]
    pub transaction_index: u64,
    #[serde(
        rename = "type",
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "optional_u64_from_hex"
    )]
    pub transaction_type: Option<u64>,
}

#[derive(Debug, Default, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Block<TX>
where
    TX: Debug + Default + Clone + PartialEq + Eq,
{
    pub hash: Option<B256>,
    pub parent_hash: B256,
    pub sha3_uncles: B256,
    pub author: Option<Address>,
    pub state_root: B256,
    pub transactions_root: B256,
    pub receipts_root: B256,
    pub number: Option<U256>,
    pub gas_used: U256,
    pub gas_limit: U256,
    pub extra_data: Bytes,
    pub logs_bloom: Option<Bloom>,
    #[serde(default)]
    pub timestamp: U256,
    #[serde(default)]
    pub difficulty: U256,
    pub total_difficulty: Option<U256>,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    pub seal_fields: Vec<Bytes>,
    #[serde(default)]
    pub uncles: Vec<B256>,
    #[serde(default)]
    pub transactions: Vec<TX>,
    pub size: Option<U256>,
    pub mix_hash: Option<B256>,
    pub nonce: Option<U256>,
    pub base_fee_per_gas: Option<U256>,
    pub miner: Address,
    #[serde(default)]
    pub withdrawals: Vec<Withdrawal>,
    #[serde(default)]
    pub withdrawals_root: B256,
}

fn deserialize_null_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    T: Default + serde::Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;
    let opt = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

pub mod eip712 {
    // adapted from https://github.com/openethereum/parity-ethereum/blob/v2.7.2-stable/util/EIP-712/src/eip712.rs

    use super::*;
    use hashbrown::HashMap;

    #[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq)]
    pub struct FieldType {
        pub name: String,
        #[serde(rename = "type")]
        pub type_: String,
    }
    pub type MessageTypes = HashMap<String, Vec<FieldType>>;

    #[derive(serde::Deserialize, serde::Serialize, Debug, Clone, PartialEq)]
    #[serde(rename_all = "camelCase")]
    pub struct Domain {
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub version: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub chain_id: Option<U256>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub verifying_contract: Option<Address>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub salt: Option<B256>,
    }

    #[derive(serde::Deserialize, serde::Serialize, Debug, Clone, PartialEq)]
    #[serde(rename_all = "camelCase")]
    #[serde(deny_unknown_fields)]
    pub struct Message {
        pub types: MessageTypes,
        pub primary_type: String,
        pub message: serde_json::Value,
        pub domain: Domain,
    }
}
