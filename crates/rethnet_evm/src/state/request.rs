use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{
    db::State,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};
use tokio::sync::oneshot;

use crate::state::{AccountModifierFn, StateDebug};

/// The request type used internally by a [`SyncDatabase`].
pub enum Request<E>
where
    E: Debug,
{
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
        sender: oneshot::Sender<B256>,
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
    pub fn handle<S>(self, state: &mut S) -> bool
    where
        S: State<Error = E> + DatabaseCommit + StateDebug<Error = E>,
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

impl<E> Debug for Request<E>
where
    E: Debug,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AccountByAddress { address, sender } => f
                .debug_struct("AccountByAddress")
                .field("address", address)
                .field("sender", sender)
                .finish(),
            Self::AccountStorageRoot { address, sender } => f
                .debug_struct("AccountStorageRoot")
                .field("address", address)
                .field("sender", sender)
                .finish(),
            Self::Checkpoint { sender } => f
                .debug_struct("Checkpoint")
                .field("sender", sender)
                .finish(),
            Self::CodeByHash { code_hash, sender } => f
                .debug_struct("CodeByHash")
                .field("code_hash", code_hash)
                .field("sender", sender)
                .finish(),
            Self::Commit { changes, sender } => f
                .debug_struct("Commit")
                .field("changes", changes)
                .field("sender", sender)
                .finish(),
            Self::InsertAccount {
                address,
                account_info,
                sender,
            } => f
                .debug_struct("InsertAccount")
                .field("address", address)
                .field("account_info", account_info)
                .field("sender", sender)
                .finish(),
            Self::MakeSnapshot { sender } => f
                .debug_struct("MakeSnapshot")
                .field("sender", sender)
                .finish(),
            Self::ModifyAccount {
                address,
                modifier: _modifier,
                sender,
            } => f
                .debug_struct("ModifyAccount")
                .field("address", address)
                .field("sender", sender)
                .finish(),
            Self::RemoveAccount { address, sender } => f
                .debug_struct("RemoveAccount")
                .field("address", address)
                .field("sender", sender)
                .finish(),
            Self::RemoveSnapshot { state_root, sender } => f
                .debug_struct("RemoveSnapshot")
                .field("state_root", state_root)
                .field("sender", sender)
                .finish(),
            Self::Revert { sender } => f.debug_struct("Revert").field("sender", sender).finish(),
            Self::SetStorageSlot {
                address,
                index,
                value,
                sender,
            } => f
                .debug_struct("SetStorageSlot")
                .field("address", address)
                .field("index", index)
                .field("value", value)
                .field("sender", sender)
                .finish(),
            Self::SetStateRoot { state_root, sender } => f
                .debug_struct("SetStateRoot")
                .field("state_root", state_root)
                .field("sender", sender)
                .finish(),
            Self::StateRoot { sender } => {
                f.debug_struct("StateRoot").field("sender", sender).finish()
            }
            Self::StorageSlot {
                address,
                index,
                sender,
            } => f
                .debug_struct("StorageSlot")
                .field("address", address)
                .field("index", index)
                .field("sender", sender)
                .finish(),
            Self::Terminate => write!(f, "Terminate"),
        }
    }
}
