use std::{
    collections::{btree_map, BTreeMap},
    fmt::Debug,
};

use super::StateOverride;

/// Container for state that was modified outside of mining a block.
#[derive(Clone, Debug, Default)]
pub struct IrregularState {
    block_number_to_override: BTreeMap<u64, StateOverride>,
}

impl IrregularState {
    /// Retrieves the state override at the specified block number.
    pub fn state_override_at_block_number(
        &mut self,
        block_number: u64,
    ) -> btree_map::Entry<'_, u64, StateOverride> {
        self.block_number_to_override.entry(block_number)
    }

    /// Retrieves the irregular state overrides.
    pub fn state_overrides(&self) -> &BTreeMap<u64, StateOverride> {
        &self.block_number_to_override
    }
}
