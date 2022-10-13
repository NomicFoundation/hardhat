use std::sync::mpsc::{channel, Sender};

use napi::{JsUnknown, NapiRaw, Status};
use rethnet_evm::{Account, Database, DatabaseCommit, HashMap, H160};

use crate::{
    sync::{await_void_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    DatabaseCommitCallbacks,
};

use super::JsDatabase;

pub trait HasDatabaseCommit {
    /// The database's error type.
    type Error;

    /// Retrieves the owned `DatabaseCommit`.
    fn db_commit(&mut self) -> &mut dyn DatabaseCommit;
}

pub struct CommitCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct JsDatabaseCommit {
    db: JsDatabase,
    db_commit: JsDatabaseCommitInner,
}

impl JsDatabaseCommit {
    /// Creates a new [`JsDatabaseCommit`].
    pub(super) fn new(db: JsDatabase, db_commit: JsDatabaseCommitInner) -> Self {
        Self { db, db_commit }
    }
}

impl Database for JsDatabaseCommit {
    type Error = anyhow::Error;

    fn basic(&mut self, address: H160) -> Result<Option<rethnet_evm::AccountInfo>, Self::Error> {
        self.db.basic(address)
    }

    fn code_by_hash(
        &mut self,
        code_hash: rethnet_evm::H256,
    ) -> Result<rethnet_evm::Bytecode, Self::Error> {
        self.db.code_by_hash(code_hash)
    }

    fn storage(
        &mut self,
        address: H160,
        index: rethnet_evm::U256,
    ) -> Result<rethnet_evm::U256, Self::Error> {
        self.db.storage(address, index)
    }

    fn block_hash(&mut self, number: rethnet_evm::U256) -> Result<rethnet_evm::H256, Self::Error> {
        self.db.block_hash(number)
    }
}

impl DatabaseCommit for JsDatabaseCommit {
    fn commit(&mut self, changes: HashMap<H160, Account>) {
        self.db_commit.commit(changes)
    }
}

pub(crate) struct JsDatabaseCommitInner {
    commit_fn: ThreadsafeFunction<CommitCall>,
}

impl JsDatabaseCommitInner {
    /// Creates a new [`JsDatabaseCommit`].
    pub fn new(env: &napi::Env, callbacks: DatabaseCommitCallbacks) -> napi::Result<Self> {
        let commit_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.commit_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<CommitCall>| {
                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call::<JsUnknown>(None, &[])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        Ok(Self { commit_fn })
    }
}

impl DatabaseCommit for JsDatabaseCommitInner {
    fn commit(&mut self, _changes: HashMap<H160, Account>) {
        let (sender, receiver) = channel();

        let status = self
            .commit_fn
            .call(CommitCall { sender }, ThreadsafeFunctionCallMode::Blocking);
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().expect("Failed to commit")
    }
}
