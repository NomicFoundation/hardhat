mod account;
mod debug;
mod default_storage;
mod fork;
mod history;
mod hybrid;
mod layered;
mod remote;
mod trie;

use std::fmt::Debug;

use rethnet_eth::{remote::RpcClientError, B256, U256};
use revm::{db::StateRef, DatabaseCommit};

pub use self::{
    debug::{AccountModifierFn, StateDebug},
    default_storage::DefaultStorageState,
    fork::ForkState,
    history::StateHistory,
    hybrid::HybridState,
    layered::{LayeredState, RethnetLayer},
    remote::RemoteState,
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
    #[error("State root `{state_root:?}` does not exist (fork: {fork_identifier}).")]
    InvalidStateRoot {
        /// Requested state root
        state_root: B256,
        /// Whether the state root was intended for a fork
        fork_identifier: bool,
    },
    /// Storage slot with specified index does not exist
    #[error("Storage slot with index `{0}` does not exist.")]
    InvalidStorageSlot(U256),
    /// Not implemented
    #[error("Method not implemented")]
    NotImplemented,
    /// Error from the underlying RPC client
    #[error(transparent)]
    Remote(#[from] RpcClientError),
    /// Some other error from an underlying dependency
    #[error(transparent)]
    Other(#[from] std::io::Error),
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
