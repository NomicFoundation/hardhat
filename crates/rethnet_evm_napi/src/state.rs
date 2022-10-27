use std::sync::{
    mpsc::{channel, Sender},
    Arc,
};

use napi::{bindgen_prelude::*, JsFunction, JsObject, NapiRaw, Status};
use napi_derive::napi;
use rethnet_eth::{Address, H256};
use rethnet_evm::{
    db::{AsyncDatabase, LayeredDatabase, RethnetLayer, SyncDatabase},
    AccountInfo, HashMap,
};
use secp256k1::Secp256k1;

use crate::{
    private_key_to_address,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Account, GenesisAccount, TryCast,
};

struct ModifyAccountCall {
    pub account_info: AccountInfo,
    pub sender: Sender<napi::Result<AccountInfo>>,
}

#[napi]
pub struct StateManager {
    pub(super) db: Arc<AsyncDatabase<Box<dyn SyncDatabase<anyhow::Error>>, anyhow::Error>>,
}

#[napi]
impl StateManager {
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        Self::with_db(LayeredDatabase::<RethnetLayer>::default())
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

        let mut database =
            LayeredDatabase::with_layer(RethnetLayer::with_genesis_accounts(genesis_accounts));
        database.add_layer_default();

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
    pub async fn checkpoint(&mut self) -> napi::Result<()> {
        self.db
            .checkpoint()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn revert(&mut self) -> napi::Result<()> {
        self.db
            .revert()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn get_account_by_address(
        &mut self,
        address: Buffer,
    ) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        self.db.account_by_address(address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |account_info| Ok(account_info.map(Account::from)),
        )
    }

    #[napi]
    pub async fn get_code_by_hash(&mut self, code_hash: Buffer) -> napi::Result<Buffer> {
        let code_hash = H256::from_slice(&code_hash);

        self.db.code_by_hash(code_hash).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |code| Ok(Buffer::from(code.bytes().as_ref())),
        )
    }

    #[napi]
    pub async fn get_storage_root(&mut self) -> napi::Result<Buffer> {
        self.db.storage_root().await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |root| Ok(Buffer::from(root.as_ref())),
        )
    }

    #[napi]
    pub async fn insert_account(&mut self, address: Buffer, account: Account) -> napi::Result<()> {
        let address = Address::from_slice(&address);
        let account = account.try_cast()?;

        self.db
            .insert_account(address, account)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn insert_block(
        &mut self,
        block_number: BigInt,
        block_hash: Buffer,
    ) -> napi::Result<()> {
        let block_number = BigInt::try_cast(block_number)?;
        let block_hash = H256::from_slice(&block_hash);

        self.db
            .insert_block(block_number, block_hash)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn modify_account(
        &mut self,
        env: Env,
        address: Buffer,
        #[napi(ts_arg_type = "(account: Account) => Promise<Account>")]
        modify_account_fn: JsFunction,
    ) -> napi::Result<JsObject> {
        let address = Address::from_slice(&address);

        let modify_account_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { modify_account_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<ModifyAccountCall>| {
                let sender = ctx.value.sender.clone();

                let mut account = ctx.env.create_object()?;

                let balance = ctx.env.create_bigint_from_words(
                    false,
                    ctx.value.account_info.balance.into_limbs().to_vec(),
                )?;
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

                let promise = ctx.callback.call(None, &[account.into_unknown()])?;
                let result =
                    await_promise::<Account, AccountInfo>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        let (deferred, promise) = env.create_deferred()?;
        let db = self.db.clone();

        self.db.runtime().spawn(async move {
            let result = db
                .modify_account(
                    address,
                    Box::new(move |account_info: &mut AccountInfo| {
                        let (sender, receiver) = channel();

                        let status = modify_account_fn.call(
                            ModifyAccountCall {
                                sender,
                                account_info: account_info.clone(),
                            },
                            ThreadsafeFunctionCallMode::Blocking,
                        );
                        assert_eq!(status, Status::Ok);

                        *account_info = receiver.recv().unwrap().expect("Failed to commit");
                    }),
                )
                .await
                .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()));

            deferred.resolve(|_| result);
        });

        Ok(promise)
    }

    #[napi]
    pub async fn remove_account(&mut self, address: Buffer) -> napi::Result<Option<Account>> {
        let address = Address::from_slice(&address);

        self.db.remove_account(address).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |account| Ok(account.map(Account::from)),
        )
    }
}
