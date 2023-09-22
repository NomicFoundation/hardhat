#![allow(dead_code)]

use rethnet_eth::B256;
use revm::primitives::keccak256;

/// A pseudorandom hash generator which allows overriding of the next generated hash.
#[derive(Clone, Debug)]
pub struct RandomHashGenerator {
    /// The next hash that will be returned
    next_value: B256,
}

impl RandomHashGenerator {
    /// Constructs a [`RandomHashGenerator`] with the specified seed.
    pub fn with_seed(seed: &str) -> Self {
        let next_value = keccak256(seed.as_bytes());

        Self { next_value }
    }

    /// Returns the next hash, generated the future next hash, and caches it.
    pub fn next_value(&mut self) -> B256 {
        let mut next_value = keccak256(self.next_value.as_bytes());

        std::mem::swap(&mut self.next_value, &mut next_value);

        next_value
    }

    /// Overwrites the next hash output by the generator.
    pub fn set_next(&mut self, next_value: B256) {
        self.next_value = next_value;
    }
}
