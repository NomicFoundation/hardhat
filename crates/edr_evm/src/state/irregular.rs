use std::{collections::HashMap, fmt::Debug, marker::PhantomData};

use crate::state::SyncState;

/// Container for state that was modified outside of mining a block.
#[derive(Debug)]
pub struct IrregularState<ErrorT, StateT>
where
    ErrorT: Debug + Send,
    StateT: SyncState<ErrorT>,
{
    // Muse use `ErrorT`
    phantom: PhantomData<ErrorT>,
    inner: HashMap<u64, StateT>,
}

impl<ErrorT, StateT> Default for IrregularState<ErrorT, StateT>
where
    ErrorT: Debug + Send,
    StateT: SyncState<ErrorT>,
{
    fn default() -> Self {
        Self {
            phantom: PhantomData,
            inner: HashMap::default(),
        }
    }
}

impl<ErrorT, StateT> IrregularState<ErrorT, StateT>
where
    ErrorT: Debug + Send,
    StateT: SyncState<ErrorT>,
{
    /// Gets an irregular state by block number.
    pub fn state_by_block_number(&self, block_number: u64) -> Option<&StateT> {
        self.inner.get(&block_number)
    }

    /// Inserts the state for a block number and returns the previous state if it exists.
    pub fn insert_state(&mut self, block_number: u64, state: StateT) -> Option<StateT> {
        self.inner.insert(block_number, state)
    }
}
