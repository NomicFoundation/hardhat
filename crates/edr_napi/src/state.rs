mod irregular;
mod overrides;

use std::{
    mem,
    ops::Deref,
    sync::{
        mpsc::{channel, Sender},
        Arc,
    },
};

use edr_eth::{Address, Bytes, U256};
use edr_evm::{
    state::{AccountModifierFn, AccountTrie, StateError, SyncState, TrieState},
    AccountInfo, Bytecode, HashMap, KECCAK_EMPTY,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer, ObjectFinalize},
    tokio::runtime,
    Env, JsFunction, JsObject, NapiRaw, Status,
};
use napi_derive::napi;
pub use overrides::*;
use parking_lot::RwLock;

pub use self::{irregular::IrregularState, overrides::*};
use crate::{
    account::{add_precompiles, genesis_accounts, Account, GenesisAccount},
    cast::TryCast,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

// An arbitrarily large amount of memory to signal to the javascript garbage
// collector that it needs to attempt to free the state object's memory.
const STATE_MEMORY_SIZE: i64 = 10_000;

struct ModifyAccountCall {
    pub balance: U256,
    pub nonce: u64,
    pub code: Option<Bytecode>,
    pub sender: Sender<napi::Result<AccountInfo>>,
}

/// The EDR state
#[napi(custom_finalize)]
#[derive(Debug)]
pub struct State {
    state: Arc<RwLock<Box<dyn SyncState<StateError>>>>,
}

impl From<Box<dyn SyncState<StateError>>> for State {
    fn from(state: Box<dyn SyncState<StateError>>) -> Self {
        Self {
            state: Arc::new(RwLock::new(state)),
        }
    }
}

impl State {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn with_state<S>(env: &mut Env, state: S) -> napi::Result<Self>
    where
        S: SyncState<StateError> + 'static,
    {
        // Signal that memory was externally allocated
        env.adjust_external_memory(STATE_MEMORY_SIZE)?;

        Ok(Self {
            state: Arc::new(RwLock::new(Box::new(state))),
        })
    }
}

impl Deref for State {
    type Target = Arc<RwLock<Box<dyn SyncState<StateError>>>>;

    fn deref(&self) -> &Self::Target {
        &self.state
    }
}

#[napi]
impl State {
    /// Constructs a [`State`] with an empty state.
    #[napi(constructor)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(mut env: Env) -> napi::Result<Self> {
        let mut accounts = HashMap::new();
        add_precompiles(&mut accounts);

        let state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));
        Self::with_state(&mut env, state)
    }

    /// Constructs a [`State`] with the provided accounts present in the genesis
    /// state.
    #[napi(factory)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_genesis_accounts(
        mut env: Env,
        accounts: Vec<GenesisAccount>,
    ) -> napi::Result<Self> {
        let mut accounts = genesis_accounts(accounts)?;
        add_precompiles(&mut accounts);

        let state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));
        Self::with_state(&mut env, state)
    }

    #[doc = "Clones the state"]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn deep_clone(&self) -> napi::Result<State> {
        let state = self.state.clone();

        runtime::Handle::current()
            .spawn_blocking(move || {
                let state = state.read().clone();

                Self {
                    state: Arc::new(RwLock::new(state)),
                }
            })
            .await
            .map_err(|error| napi::Error::new(Status::GenericFailure, error.to_string()))
    }

    /// Retrieves the account corresponding to the specified address.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn get_account_by_address(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                let state = state.read();

                state.basic(address).and_then(|account_info| {
                    account_info.map_or(Ok(None), |mut account_info| {
                        if account_info.code_hash != KECCAK_EMPTY {
                            account_info.code = Some(state.code_by_hash(account_info.code_hash)?);
                        }

                        Ok(Some(account_info))
                    })
                })
            })
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |account_info| Ok(account_info.map(Account::from)),
            )
    }

    /// Retrieves the storage root of the account at the specified address.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn get_account_storage_root(&self, address: Buffer) -> napi::Result<Option<Buffer>> {
        let address = Address::from_slice(&address);

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.read().account_storage_root(&address))
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |root| Ok(root.map(|root| Buffer::from(root.as_ref()))),
            )
    }

    /// Retrieves the storage slot at the specified address and index.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn get_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
    ) -> napi::Result<BigInt> {
        let address = Address::from_slice(&address);
        let index: U256 = BigInt::try_cast(index)?;

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.read().storage(address, index))
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |value| {
                    Ok(BigInt {
                        sign_bit: false,
                        words: value.into_limbs().to_vec(),
                    })
                },
            )
    }

    /// Retrieves the storage root of the database.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn get_state_root(&self) -> napi::Result<Buffer> {
        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.read().state_root())
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |root| Ok(Buffer::from(root.as_ref())),
            )
    }

    /// Inserts the provided account at the specified address.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn insert_account(&self, address: Buffer, account: Account) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let account_info: AccountInfo = account.try_cast()?;

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.write().insert_account(address, account_info))
            .await
            .unwrap()
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    /// Modifies the account with the provided address using the specified
    /// modifier function. The modifier function receives the current values
    /// as individual parameters and will update the account's values to the
    /// returned `Account` values.
    #[napi(ts_return_type = "Promise<Account>")]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn modify_account(
        &self,
        env: Env,
        address: Buffer,
        #[napi(
            ts_arg_type = "(balance: bigint, nonce: bigint, code: Bytecode | undefined) => Promise<Account>"
        )]
        modify_account_fn: JsFunction,
    ) -> napi::Result<JsObject> {
        let address = Address::from_slice(&address);

        let modify_account_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { modify_account_fn.raw() },
            0,
            |mut ctx: ThreadSafeCallContext<ModifyAccountCall>| {
                #[cfg(feature = "tracing")]
                let span = tracing::span!(
                    tracing::Level::TRACE,
                    "modify_account_threadsafe_function_call"
                );

                #[cfg(feature = "tracing")]
                let _span_guard = span.enter();

                let sender = ctx.value.sender.clone();

                let balance = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.balance.into_limbs().to_vec())?
                    .into_unknown()?;

                let nonce = ctx
                    .env
                    .create_bigint_from_u64(ctx.value.nonce)?
                    .into_unknown()?;

                let code = if let Some(code) = ctx.value.code {
                    let mut bytecode = ctx.env.create_object()?;

                    ctx.env
                        .create_buffer_copy(code.hash_slow())
                        .and_then(|hash| bytecode.set_named_property("hash", hash.into_raw()))?;

                    let code = code.original_bytes();

                    ctx.env
                        .adjust_external_memory(code.len() as i64)
                        .expect("Failed to adjust external memory");

                    unsafe {
                        ctx.env.create_buffer_with_borrowed_data(
                            code.as_ptr(),
                            code.len(),
                            code,
                            |code: Bytes, mut env| {
                                env.adjust_external_memory(-(code.len() as i64))
                                    .expect("Failed to adjust external memory");

                                mem::drop(code);
                            },
                        )
                    }
                    .and_then(|code| bytecode.set_named_property("code", code.into_raw()))?;

                    bytecode.into_unknown()
                } else {
                    ctx.env.get_undefined()?.into_unknown()
                };

                let promise = ctx.callback.call(None, &[balance, nonce, code])?;
                let result =
                    await_promise::<Account, AccountInfo>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let (deferred, promise) = env.create_deferred()?;
        let state = self.state.clone();
        runtime::Handle::current().spawn_blocking(move || {
            let mut state = state.write();

            let result = state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(
                        move |balance: &mut U256, nonce: &mut u64, code: &mut Option<Bytecode>| {
                            let (sender, receiver) = channel();

                            let status = modify_account_fn.call(
                                ModifyAccountCall {
                                    sender,
                                    balance: *balance,
                                    nonce: *nonce,
                                    code: code.clone(),
                                },
                                ThreadsafeFunctionCallMode::Blocking,
                            );
                            assert_eq!(status, Status::Ok);

                            let new_account = receiver.recv().unwrap().expect("Failed to commit");

                            *balance = new_account.balance;
                            *nonce = new_account.nonce;
                            *code = new_account.code;
                        },
                    )),
                    &|| {
                        Ok(AccountInfo {
                            code: None,
                            ..AccountInfo::default()
                        })
                    },
                )
                .map_or_else(
                    |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                    |mut account_info| {
                        // Add the code to the account info if it exists
                        if account_info.code_hash != KECCAK_EMPTY {
                            account_info.code = Some(
                                state
                                    .code_by_hash(account_info.code_hash)
                                    .expect("Code must exist"),
                            );
                        }

                        Ok(Account::from(account_info))
                    },
                );

            deferred.resolve(|_| result);
        });

        Ok(promise)
    }

    /// Removes and returns the account at the specified address, if it exists.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn remove_account(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.write().remove_account(address))
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |account| Ok(account.map(Account::from)),
            )
    }

    /// Serializes the state using ordering of addresses and storage indices.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub async fn serialize(&self) -> String {
        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || state.read().serialize())
            .await
            .unwrap()
    }

    /// Sets the storage slot at the specified address and index to the provided
    /// value.
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> napi::Result<BigInt> {
        let address = Address::from_slice(&address);
        let index: U256 = BigInt::try_cast(index)?;
        let value: U256 = BigInt::try_cast(value)?;

        let state = self.state.clone();
        runtime::Handle::current()
            .spawn_blocking(move || {
                state
                    .write()
                    .set_account_storage_slot(address, index, value)
            })
            .await
            .unwrap()
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |value| {
                    Ok(BigInt {
                        sign_bit: false,
                        words: value.into_limbs().to_vec(),
                    })
                },
            )
    }
}

impl ObjectFinalize for State {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn finalize(self, mut env: Env) -> napi::Result<()> {
        // Signal that the externally allocated memory has been freed
        env.adjust_external_memory(-STATE_MEMORY_SIZE)?;

        Ok(())
    }
}
