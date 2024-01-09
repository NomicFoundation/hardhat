use edr_eth::{
    log::FilterLog,
    remote::{
        eth::{matches_address_filter, matches_topics_filter},
        filter::LogOutput,
    },
    Address, Bloom, BloomInput, B256,
};
use edr_evm::HashSet;

#[derive(Clone, Debug, PartialEq)]
pub struct LogFilter {
    pub from_block: u64,
    // If `to_block` is `None`, then the filter will resolve the to the latest block number at
    // runtime
    pub to_block: Option<u64>,
    pub addresses: HashSet<Address>,
    pub normalized_topics: Vec<Option<Vec<B256>>>,
}

/// Checks if the bloom filter contains the log filter
pub fn bloom_contains_log_filter(bloom: &Bloom, filter: &LogFilter) -> bool {
    for address in filter.addresses.iter() {
        if bloom.contains_input(BloomInput::Raw(address.as_slice())) {
            return true;
        }
    }

    filter.normalized_topics.iter().all(|topics| {
        topics.as_ref().map_or(true, |topics| {
            topics
                .iter()
                .any(|topic| bloom.contains_input(BloomInput::Raw(topic.as_slice())))
        })
    })
}

pub fn filter_logs<'i>(
    logs: impl Iterator<Item = &'i FilterLog>,
    filter: &LogFilter,
) -> Vec<LogOutput> {
    logs.filter(|log| {
        filter.from_block <= log.block_number
            && filter
                .to_block
                .map_or(true, |to_block| log.block_number <= to_block)
            && matches_address_filter(&log.address, &filter.addresses)
            && matches_topics_filter(&log.topics, &filter.normalized_topics)
    })
    .map(LogOutput::from)
    .collect()
}
