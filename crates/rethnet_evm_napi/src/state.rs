use std::sync::{
    mpsc::{channel, Sender},
    Arc,
};

use napi::{bindgen_prelude::*, JsFunction, JsObject, NapiRaw, Status};
use napi_derive::napi;
use rethnet_eth::{Address, B256, U256};
use rethnet_evm::{
    db::{AsyncDatabase, LayeredDatabase, RethnetLayer, SyncDatabase},
    AccountInfo, Bytecode, DatabaseDebug, HashMap,
};
use secp256k1::Secp256k1;

use crate::{
    private_key_to_address,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Account, AccountData, GenesisAccount, TryCast,
};

struct ModifyAccountCall {
    pub balance: U256,
    pub nonce: u64,
    pub code: Option<Bytecode>,
    pub sender: Sender<napi::Result<(U256, u64, Option<Bytecode>)>>,
}

#[napi]
pub struct StateManager {
    pub(super) db: Arc<AsyncDatabase<Box<dyn SyncDatabase<anyhow::Error>>, anyhow::Error>>,
}

#[napi]
impl StateManager {
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        Self::with_accounts(HashMap::default())
    }

    #[napi(factory)]
    pub fn with_genesis_accounts(accounts: Vec<GenesisAccount>) -> napi::Result<Self> {
        let context = Secp256k1::signing_only();
        let genesis_accounts = accounts
            .into_iter()
            .map(|account| {
                let address = private_key_to_address(&context, account.private_key)?;
                account.balance.try_cast().map(|balance| {
                    let account_info = AccountInfo {
                        balance,
                        ..Default::default()
                    };

                    (address, account_info)
                })
            })
            .collect::<napi::Result<HashMap<Address, AccountInfo>>>()?;

        Self::with_accounts(genesis_accounts)
    }

    fn with_accounts(mut accounts: HashMap<Address, AccountInfo>) -> napi::Result<Self> {
        // Mimic precompiles activation
        for idx in 1..=8 {
            let mut address = Address::zero();
            address.0[19] = idx;
            accounts.insert(address, AccountInfo::default());
        }

        let mut database =
            LayeredDatabase::with_layer(RethnetLayer::with_genesis_accounts(accounts));

        database.checkpoint().unwrap();

        Self::with_db(database)
    }

    fn with_db<D>(db: D) -> napi::Result<Self>
    where
        D: SyncDatabase<anyhow::Error>,
    {
        let db: Box<dyn SyncDatabase<anyhow::Error>> = Box::new(db);
        let db = AsyncDatabase::new(db)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self { db: Arc::new(db) })
    }

    #[napi]
    pub async fn checkpoint(&self) -> napi::Result<()> {
        self.db
            .checkpoint()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn revert(&self) -> napi::Result<()> {
        self.db
            .revert()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn get_account_by_address(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        self.db.account_by_address(address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |account_info| Ok(account_info.map(Account::from)),
        )
    }

    /// Retrieves the storage root of the account at the specified address.
    #[napi]
    pub async fn get_account_storage_root(&self, address: Buffer) -> napi::Result<Option<Buffer>> {
        let address = Address::from_slice(&address);

        self.db.account_storage_root(&address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |root| Ok(root.map(|root| Buffer::from(root.as_ref()))),
        )
    }

    #[napi]
    pub async fn get_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
    ) -> napi::Result<BigInt> {
        let address = Address::from_slice(&address);
        let index = BigInt::try_cast(index)?;

        self.db
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

    #[napi]
    pub async fn get_code_by_hash(&self, code_hash: Buffer) -> napi::Result<Buffer> {
        let code_hash = B256::from_slice(&code_hash);

        self.db.code_by_hash(code_hash).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |code| Ok(Buffer::from(&code.bytes()[..code.len()])),
        )
    }

    #[napi]
    pub async fn get_state_root(&self) -> napi::Result<Buffer> {
        self.db.state_root().await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |root| Ok(Buffer::from(root.as_ref())),
        )
    }

    #[napi]
    pub async fn insert_account(&self, address: Buffer, account: Account) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let account = account.try_cast()?;

        self.db
            .insert_account(address, account)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn make_snapshot(&self) -> Buffer {
        <B256 as AsRef<[u8]>>::as_ref(&self.db.make_snapshot().await).into()
    }

    /// Modifies the account with the provided address using the specified modifier function.
    /// The modifier function receives the current values as individual parameters and will update the account's values
    /// to the returned `AccountData` values.
    #[napi(ts_return_type = "Promise<void>")]
    pub fn modify_account(
        &self,
        env: Env,
        address: Buffer,
        #[napi(
            ts_arg_type = "(balance: bigint, nonce: bigint, code: Buffer | undefined) => Promise<AccountData>"
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
                    ctx.env
                        .create_buffer_copy(&code.bytes()[..code.len()])?
                        .into_unknown()
                } else {
                    ctx.env.get_null()?.into_unknown()
                };

                let promise = ctx.callback.call(None, &[balance, nonce, code])?;
                let result = await_promise::<AccountData, (U256, u64, Option<Bytecode>)>(
                    ctx.env,
                    promise,
                    ctx.value.sender,
                );

                handle_error(sender, result)
            },
        )?;

        let (deferred, promise) = env.create_deferred()?;
        let db = self.db.clone();

        self.db.runtime().spawn(async move {
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

                            let (new_balance, new_nonce, new_code) =
                                receiver.recv().unwrap().expect("Failed to commit");

                            *balance = new_balance;
                            *nonce = new_nonce;
                            *code = new_code;
                        },
                    ),
                )
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()));

            deferred.resolve(|_| result);
        });

        Ok(promise)
    }

    #[napi]
    pub async fn remove_account(&self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        self.db.remove_account(address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |account| Ok(account.map(Account::from)),
        )
    }

    #[napi]
    pub async fn remove_snapshot(&self, state_root: Buffer) -> bool {
        let state_root = B256::from_slice(&state_root);

        self.db.remove_snapshot(state_root).await
    }

    #[napi]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let index = BigInt::try_cast(index)?;
        let value = BigInt::try_cast(value)?;

        self.db
            .set_account_storage_slot(address, index, value)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_state_root(&self, state_root: Buffer) -> napi::Result<()> {
        let state_root = B256::from_slice(&state_root);

        self.db
            .set_state_root(&state_root)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }
}
