use std::fmt::Debug;

use hashbrown::HashMap;
use rethnet_eth::{Address, H256, U256};
use revm::{Account, AccountInfo, Bytecode, Database, DatabaseCommit};
use tokio::sync::oneshot;

use crate::DatabaseDebug;

/// The request type used internally by a [`SyncDatabase`].
pub enum Request<E>
where
    E: Debug,
{
    AccountByAddress {
        address: Address,
        sender: oneshot::Sender<Result<Option<AccountInfo>, E>>,
    },
    BlockHashByNumber {
        number: U256,
        sender: oneshot::Sender<Result<H256, E>>,
    },
    Checkpoint {
        sender: oneshot::Sender<Result<(), E>>,
    },
    CodeByHash {
        code_hash: H256,
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
    InsertBlock {
        block_number: U256,
        block_hash: H256,
        sender: oneshot::Sender<Result<(), E>>,
    },
    ModifyAccount {
        address: Address,
        modifier: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>,
        sender: oneshot::Sender<Result<(), E>>,
    },
    RemoveAccount {
        address: Address,
        sender: oneshot::Sender<Result<Option<AccountInfo>, E>>,
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
        state_root: H256,
        sender: oneshot::Sender<Result<(), E>>,
    },
    StateRoot {
        sender: oneshot::Sender<Result<H256, E>>,
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
    pub fn handle<D>(self, db: &mut D) -> bool
    where
        D: Database<Error = E> + DatabaseCommit + DatabaseDebug<Error = E>,
    {
        match self {
            Request::AccountByAddress { address, sender } => {
                sender.send(db.basic(address)).unwrap()
            }
            Request::BlockHashByNumber { number, sender } => {
                sender.send(db.block_hash(number)).unwrap()
            }

            Request::Checkpoint { sender } => sender.send(db.checkpoint()).unwrap(),
            Request::CodeByHash { code_hash, sender } => {
                sender.send(db.code_by_hash(code_hash)).unwrap()
            }
            Request::Commit { changes, sender } => {
                db.commit(changes);
                sender.send(()).unwrap()
            }
            Request::InsertAccount {
                address,
                account_info,
                sender,
            } => sender
                .send(db.insert_account(address, account_info))
                .unwrap(),
            Request::InsertBlock {
                block_number,
                block_hash,
                sender,
            } => sender
                .send(db.insert_block(block_number, block_hash))
                .unwrap(),
            Request::ModifyAccount {
                address,
                modifier,
                sender,
            } => sender.send(db.modify_account(address, modifier)).unwrap(),
            Request::RemoveAccount { address, sender } => {
                sender.send(db.remove_account(address)).unwrap()
            }
            Request::Revert { sender } => sender.send(db.revert()).unwrap(),
            Request::SetStorageSlot {
                address,
                index,
                value,
                sender,
            } => sender
                .send(db.set_account_storage_slot(address, index, value))
                .unwrap(),
            Request::SetStateRoot { state_root, sender } => {
                sender.send(db.set_state_root(&state_root)).unwrap()
            }
            Request::StateRoot { sender } => sender.send(db.state_root()).unwrap(),
            Request::StorageSlot {
                address,
                index,
                sender,
            } => sender.send(db.storage(address, index)).unwrap(),
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
            Self::BlockHashByNumber { number, sender } => f
                .debug_struct("BlockHashByNumber")
                .field("number", number)
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
            Self::InsertBlock {
                block_number,
                block_hash,
                sender,
            } => f
                .debug_struct("InsertBlock")
                .field("block_number", block_number)
                .field("block_hash", block_hash)
                .field("sender", sender)
                .finish(),
            Self::ModifyAccount {
                address,
                modifier,
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
