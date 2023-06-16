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
