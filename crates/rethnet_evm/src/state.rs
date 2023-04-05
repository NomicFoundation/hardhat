mod account;
mod contract;
mod debug;
mod history;
mod hybrid;
mod layered;
mod remote;
mod trie;

use std::fmt::Debug;

use rethnet_eth::B256;
use revm::{db::StateRef, DatabaseCommit};

pub use self::{
    debug::{AccountModifierFn, StateDebug},
    history::StateHistory,
    hybrid::HybridState,
    layered::{LayeredState, RethnetLayer},
    remote::RemoteDatabase,
};

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

/// Trait that meets all requirements for a synchronous database that can be used by [`AsyncDatabase`].
pub trait SyncState<E>:
    StateRef<Error = E>
    + DatabaseCommit
    + StateDebug<Error = E>
    + StateHistory<Error = E>
    + Debug
    + Send
    + Sync
    + 'static
where
    E: Debug + Send,
{
}

impl<S, E> SyncState<E> for S
where
    S: StateRef<Error = E>
        + DatabaseCommit
        + StateDebug<Error = E>
        + StateHistory<Error = E>
        + Debug
        + Send
        + Sync
        + 'static,
    E: Debug + Send,
{
}
