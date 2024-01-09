use std::mem::take;

use revm_primitives::HashSet;

use crate::{log::FilterLog, remote::BlockSpec, Address, Bytes, B256};

/// A type that can be used to pass either one or many objects to a JSON-RPC
/// request
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum OneOrMore<T> {
    /// one object
    One(T),
    /// a collection of objects
    Many(Vec<T>),
}

/// for specifying the inputs to `eth_newFilter` and `eth_getLogs`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFilterOptions {
    /// beginning of a range of blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from_block: Option<BlockSpec>,
    /// end of a range of blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to_block: Option<BlockSpec>,
    /// a single block, specified by its hash
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_hash: Option<B256>,
    /// address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<OneOrMore<Address>>,
    /// topics
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topics: Option<Vec<Option<OneOrMore<B256>>>>,
}

/// represents the output of `eth_getFilterLogs` and `eth_getFilterChanges` when
/// used with a log filter
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogOutput {
    /// true when the log was removed, due to a chain reorganization. false if
    /// it's a valid log
    pub removed: bool,
    /// integer of the log index position in the block. None when its pending
    /// log.
    #[serde(with = "crate::serde::optional_u64")]
    pub log_index: Option<u64>,
    /// integer of the transactions index position log was created from. None
    /// when its pending log.
    #[serde(with = "crate::serde::optional_u64")]
    pub transaction_index: Option<u64>,
    /// hash of the transactions this log was created from. None when its
    /// pending log.
    pub transaction_hash: Option<B256>,
    /// hash of the block where this log was in. null when its pending. None
    /// when its pending log.
    pub block_hash: Option<B256>,
    /// the block number where this log was in. null when its pending. None when
    /// its pending log.
    #[serde(with = "crate::serde::optional_u64")]
    pub block_number: Option<u64>,
    /// address from which this log originated.
    pub address: Address,
    /// contains one or more 32 Bytes non-indexed arguments of the log.
    pub data: Bytes,
    /// Array of 0 to 4 32 Bytes DATA of indexed log arguments. (In solidity:
    /// The first topic is the hash of the signature of the event (e.g.
    /// Deposit(address,bytes32,uint256)), except you declared the event
    /// with the anonymous specifier.)
    pub topics: Vec<B256>,
}

impl From<&FilterLog> for LogOutput {
    fn from(value: &FilterLog) -> Self {
        Self {
            removed: value.removed,
            log_index: Some(value.inner.log_index),
            transaction_index: Some(value.inner.transaction_index),
            transaction_hash: Some(value.inner.transaction_hash),
            block_hash: Some(value.block_hash),
            block_number: Some(value.inner.block_number),
            address: value.inner.address,
            data: value.inner.data.clone(),
            topics: value.inner.topics.clone(),
        }
    }
}

/// represents the output of `eth_getFilterChanges`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum FilteredEvents {
    /// logs
    Logs(Vec<LogOutput>),
    /// new block heads
    NewHeads(Vec<B256>),
    /// new pending transactions
    NewPendingTransactions(Vec<B256>),
}

impl FilteredEvents {
    /// Move the memory out of the variant.
    pub fn take(&mut self) -> Self {
        match self {
            Self::Logs(v) => Self::Logs(take(v)),
            Self::NewHeads(v) => Self::NewHeads(take(v)),
            Self::NewPendingTransactions(v) => Self::NewPendingTransactions(take(v)),
        }
    }

    /// Returns the type of the variant.
    pub fn subscription_type(&self) -> SubscriptionType {
        match self {
            Self::Logs(_) => SubscriptionType::Logs,
            Self::NewHeads(_) => SubscriptionType::NewHeads,
            Self::NewPendingTransactions(_) => SubscriptionType::NewPendingTransactions,
        }
    }
}

/// subscription type to be used with `eth_subscribe`
#[derive(Clone, Debug, PartialEq)]
pub enum SubscriptionType {
    /// Induces the emission of logs attached to a new block that match certain
    /// topic filters.
    Logs,
    /// Induces the emission of new blocks that are added to the blockchain.
    NewHeads,
    /// Induces the emission of transaction hashes that are sent to the network
    /// and marked as "pending".
    NewPendingTransactions,
}

impl serde::Serialize for SubscriptionType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(match self {
            SubscriptionType::Logs => "logs",
            SubscriptionType::NewHeads => "newHeads",
            SubscriptionType::NewPendingTransactions => "newPendingTransactions",
        })
    }
}

impl<'a> serde::Deserialize<'a> for SubscriptionType {
    fn deserialize<D>(deserializer: D) -> Result<SubscriptionType, D::Error>
    where
        D: serde::Deserializer<'a>,
    {
        struct SubscriptionTypeVisitor;
        impl<'a> serde::de::Visitor<'a> for SubscriptionTypeVisitor {
            type Value = SubscriptionType;

            fn expecting(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
                formatter.write_str("a string")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                match value {
                    "logs" => Ok(SubscriptionType::Logs),
                    "newHeads" => Ok(SubscriptionType::NewHeads),
                    "newPendingTransactions" => Ok(SubscriptionType::NewPendingTransactions),
                    _ => Err(serde::de::Error::custom("Invalid subscription type")),
                }
            }
        }

        deserializer.deserialize_identifier(SubscriptionTypeVisitor)
    }
}

/// Whether the log address matches the address filter.
pub fn matches_address_filter(log_address: &Address, address_filter: &HashSet<Address>) -> bool {
    address_filter.is_empty() || address_filter.contains(log_address)
}

/// Whether the log topics match the topics filter.
pub fn matches_topics_filter(log_topics: &[B256], topics_filter: &[Option<Vec<B256>>]) -> bool {
    if topics_filter.len() > log_topics.len() {
        return false;
    }

    topics_filter
        .iter()
        .zip(log_topics.iter())
        .all(|(normalized_topics, log_topic)| {
            normalized_topics
                .as_ref()
                .map_or(true, |normalized_topics| {
                    normalized_topics
                        .iter()
                        .any(|normalized_topic| *normalized_topic == *log_topic)
                })
        })
}
