use std::sync::mpsc::{channel, Sender};

use anyhow::anyhow;
use napi::{bindgen_prelude::BigInt, NapiRaw, Status};
use rethnet_evm::{AccountInfo, Bytecode, Database, H160, H256, U256};

use crate::{
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Account, DatabaseCallbacks,
};

pub struct GetAccountByAddressCall {
    pub address: H160,
    pub sender: Sender<napi::Result<AccountInfo>>,
}

pub struct GetAccountStorageSlotCall {
    pub address: H160,
    pub index: U256,
    pub sender: Sender<napi::Result<U256>>,
}

pub struct JsDatabase {
    get_account_by_address_fn: ThreadsafeFunction<GetAccountByAddressCall>,
    get_account_storage_slot_fn: ThreadsafeFunction<GetAccountStorageSlotCall>,
}

impl JsDatabase {
    /// Creates a new [`JsDatabase`].
    pub fn new(env: &napi::Env, callbacks: DatabaseCallbacks) -> napi::Result<Self> {
        let get_account_by_address_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.get_account_by_address_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<GetAccountByAddressCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx.env.create_buffer_copy(ctx.value.address.as_bytes())?;

                let promise = ctx.callback.call(None, &[address.into_raw()])?;
                let result =
                    await_promise::<Account, AccountInfo>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let get_account_storage_slot_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { callbacks.get_account_storage_slot_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<GetAccountStorageSlotCall>| {
                let sender = ctx.value.sender.clone();
                let address = ctx
                    .env
                    .create_buffer_copy(ctx.value.address.as_bytes())?
                    .into_raw();

                let index = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.index.0.to_vec())?;

                let promise = ctx
                    .callback
                    .call(None, &[address.into_unknown(), index.into_unknown()?])?;

                let result = await_promise::<BigInt, U256>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            get_account_by_address_fn,
            get_account_storage_slot_fn,
        })
    }
}

impl Database for JsDatabase {
    type Error = anyhow::Error;

    fn basic(&mut self, address: H160) -> anyhow::Result<Option<AccountInfo>> {
        let (sender, receiver) = channel();

        let status = self.get_account_by_address_fn.call(
            GetAccountByAddressCall { address, sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_or_else(
            |e| Err(anyhow!(e.to_string())),
            |account_info| Ok(Some(account_info)),
        )
    }

    fn code_by_hash(&mut self, _code_hash: H256) -> anyhow::Result<Bytecode> {
        todo!()
    }

    fn storage(&mut self, address: H160, index: U256) -> anyhow::Result<U256> {
        let (sender, receiver) = channel();

        let status = self.get_account_storage_slot_fn.call(
            GetAccountStorageSlotCall {
                address,
                index,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn block_hash(&mut self, _number: U256) -> anyhow::Result<H256> {
        todo!()
    }
}
