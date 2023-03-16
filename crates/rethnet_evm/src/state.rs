mod debug;
mod fork;
mod layered_state;
mod remote;
mod request;
mod sync;

use rethnet_eth::B256;

pub use self::{
    debug::{AccountModifierFn, StateDebug},
    fork::ForkState,
    layered_state::{LayeredState, RethnetLayer},
    remote::RemoteDatabase,
    sync::{AsyncState, SyncState},
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
    #[error("State root `{0:?}` does not exist.")]
    InvalidStateRoot(B256),
    /// Not implemented
    #[error("Method not implemented")]
    NotImplemented,
    /// Error from the underlying remote state
    #[error(transparent)]
    Remote(#[from] remote::RemoteDatabaseError),
    /// Some other error from an underlying dependency
    #[error(transparent)]
    Other(#[from] std::io::Error),
}
