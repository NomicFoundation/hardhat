use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};
use tokio::sync::oneshot;

use crate::state::{AccountModifierFn, StateDebug};

use super::history::StateHistory;

/// The request type used internally by a [`SyncDatabase`].
#[derive(Debug)]
pub enum Request<E> {
    AccountByAddress {
        address: Address,
        sender: oneshot::Sender<Result<Option<AccountInfo>, E>>,
    },
    AccountStorageRoot {
        address: Address,
        sender: oneshot::Sender<Result<Option<B256>, E>>,
    },
    Checkpoint {
        sender: oneshot::Sender<Result<(), E>>,
    },
    CodeByHash {
        code_hash: B256,
        sender: oneshot::Sender<Result<Bytecode, E>>,
    },
    Commit {
        changes: HashMap<Address, Account>,
        sender: oneshot::Sender<()>,
    },
    InsertAccount {
        address: Address,
        account_info: AccountInfo,
        sender: oneshot::Sender<Result<(), E>>,
    },
    MakeSnapshot {
        sender: oneshot::Sender<(B256, bool)>,
    },
    ModifyAccount {
        address: Address,
        modifier: AccountModifierFn,
        sender: oneshot::Sender<Result<(), E>>,
    },
    RemoveAccount {
        address: Address,
        sender: oneshot::Sender<Result<Option<AccountInfo>, E>>,
    },
    RemoveSnapshot {
        state_root: B256,
        sender: oneshot::Sender<bool>,
    },
    Revert {
        sender: oneshot::Sender<Result<(), E>>,
    },
    Serialize {
        sender: oneshot::Sender<String>,
    },
    SetStorageSlot {
        address: Address,
        index: U256,
        value: U256,
        sender: oneshot::Sender<Result<(), E>>,
    },
    SetStateRoot {
        state_root: B256,
        sender: oneshot::Sender<Result<(), E>>,
    },
    StateRoot {
        sender: oneshot::Sender<Result<B256, E>>,
    },
    StorageSlot {
        address: Address,
        index: U256,
        sender: oneshot::Sender<Result<U256, E>>,
    },
    Terminate,
}

impl<E> Request<E>
where
    E: Debug,
{
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn handle<S>(self, state: &mut S) -> bool
    where
        S: StateRef<Error = E>
            + DatabaseCommit
            + StateDebug<Error = E>
            + StateHistory<Error = E>
            + Debug,
    {
        match self {
            Request::AccountByAddress { address, sender } => {
                sender.send(state.basic(address)).unwrap()
            }
            Request::AccountStorageRoot { address, sender } => {
                sender.send(state.account_storage_root(&address)).unwrap()
            }
            Request::Checkpoint { sender } => sender.send(state.checkpoint()).unwrap(),
            Request::CodeByHash { code_hash, sender } => {
                sender.send(state.code_by_hash(code_hash)).unwrap()
            }
            Request::Commit { changes, sender } => {
                state.commit(changes);
                sender.send(()).unwrap()
            }
            Request::InsertAccount {
                address,
                account_info,
                sender,
            } => sender
                .send(state.insert_account(address, account_info))
                .unwrap(),
            Request::MakeSnapshot { sender } => sender.send(state.make_snapshot()).unwrap(),
            Request::ModifyAccount {
                address,
                modifier,
                sender,
            } => sender
                .send(state.modify_account(address, modifier))
                .unwrap(),
            Request::RemoveAccount { address, sender } => {
                sender.send(state.remove_account(address)).unwrap()
            }
            Request::RemoveSnapshot { state_root, sender } => {
                sender.send(state.remove_snapshot(&state_root)).unwrap()
            }
            Request::Revert { sender } => sender.send(state.revert()).unwrap(),
            Request::Serialize { sender } => sender.send(state.serialize()).unwrap(),
            Request::SetStorageSlot {
                address,
                index,
                value,
                sender,
            } => sender
                .send(state.set_account_storage_slot(address, index, value))
                .unwrap(),
            Request::SetStateRoot { state_root, sender } => {
                sender.send(state.set_state_root(&state_root)).unwrap()
            }
            Request::StateRoot { sender } => sender.send(state.state_root()).unwrap(),
            Request::StorageSlot {
                address,
                index,
                sender,
            } => sender.send(state.storage(address, index)).unwrap(),
            Request::Terminate => return false,
        }

        true
    }
}
