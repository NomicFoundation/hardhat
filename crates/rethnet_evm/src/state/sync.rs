use std::{fmt::Debug, io};

use hashbrown::HashMap;
use rethnet_eth::{Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};
use tokio::{
    runtime::{Builder, Runtime},
    sync::{
        mpsc::{unbounded_channel, UnboundedSender},
        oneshot,
    },
    task::{self, JoinHandle},
};

use crate::state::{AccountModifierFn, StateDebug};

use super::{history::StateHistory, request::Request};

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

/// A helper class for converting a synchronous database into an asynchronous database.
///
/// Requires the inner database to implement [`Database`], [`DatabaseCommit`], and [`DatabaseDebug`].

#[derive(Debug)]
pub struct AsyncState<E>
where
    E: Debug + Send,
{
    runtime: Runtime,
    request_sender: UnboundedSender<Request<E>>,
    db_handle: Option<JoinHandle<()>>,
}

impl<E> AsyncState<E>
where
    E: Debug + Send + 'static,
{
    /// Constructs an [`AsyncDatabase`] instance with the provided database.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn new<S: SyncState<E>>(mut state: S) -> io::Result<Self> {
        let runtime = Builder::new_multi_thread().build()?;

        let (sender, mut receiver) = unbounded_channel::<Request<E>>();

        let db_handle = runtime.spawn(async move {
            while let Some(request) = receiver.recv().await {
                if !request.handle(&mut state) {
                    break;
                }
            }
        });

        Ok(Self {
            runtime,
            request_sender: sender,
            db_handle: Some(db_handle),
        })
    }

    /// Retrieves the runtime of the [`AsyncDatabase`].
    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }

    /// Retrieves the account corresponding to the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn account_by_address(&self, address: Address) -> Result<Option<AccountInfo>, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountByAddress { address, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the storage root of the account at the specified address.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountStorageRoot {
                address: *address,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the storage slot corresponding to the specified address and index.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
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
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn apply(&self, changes: HashMap<Address, Account>) {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Commit { changes, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Creates a state checkpoint that can be reverted to using [`revert`].
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn checkpoint(&self) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Checkpoint { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Retrieves the code corresponding to the specified hash.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::CodeByHash { code_hash, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Inserts the specified account into the state.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
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
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn make_snapshot(&self) -> (B256, bool) {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::MakeSnapshot { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Modifies the account at the specified address using the provided function.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn modify_account(
        &self,
        address: Address,
        modifier: AccountModifierFn,
    ) -> Result<(), E> {
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
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn remove_account(&self, address: Address) -> Result<Option<AccountInfo>, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::RemoveAccount { address, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Removes the snapshot corresponding to the specified id, if it exists. Returns whether a snapshot was removed.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn remove_snapshot(&self, state_root: B256) -> bool {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::RemoveSnapshot { state_root, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn revert(&self) -> Result<(), E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Revert { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Serializes the state using ordering of addresses and storage indices.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn serialize(&self) -> String {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Serialize { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    #[cfg_attr(feature = "tracing", tracing::instrument)]
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
    #[cfg_attr(feature = "tracing", tracing::instrument)]
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
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn state_root(&self) -> Result<B256, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::StateRoot { sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }
}

impl<E> Drop for AsyncState<E>
where
    E: Debug + Send,
{
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn drop(&mut self) {
        if let Some(handle) = self.db_handle.take() {
            self.request_sender
                .send(Request::Terminate)
                .expect("Failed to send request");

            self.runtime.block_on(handle).unwrap();
        }
    }
}

impl<E> StateRef for AsyncState<E>
where
    E: Debug + Send + 'static,
{
    type Error = E;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::account_by_address(self, address))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::code_by_hash(self, code_hash))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::account_storage_slot(self, address, index))
        })
    }
}

impl<'d, E> DatabaseCommit for &'d AsyncState<E>
where
    E: Debug + Send + 'static,
{
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        task::block_in_place(move || self.runtime.block_on(self.apply(changes)))
    }
}

impl<'d, E> StateDebug for &'d AsyncState<E>
where
    E: Debug + Send + 'static,
{
    type Error = E;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn account_storage_root(&mut self, address: &Address) -> Result<Option<B256>, Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::account_storage_root(*self, address))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn insert_account(
        &mut self,
        address: Address,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::insert_account(*self, address, account_info))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn modify_account(
        &mut self,
        address: Address,
        modifier: AccountModifierFn,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::modify_account(*self, address, modifier))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::remove_account(*self, address))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn serialize(&mut self) -> String {
        task::block_in_place(move || self.runtime.block_on(AsyncState::serialize(*self)))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.runtime.block_on(AsyncState::set_account_storage_slot(
                *self, address, index, value,
            ))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn state_root(&mut self) -> Result<B256, Self::Error> {
        task::block_in_place(move || self.runtime.block_on(AsyncState::state_root(*self)))
    }
}

impl<'d, E> StateHistory for &'d AsyncState<E>
where
    E: Debug + Send + 'static,
{
    type Error = E;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error> {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::set_state_root(*self, state_root))
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        task::block_in_place(move || self.runtime.block_on(AsyncState::checkpoint(*self)))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn revert(&mut self) -> Result<(), Self::Error> {
        task::block_in_place(move || self.runtime.block_on(AsyncState::revert(*self)))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn make_snapshot(&mut self) -> (B256, bool) {
        task::block_in_place(move || self.runtime.block_on(AsyncState::make_snapshot(*self)))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn remove_snapshot(&mut self, state_root: &B256) -> bool {
        task::block_in_place(move || {
            self.runtime
                .block_on(AsyncState::remove_snapshot(*self, *state_root))
        })
    }
}
