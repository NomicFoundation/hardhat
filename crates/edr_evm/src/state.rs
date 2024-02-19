mod account;
mod debug;
mod diff;
mod fork;
mod irregular;
mod r#override;
mod overrides;
mod remote;
mod trie;

use std::fmt::Debug;

use dyn_clone::DynClone;
use edr_eth::{remote::RpcClientError, B256};
use revm::{db::StateRef, DatabaseCommit};

pub use self::{
    debug::{AccountModifierFn, StateDebug},
    diff::StateDiff,
    fork::ForkState,
    irregular::IrregularState,
    overrides::*,
    r#override::StateOverride,
    remote::RemoteState,
    trie::{AccountTrie, TrieState},
};

/// Combinatorial error for the state API
#[derive(Debug, thiserror::Error)]
pub enum StateError {
    /// No checkpoints to revert
    #[error("No checkpoints to revert.")]
    CannotRevert,
    /// Contract with specified code hash does not exist
    #[error("Contract with code hash `{0}` does not exist.")]
    InvalidCodeHash(B256),
    /// Specified state root does not exist
    #[error("State root `{state_root:?}` does not exist (fork: {is_fork}).")]
    InvalidStateRoot {
        /// Requested state root
        state_root: B256,
        /// Whether the state root was intended for a fork
        is_fork: bool,
    },
    /// Error from the underlying RPC client
    #[error(transparent)]
    Remote(#[from] RpcClientError),
}

/// Trait that meets all requirements for a synchronous database
pub trait SyncState<E>:
    StateRef<Error = E> + DatabaseCommit + StateDebug<Error = E> + Debug + DynClone + Send + Sync
where
    E: Debug + Send,
{
}

impl<E> Clone for Box<dyn SyncState<E>>
where
    E: Debug + Send,
{
    fn clone(&self) -> Self {
        dyn_clone::clone_box(&**self)
    }
}

impl<S, E> SyncState<E> for S
where
    S: StateRef<Error = E>
        + DatabaseCommit
        + StateDebug<Error = E>
        + Debug
        + DynClone
        + Send
        + Sync,
    E: Debug + Send,
{
}
