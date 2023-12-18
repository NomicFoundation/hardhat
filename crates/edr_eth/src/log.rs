mod block;
mod filter;
mod receipt;

use revm_primitives::{
    alloy_primitives::{Bloom, BloomInput},
    Log,
};

pub use self::{
    block::{BlockLog, FullBlockLog},
    filter::FilterLog,
    receipt::ReceiptLog,
};

/// Adds the log to a bloom hash.
pub fn add_log_to_bloom(log: &Log, bloom: &mut Bloom) {
    bloom.accrue(BloomInput::Raw(log.address.as_slice()));

    log.topics
        .iter()
        .for_each(|topic| bloom.accrue(BloomInput::Raw(topic.as_slice())));
}
