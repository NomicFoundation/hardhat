use std::mem::take;

use crate::{remote::BlockSpec, Address, Bytes, B256, U256};

/// A type that can be used to pass either one or many objects to a JSON-RPC
/// request
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum OneOrMore<T> {
    /// one object
    One(T),
    /// a collection of objects
    Many(Vec<T>),
}

/// for specifying the inputs to `eth_newFilter`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterCriteriaOptions {
    /// beginning of a range of blocks
    pub from_block: Option<BlockSpec>,
    /// end of a range of blocks
    pub to_block: Option<BlockSpec>,
    /// a single block, specified by its hash
    pub block_hash: Option<B256>,
    /// addresses
    pub addresses: Option<OneOrMore<Address>>,
    /// topics
    pub topics: OneOrMore<Option<B256>>,
}

/// represents the output of `eth_getFilterLogs` and `eth_getFilterChanges` when
/// used with a log filter
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct LogOutput {
    /// true when the log was removed, due to a chain reorganization. false if
    /// it's a valid log
    pub removed: bool,
    /// integer of the log index position in the block. None when its pending
    /// log.
    pub log_index: Option<U256>,
    /// integer of the transactions index position log was created from. None
    /// when its pending log.
    pub transaction_index: Option<u64>,
    /// hash of the transactions this log was created from. None when its
    /// pending log.
    pub transaction_hash: Option<B256>,
    /// hash of the block where this log was in. null when its pending. None
    /// when its pending log.
    pub block_hash: Option<B256>,
    /// the block number where this log was in. null when its pending. None when
    /// its pending log.
    pub block_number: Option<U256>,
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
