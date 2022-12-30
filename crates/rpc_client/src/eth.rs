// adapted from github.com/gakonst/ethers-rs

use rethnet_eth::{Address, Bloom, Bytes, H256, U256};

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
    pub hash: H256,
    pub nonce: U256,
    pub block_hash: Option<H256>,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub block_number: Option<u64>,
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

fn optional_u64_from_hex<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: &str = serde::Deserialize::deserialize(deserializer)?;
    Ok(Some(
        u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"),
    ))
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
    pub topics: Vec<H256>,
    pub data: Bytes,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_hash: Option<H256>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        deserialize_with = "optional_u64_from_hex"
    )]
    pub block_number: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<H256>,
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
    pub block_hash: Option<H256>,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub block_number: Option<u64>,
    pub contract_address: Option<Address>,
    pub cumulative_gas_used: U256,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_gas_price: Option<U256>,
    pub from: Address,
    pub gas_used: Option<U256>,
    pub logs: Vec<Log>,
    pub logs_bloom: Bloom,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub root: Option<H256>,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub status: Option<u64>,
    pub to: Option<Address>,
    pub transaction_hash: H256,
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
pub struct Block<TX> {
    pub hash: Option<H256>,
    pub parent_hash: H256,
    pub sha3_uncles: H256,
    pub author: Option<Address>,
    pub state_root: H256,
    pub transactions_root: H256,
    pub receipts_root: H256,
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub number: Option<u64>,
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
    pub uncles: Vec<H256>,
    #[serde(bound = "TX: serde::Serialize + serde::de::DeserializeOwned", default)]
    pub transactions: Vec<TX>,
    pub size: Option<U256>,
    pub mix_hash: Option<H256>,
    pub nonce: Option<U256>,
    pub base_fee_per_gas: Option<U256>,
    pub miner: Address,
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
