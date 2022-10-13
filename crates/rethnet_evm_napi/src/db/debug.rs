use std::sync::mpsc::{channel, Sender};

use anyhow::anyhow;
use napi::{bindgen_prelude::Buffer, JsUnknown, NapiRaw, Status};
use rethnet_evm::{
    Account, AccountInfo, Bytecode, Database, DatabaseCommit, DatabaseDebug, HasDatabaseDebug,
    HashMap, H160, H256, U256,
};

use crate::{
    sync::{await_promise, await_void_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    DatabaseDebugCallbacks,
};

use super::{JsDatabase, JsDatabaseCommitInner};

pub struct CheckpointCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct RevertCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct GetStorageRootCall {
    pub sender: Sender<napi::Result<H256>>,
}

pub struct InsertAccountCall {
    pub address: H160,
    pub account_info: AccountInfo,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountBalanceCall {
    pub address: H160,
    pub balance: U256,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountCodeCall {
    pub address: H160,
    pub code: Bytecode,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountNonceCall {
    pub address: H160,
    pub nonce: u64,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountStorageSlotCall {
    pub address: H160,
    pub index: U256,
    pub value: U256,
    pub sender: Sender<napi::Result<()>>,
}

pub struct JsDatabaseDebug {
    db: JsDatabase,
    db_debug: JsDatabaseDebugInner,
}

impl JsDatabaseDebug {
    /// Creates a new [`JsDatabaseDebug`].
    pub(super) fn new(db: JsDatabase, db_debug: JsDatabaseDebugInner) -> Self {
        Self { db, db_debug }
    }
}

impl HasDatabaseDebug for JsDatabaseDebug {
    type Error = anyhow::Error;

    fn db_debug(&mut self) -> &mut dyn DatabaseDebug<Error = Self::Error> {
        &mut self.db_debug
    }
}

impl Database for JsDatabaseDebug {
    type Error = anyhow::Error;

    fn basic(&mut self, address: rethnet_evm::H160) -> Result<Option<AccountInfo>, Self::Error> {
        self.db.basic(address)
    }

    fn code_by_hash(
        &mut self,
        code_hash: rethnet_evm::H256,
    ) -> Result<rethnet_evm::Bytecode, Self::Error> {
        self.db.code_by_hash(code_hash)
    }

    fn storage(&mut self, address: rethnet_evm::H160, index: U256) -> Result<U256, Self::Error> {
        self.db.storage(address, index)
    }

    fn block_hash(&mut self, number: U256) -> Result<rethnet_evm::H256, Self::Error> {
        self.db.block_hash(number)
    }
}

pub struct JsDatabaseCommitDebug {
    db: JsDatabase,
    db_commit: JsDatabaseCommitInner,
    db_debug: JsDatabaseDebugInner,
}

impl JsDatabaseCommitDebug {
    /// Creates a new [`JsDatabaseCommitDebug`].
    pub(super) fn new(
        db: JsDatabase,
        db_commit: JsDatabaseCommitInner,
        db_debug: JsDatabaseDebugInner,
    ) -> Self {
        Self {
            db,
            db_commit,
            db_debug,
        }
    }
}

impl HasDatabaseDebug for JsDatabaseCommitDebug {
    type Error = anyhow::Error;

    fn db_debug(&mut self) -> &mut dyn rethnet_evm::DatabaseDebug<Error = Self::Error> {
        &mut self.db_debug
    }
}

impl Database for JsDatabaseCommitDebug {
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

impl DatabaseCommit for JsDatabaseCommitDebug {
    fn commit(&mut self, changes: HashMap<H160, Account>) {
        self.db_commit.commit(changes)
    }
}

pub(crate) struct JsDatabaseDebugInner {
    checkpoint_fn: ThreadsafeFunction<CheckpointCall>,
    revert_fn: ThreadsafeFunction<RevertCall>,
    get_storage_root_fn: ThreadsafeFunction<GetStorageRootCall>,
    insert_account_fn: ThreadsafeFunction<InsertAccountCall>,
    set_account_balance_fn: ThreadsafeFunction<SetAccountBalanceCall>,
    set_account_code_fn: ThreadsafeFunction<SetAccountCodeCall>,
    set_account_nonce_fn: ThreadsafeFunction<SetAccountNonceCall>,
    set_account_storage_slot_fn: ThreadsafeFunction<SetAccountStorageSlotCall>,
}

impl JsDatabaseDebugInner {
    /// Creates a new `JsDatabaseDebug`.
    pub fn new(env: &napi::Env, callbacks: DatabaseDebugCallbacks) -> napi::Result<Self> {
        let checkpoint_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.checkpoint_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<CheckpointCall>| {
                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call::<JsUnknown>(None, &[])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let revert_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.revert_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<RevertCall>| {
                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call::<JsUnknown>(None, &[])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let get_storage_root_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.get_storage_root_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<GetStorageRootCall>| {
                let sender = ctx.value.sender.clone();

                let promise = ctx.callback.call::<JsUnknown>(None, &[])?;
                let result = await_promise::<Buffer, H256>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let insert_account_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.insert_account_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<InsertAccountCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let mut account = ctx.env.create_object()?;

                let balance = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.account_info.balance.0.to_vec())?;
                account.set_named_property("balance", balance)?;

                let nonce = ctx
                    .env
                    .create_bigint_from_u64(ctx.value.account_info.nonce)?;
                account.set_named_property("nonce", nonce)?;

                let code_hash = ctx
                    .env
                    .create_buffer_copy(ctx.value.account_info.code_hash.as_bytes())?
                    .into_raw();
                account.set_named_property("codeHash", code_hash)?;

                if let Some(code) = ctx.value.account_info.code {
                    let code = ctx
                        .env
                        .create_buffer_copy(code.bytes().as_ref())?
                        .into_raw();

                    account.set_named_property("code", code)?;
                } else {
                    account.set_named_property("code", ctx.env.get_null()?)?;
                }

                let promise = ctx
                    .callback
                    .call(None, &[address.into_unknown(), account.into_unknown()])?;

                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let set_account_balance_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.set_account_balance_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<SetAccountBalanceCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let balance = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.balance.0.to_vec())?;

                let promise = ctx
                    .callback
                    .call(None, &[address.into_unknown(), balance.into_unknown()?])?;

                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let set_account_code_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.set_account_code_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<SetAccountCodeCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let code = ctx
                    .env
                    .create_buffer_copy(ctx.value.code.bytes().as_ref())?
                    .into_raw();

                let promise = ctx.callback.call(None, &[address, code])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let set_account_nonce_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.set_account_nonce_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<SetAccountNonceCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let nonce = ctx.env.create_bigint_from_u64(ctx.value.nonce)?;

                let promise = ctx
                    .callback
                    .call(None, &[address.into_unknown(), nonce.into_unknown()?])?;

                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let set_account_storage_slot_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.set_account_storage_slot_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<SetAccountStorageSlotCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let index = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.index.0.to_vec())?;

                let value = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.value.0.to_vec())?;

                let promise = ctx.callback.call(
                    None,
                    &[
                        address.into_unknown(),
                        index.into_unknown()?,
                        value.into_unknown()?,
                    ],
                )?;

                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            checkpoint_fn,
            revert_fn,
            get_storage_root_fn,
            insert_account_fn,
            set_account_balance_fn,
            set_account_code_fn,
            set_account_nonce_fn,
            set_account_storage_slot_fn,
        })
    }
}

impl DatabaseDebug for JsDatabaseDebugInner {
    type Error = anyhow::Error;

    fn insert_account(
        &mut self,
        address: H160,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.insert_account_fn.call(
            InsertAccountCall {
                address,
                account_info,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn insert_block(&mut self, _block_number: U256, _block_hash: H256) -> Result<(), Self::Error> {
        todo!()
    }

    fn set_account_balance(&mut self, address: H160, balance: U256) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_balance_fn.call(
            SetAccountBalanceCall {
                address,
                balance,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_code(
        &mut self,
        address: H160,
        code: rethnet_evm::Bytecode,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_code_fn.call(
            SetAccountCodeCall {
                address,
                code,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_nonce(&mut self, address: H160, nonce: u64) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_nonce_fn.call(
            SetAccountNonceCall {
                address,
                nonce,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_storage_slot(
        &mut self,
        address: H160,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_storage_slot_fn.call(
            SetAccountStorageSlotCall {
                address,
                index,
                value,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn storage_root(&mut self) -> Result<H256, Self::Error> {
        let (sender, receiver) = channel();

        let status = self.get_storage_root_fn.call(
            GetStorageRootCall { sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.checkpoint_fn.call(
            CheckpointCall { sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self
            .revert_fn
            .call(RevertCall { sender }, ThreadsafeFunctionCallMode::Blocking);
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }
}
