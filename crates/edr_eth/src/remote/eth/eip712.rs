// adapted from https://github.com/openethereum/parity-ethereum/blob/v2.7.2-stable/util/EIP-712/src/eip712.rs

use crate::{Address, HashMap, B256, U256};

/// field type
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq)]
pub struct FieldType {
    /// name
    pub name: String,
    /// type
    #[serde(rename = "type")]
    pub type_: String,
}
/// message types
pub type MessageTypes = HashMap<String, Vec<FieldType>>;

/// domain
#[derive(serde::Deserialize, serde::Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Domain {
    /// name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// chain ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chain_id: Option<U256>,
    /// verifying contract
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verifying_contract: Option<Address>,
    /// salt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub salt: Option<B256>,
}

/// message to be signed
#[derive(serde::Deserialize, serde::Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct Message {
    /// types
    pub types: MessageTypes,
    /// primary type
    pub primary_type: String,
    /// message
    pub message: serde_json::Value,
    /// domain
    pub domain: Domain,
}
