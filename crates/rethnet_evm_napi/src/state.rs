use std::sync::{
    mpsc::{channel, Sender},
    Arc,
};

use napi::{bindgen_prelude::*, JsFunction, JsNumber, JsObject, JsString, NapiRaw, Status};
use napi_derive::napi;
use rethnet_eth::{signature::private_key_to_address, Address, B256, U256};
use rethnet_evm::{
    state::{AsyncState, ForkState, LayeredState, RethnetLayer, StateDebug, StateError, SyncState},
    AccountInfo, Bytecode, HashMap, KECCAK_EMPTY,
};
use secp256k1::Secp256k1;

use crate::{
    account::Account,
    cast::TryCast,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

struct ModifyAccountCall {
    pub balance: U256,
    pub nonce: u64,
    pub code: Option<Bytecode>,
    pub sender: Sender<napi::Result<AccountInfo>>,
}

/// An account that needs to be created during the genesis block.
#[napi(object)]
pub struct GenesisAccount {
    /// Account private key
    pub private_key: String,
    /// Account balance
    pub balance: BigInt,
}

/// The Rethnet state
#[napi]
pub struct StateManager {
    pub(super) state: Arc<AsyncState<StateError>>,
}

#[napi]
impl StateManager {
    /// Constructs a [`StateManager`] with an empty state.
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        Self::with_accounts(HashMap::default())
    }

    fn map_accounts(accounts: Vec<GenesisAccount>) -> Result<HashMap<Address, AccountInfo>> {
        let context = Secp256k1::signing_only();
        accounts
            .into_iter()
            .map(|account| {
                let address = private_key_to_address(&context, &account.private_key)
                    .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;
                TryCast::<U256>::try_cast(account.balance).map(|balance| {
                    let account_info = AccountInfo {
                        balance,
                        ..Default::default()
                    };

                    (address, account_info)
                })
            })
            .collect::<napi::Result<HashMap<Address, AccountInfo>>>()
    }

    /// Constructs a [`StateManager`] with the provided accounts present in the genesis state.
    #[napi(factory)]
    pub fn with_genesis_accounts(accounts: Vec<GenesisAccount>) -> napi::Result<Self> {
        let genesis_accounts = Self::map_accounts(accounts)?;

        Self::with_accounts(genesis_accounts)
    }

    fn init_precompiles(accounts: HashMap<Address, AccountInfo>) -> HashMap<Address, AccountInfo> {
        // Mimic precompiles activation
        let mut accounts = accounts;
        for idx in 1..=8 {
            let mut address = Address::zero();
            address.0[19] = idx;
            accounts.insert(address, AccountInfo::default());
        }
        accounts
    }

    fn with_accounts(accounts: HashMap<Address, AccountInfo>) -> napi::Result<Self> {
        let accounts = Self::init_precompiles(accounts);
        let mut state = LayeredState::with_layer(RethnetLayer::with_genesis_accounts(accounts));

        state.checkpoint().unwrap();

        Self::with_state(state)
    }

    fn with_state<S>(state: S) -> napi::Result<Self>
    where
        S: SyncState<StateError>,
    {
        let state: Box<dyn SyncState<StateError>> = Box::new(state);
        let state = AsyncState::new(state)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self {
            state: Arc::new(state),
        })
    }

    /// Constructs a [`StateManager`] that uses the remote node and block number as the basis for
    /// its state.
    #[napi(factory)]
    pub fn with_fork(
        remote_node_url: JsString,
        accounts: Vec<GenesisAccount>,
        fork_block_number: Option<JsNumber>,
    ) -> napi::Result<Self> {
        let fork_block_number: Option<U256> = if fork_block_number.is_some() {
            let fork_block_number: i64 = fork_block_number.unwrap().try_into()?;
            Some(U256::from(fork_block_number))
        } else {
            None
        };
        let accounts = Self::map_accounts(accounts)?;
        let accounts = Self::init_precompiles(accounts);
        Self::with_state(ForkState::new(
            remote_node_url.into_utf8()?.as_str()?,
            accounts,
            fork_block_number,
        ))
    }

    /// Creates a state checkpoint that can be reverted to using [`revert`].
    #[napi]
    pub async fn checkpoint(&self) -> napi::Result<()> {
        self.state
            .checkpoint()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    #[napi]
    pub async fn revert(&self) -> napi::Result<()> {
        self.state
            .revert()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    /// Retrieves the account corresponding to the specified address.
    #[napi]
    pub async fn get_account_by_address(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        let mut account_info = self
            .state
            .account_by_address(address)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        if let Some(account_info) = &mut account_info {
            if account_info.code.is_none() && account_info.code_hash != KECCAK_EMPTY {
                account_info.code = Some(
                    self.state
                        .code_by_hash(account_info.code_hash)
                        .await
                        .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?,
                );
            }
        }

        Ok(account_info.map(Account::from))
    }

    /// Retrieves the storage root of the account at the specified address.
    #[napi]
    pub async fn get_account_storage_root(&self, address: Buffer) -> napi::Result<Option<Buffer>> {
        let address = Address::from_slice(&address);

        self.state.account_storage_root(&address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |root| Ok(root.map(|root| Buffer::from(root.as_ref()))),
        )
    }

    /// Retrieves the storage slot at the specified address and index.
    #[napi]
    pub async fn get_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
    ) -> napi::Result<BigInt> {
        let address = Address::from_slice(&address);
        let index: U256 = BigInt::try_cast(index)?;

        self.state
            .account_storage_slot(address, index)
            .await
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
    pub async fn get_state_root(&self) -> napi::Result<Buffer> {
        self.state.state_root().await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |root| Ok(Buffer::from(root.as_ref())),
        )
    }

    /// Inserts the provided account at the specified address.
    #[napi]
    pub async fn insert_account(&self, address: Buffer, account: Account) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let account: AccountInfo = account.try_cast()?;

        self.state
            .insert_account(address, account)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    /// Makes a snapshot of the database that's retained until [`removeSnapshot`] is called. Returns the snapshot's identifier.
    #[napi]
    pub async fn make_snapshot(&self) -> Buffer {
        <B256 as AsRef<[u8]>>::as_ref(&self.state.make_snapshot().await).into()
    }

    /// Modifies the account with the provided address using the specified modifier function.
    /// The modifier function receives the current values as individual parameters and will update the account's values
    /// to the returned `Account` values.
    #[napi(ts_return_type = "Promise<void>")]
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
            |ctx: ThreadSafeCallContext<ModifyAccountCall>| {
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
                        .create_buffer_copy(code.hash())
                        .and_then(|hash| bytecode.set_named_property("hash", hash.into_raw()))?;

                    ctx.env
                        .create_buffer_copy(&code.bytes()[..code.len()])
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
        let db = self.state.clone();

        self.state.runtime().spawn(async move {
            let result = db
                .modify_account(
                    address,
                    Box::new(
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
                    ),
                )
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()));

            deferred.resolve(|_| result);
        });

        Ok(promise)
    }

    /// Removes and returns the account at the specified address, if it exists.
    #[napi]
    pub async fn remove_account(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        self.state.remove_account(address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |account| Ok(account.map(Account::from)),
        )
    }

    /// Removes the snapshot corresponding to the specified state root, if it exists. Returns whether a snapshot was removed.
    #[napi]
    pub async fn remove_snapshot(&self, state_root: Buffer) -> bool {
        let state_root = B256::from_slice(&state_root);

        self.state.remove_snapshot(state_root).await
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    #[napi]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let index: U256 = BigInt::try_cast(index)?;
        let value: U256 = BigInt::try_cast(value)?;

        self.state
            .set_account_storage_slot(address, index, value)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    /// Reverts the state to match the specified state root.
    #[napi]
    pub async fn set_state_root(&self, state_root: Buffer) -> napi::Result<()> {
        let state_root = B256::from_slice(&state_root);

        self.state
            .set_state_root(&state_root)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_block_context(
        &self,
        block_number: BigInt,
        state_root: Buffer,
    ) -> napi::Result<()> {
        let state_root = B256::from_slice(&state_root);

        self.state
            .set_block_context(BigInt::try_cast(block_number)?, &state_root)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn restore_fork_block_context(&self, state_root: Buffer) -> napi::Result<()> {
        let state_root = B256::from_slice(&state_root);

        self.state
            .restore_fork_block_context(&state_root)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }
}
