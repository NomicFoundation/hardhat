use std::{fmt::Debug, io, marker::PhantomData};

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{db::Database, Account, AccountInfo, Bytecode, DatabaseCommit};
use tokio::{
    runtime::{Builder, Runtime},
    sync::{
        mpsc::{unbounded_channel, UnboundedSender},
        oneshot,
    },
    task::{self, JoinHandle},
};

use crate::{debug::ModifierFn, DatabaseDebug};

use super::request::Request;

/// Trait that meets all requirements for a synchronous database that can be used by [`AsyncDatabase`].
pub trait SyncDatabase<E>:
    Database<Error = E> + DatabaseCommit + DatabaseDebug<Error = E> + Send + Sync + 'static
where
    E: Debug + Send,
{
}

impl<D, E> SyncDatabase<E> for D
where
    D: Database<Error = E> + DatabaseCommit + DatabaseDebug<Error = E> + Send + Sync + 'static,
    E: Debug + Send,
{
}

/// A helper class for converting a synchronous database into an asynchronous database.
///
/// Requires the inner database to implement [`Database`], [`DatabaseCommit`], and [`DatabaseDebug`].
pub struct AsyncDatabase<D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send,
{
    runtime: Runtime,
    request_sender: UnboundedSender<Request<E>>,
    db_handle: Option<JoinHandle<()>>,
    phantom: PhantomData<D>,
}

impl<D, E> AsyncDatabase<D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send + 'static,
{
    /// Constructs an [`AsyncDatabase`] instance with the provided database.
    pub fn new(mut db: D) -> io::Result<Self> {
        let runtime = Builder::new_multi_thread().build()?;

        let (sender, mut receiver) = unbounded_channel::<Request<E>>();

        let db_handle = runtime.spawn(async move {
            while let Some(request) = receiver.recv().await {
                if !request.handle(&mut db) {
                    break;
                }
            }
        });

        Ok(Self {
            runtime,
            request_sender: sender,
            db_handle: Some(db_handle),
            phantom: PhantomData,
        })
    }

    /// Retrieves the runtime of the [`AsyncDatabase`].
    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }

    /// Retrieves the account corresponding to the specified address.
    pub async fn account_by_address(&self, address: Address) -> Result<Option<AccountInfo>, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountByAddress { address, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the storage slot corresponding to the specified address and index.
    pub async fn account_storage_slot(&self, address: Address, index: U256) -> Result<U256, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::StorageSlot {
                address,
                index,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Applies the provided changes to the state.
    pub async fn apply(&self, changes: HashMap<Address, Account>) {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Commit { changes, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Creates a state checkpoint that can be reverted to using [`revert`].
    pub async fn checkpoint(&self) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Checkpoint { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the code corresponding to the specified hash.
    pub async fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::CodeByHash { code_hash, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Inserts the specified account into the state.
    pub async fn insert_account(
        &self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::InsertAccount {
                address,
                account_info,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Makes a snapshot of the database that's retained until [`remove_snapshot`] is called. Returns the snapshot's identifier.
    pub async fn make_snapshot(&self) -> B256 {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::MakeSnapshot { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Modifies the account at the specified address using the provided function.
    pub async fn modify_account(&self, address: Address, modifier: ModifierFn) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::ModifyAccount {
                address,
                modifier,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Removes and returns the account at the specified address, if it exists.
    pub async fn remove_account(&self, address: Address) -> Result<Option<AccountInfo>, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::RemoveAccount { address, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Removes the snapshot corresponding to the specified id, if it exists. Returns whether a snapshot was removed.
    pub async fn remove_snapshot(&self, state_root: B256) -> bool {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::RemoveSnapshot { state_root, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    pub async fn revert(&self) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Revert { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    pub async fn set_account_storage_slot(
        &self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetStorageSlot {
                address,
                index,
                value,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Reverts the state to match the specified state root.
    pub async fn set_state_root(&self, state_root: &B256) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetStateRoot {
                state_root: *state_root,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the state's root.
    pub async fn state_root(&self) -> Result<B256, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::StateRoot { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }
}

impl<D, E> Drop for AsyncDatabase<D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send,
{
    fn drop(&mut self) {
        if let Some(handle) = self.db_handle.take() {
            self.request_sender
                .send(Request::Terminate)
                .expect("Failed to send request");

            self.runtime.block_on(handle).unwrap();
        }
    }
}

/// Wrapper around an [`AsyncDatabase`] to allow synchronous function calls.
pub struct AsyncDatabaseWrapper<'d, D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send,
{
    db: &'d AsyncDatabase<D, E>,
}

impl<'d, D, E> AsyncDatabaseWrapper<'d, D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send,
{
    /// Constructs an [`AsyncDatabaseWrapper`] instance.
    pub fn new(db: &'d AsyncDatabase<D, E>) -> Self {
        Self { db }
    }
}

impl<'d, D, E> Database for AsyncDatabaseWrapper<'d, D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send + 'static,
{
    type Error = E;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.account_by_address(address))
        })
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        task::block_in_place(move || self.db.runtime().block_on(self.db.code_by_hash(code_hash)))
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.account_storage_slot(address, index))
        })
    }
}

impl<'d, D, E> DatabaseCommit for AsyncDatabaseWrapper<'d, D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send + 'static,
{
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        task::block_in_place(move || self.db.runtime().block_on(self.db.apply(changes)))
    }
}

impl<'d, D, E> DatabaseDebug for AsyncDatabaseWrapper<'d, D, E>
where
    D: SyncDatabase<E>,
    E: Debug + Send + 'static,
{
    type Error = E;

    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.insert_account(address, account_info))
        })
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: Box<dyn Fn(&mut U256, &mut u64, &mut Option<Bytecode>) + Send>,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.modify_account(address, modifier))
        })
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        task::block_in_place(move || self.db.runtime().block_on(self.db.remove_account(address)))
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.set_account_storage_slot(address, index, value))
        })
    }

    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.set_state_root(state_root))
        })
    }

    fn state_root(&mut self) -> Result<B256, Self::Error> {
        task::block_in_place(move || self.db.runtime().block_on(self.db.state_root()))
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        task::block_in_place(move || self.db.runtime().block_on(self.db.checkpoint()))
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        task::block_in_place(move || self.db.runtime().block_on(self.db.revert()))
    }

    fn make_snapshot(&mut self) -> B256 {
        task::block_in_place(move || self.db.runtime().block_on(self.db.make_snapshot()))
    }

    fn remove_snapshot(&mut self, state_root: &B256) -> bool {
        task::block_in_place(move || {
            self.db
                .runtime()
                .block_on(self.db.remove_snapshot(*state_root))
        })
    }
}
