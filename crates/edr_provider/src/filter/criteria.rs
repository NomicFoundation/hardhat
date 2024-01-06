use edr_eth::{Address, B256};

#[derive(Clone, Debug, PartialEq)]
pub struct FilterCriteria {
    from_block: u64,
    to_block: u64,
    addresses: Vec<Address>,
    normalized_topics: Option<Vec<Option<Vec<B256>>>>,
}
