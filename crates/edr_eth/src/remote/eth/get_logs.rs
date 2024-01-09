use revm_primitives::HashSet;

use crate::{
    remote::{filter::OneOrMore, BlockSpec},
    Address, B256,
};

/// for specifying the inputs to `eth_getLogs`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLogsInput {
    /// starting block
    pub from_block: BlockSpec,
    /// ending block
    pub to_block: BlockSpec,
    /// addresses
    pub address: Option<OneOrMore<Address>>,
    /// topics
    pub topics: Option<Vec<Option<OneOrMore<B256>>>>,
}

/// Whether the log address matches the address filter.
pub fn matches_address_filter(log_address: &Address, address_filter: &HashSet<Address>) -> bool {
    address_filter.is_empty() || address_filter.contains(log_address)
}

/// Whether the log topics match the topics filter.
pub fn matches_topics_filter(log_topics: &[B256], topics_filter: &Vec<Option<Vec<B256>>>) -> bool {
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
