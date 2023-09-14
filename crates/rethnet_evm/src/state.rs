mod account;
mod debug;
mod fork;
mod history;
mod hybrid;
mod irregular;
mod layered;
mod remote;
mod trie;

use dyn_clone::DynClone;
use std::fmt::Debug;

use rethnet_eth::{remote::RpcClientError, Address, B256};
use revm::{
    db::StateRef,
    primitives::{Account, HashMap},
    DatabaseCommit,
};

pub use self::{
    debug::{AccountModifierFn, StateDebug},
    fork::ForkState,
    history::StateHistory,
    hybrid::HybridState,
    irregular::IrregularState,
    layered::{LayeredState, RethnetLayer},
    remote::RemoteState,
    trie::{AccountTrie, TrieState},
};

/// The difference between two states, which can be applied to a state to get the new state
/// using [`revm::db::DatabaseCommit::commit`].
pub type StateDiff = HashMap<Address, Account>;

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
    StateRef<Error = E>
    + DatabaseCommit
    + StateDebug<Error = E>
    + Debug
    + DynClone
    + Send
    + Sync
    + 'static
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
        + Sync
        + 'static,
    E: Debug + Send,
{
}
