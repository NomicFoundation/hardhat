mod layered_db;
mod request;
mod sync;

use rethnet_eth::B256;
pub use sync::{AsyncState, SyncState};

pub use layered_db::{LayeredState, RethnetLayer};

/// Combinatorial error for the database API
#[derive(Debug, thiserror::Error)]
pub enum StateError {
    /// No checkpoints to revert
    #[error("No checkpoints to revert.")]
    CannotRevert,
    /// Contract with specified code hash does not exist
    #[error("Contract with code hash `{0}` does not exist.")]
    InvalidCodeHash(B256),
    /// Specified state root does not exist
    #[error("State root `{0}` does not exist.")]
    InvalidStateRoot(B256),
}
