use std::fmt::Debug;

use edr_eth::U256;
use revm::primitives::{
    hash_map::{self, DefaultHashBuilder},
    HashMap,
};

use super::StateOverride;

/// Container for state that was modified outside of mining a block.
#[derive(Clone, Debug, Default)]
pub struct IrregularState {
    block_number_to_override: HashMap<U256, StateOverride>,
}

impl IrregularState {
    /// Retrieves the state override at the specified block number.
    pub fn state_override_at_block_number(
        &mut self,
        block_number: U256,
    ) -> hash_map::Entry<'_, U256, StateOverride, DefaultHashBuilder> {
        self.block_number_to_override.entry(block_number)
    }

    /// Retrieves the irregular state overrides.
    pub fn state_overrides(&self) -> &HashMap<U256, StateOverride> {
        &self.block_number_to_override
    }
}
