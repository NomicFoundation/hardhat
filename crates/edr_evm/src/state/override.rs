use edr_eth::B256;

use super::StateDiff;

/// Data for overriding a state with a diff and the state's resulting state
/// root.
#[derive(Clone, Debug)]
pub struct StateOverride {
    /// The diff to be applied.
    pub diff: StateDiff,
    /// The resulting state root.
    pub state_root: B256,
}

impl StateOverride {
    /// Constructs a new instance with the provided state root.
    pub fn with_state_root(state_root: B256) -> Self {
        Self {
            diff: StateDiff::default(),
            state_root,
        }
    }
}
