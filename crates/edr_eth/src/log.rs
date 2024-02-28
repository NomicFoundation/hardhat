mod block;
mod filter;
mod receipt;

pub use revm_primitives::Log;

pub use self::{
    block::{BlockLog, FullBlockLog},
    filter::FilterLog,
    receipt::ReceiptLog,
};
use crate::{Bloom, BloomInput};

/// Adds the log to a bloom hash.
pub fn add_log_to_bloom(log: &Log, bloom: &mut Bloom) {
    bloom.accrue(BloomInput::Raw(log.address.as_slice()));

    log.topics()
        .iter()
        .for_each(|topic| bloom.accrue(BloomInput::Raw(topic.as_slice())));
}
