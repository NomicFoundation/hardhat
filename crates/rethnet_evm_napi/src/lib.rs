mod cast;
mod db;
mod sync;
mod threadsafe_function;

use std::{fmt::Debug, str::FromStr};

use napi::{bindgen_prelude::*, JsUnknown, NapiRaw};
use napi_derive::napi;
use rethnet_evm::{
    sync::Client, AccountInfo, Bytes, CreateScheme, HashMap, LayeredDatabase, TransactTo, TxEnv,
    H160, H256, U256,
};
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use sha3::{Digest, Keccak256};

use crate::{
    cast::TryCast,
    db::{
        CallbackDatabase, CommitCall, GetAccountByAddressCall, GetAccountStorageSlotCall,
        GetStorageRootCall, InsertAccountCall, SetAccountBalanceCall, SetAccountCodeCall,
        SetAccountNonceCall, SetAccountStorageSlotCall,
    },
    sync::{await_promise, await_void_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction},
};

#[napi(object)]
pub struct Account {
    /// Account balance
    #[napi(readonly)]
    pub balance: BigInt,
    /// Account nonce
    #[napi(readonly)]
    pub nonce: BigInt,
    /// 256-bit code hash
    #[napi(readonly)]
    pub code_hash: Buffer,
    /// Optionally, byte code
    #[napi(readonly)]
    pub code: Option<Buffer>,
}

impl Debug for Account {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Account")
            .field("balance", &self.balance)
            .field("nonce", &self.nonce)
            .field("code_hash", &self.code_hash.as_ref())
            .finish()
    }
}

impl From<AccountInfo> for Account {
    fn from(account_info: AccountInfo) -> Self {
        Self {
            balance: BigInt {
                sign_bit: false,
                words: account_info.balance.0.to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code_hash: Buffer::from(account_info.code_hash.as_bytes()),
            code: account_info
                .code
                .map(|code| Buffer::from(code.bytes().as_ref())),
        }
    }
}

fn public_key_to_address(public_key: PublicKey) -> H160 {
    let hash = Keccak256::digest(&public_key.serialize_uncompressed()[1..]);
    // Only take the lower 160 bits of the hash
    H160::from_slice(&hash[12..])
}

#[napi(object)]
pub struct GenesisAccount {
    /// Account private key
    pub private_key: String,
    /// Account balance
    pub balance: BigInt,
}

#[napi(object)]
pub struct AccessListItem {
    pub address: String,
    pub storage_keys: Vec<String>,
}

impl TryFrom<AccessListItem> for (H160, Vec<U256>) {
    type Error = napi::Error;

    fn try_from(value: AccessListItem) -> std::result::Result<Self, Self::Error> {
        let address = H160::from_str(&value.address)
            .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        let storage_keys = value
            .storage_keys
            .into_iter()
            .map(|key| {
                U256::from_str(&key)
                    .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))
            })
            .collect::<std::result::Result<Vec<U256>, _>>()?;

        Ok((address, storage_keys))
    }
}

#[napi(object)]
pub struct Transaction {
    /// 160-bit address for caller
    /// Defaults to `0x00.0` address.
    pub from: Option<Buffer>,
    /// 160-bit address for receiver
    /// Creates a contract if no address is provided.
    pub to: Option<Buffer>,
    /// Maximum gas allowance for the code execution to avoid infinite loops.
    /// Defaults to 2^63.
    pub gas_limit: Option<BigInt>,
    /// Number of wei to pay for each unit of gas during execution.
    /// Defaults to 1 wei.
    pub gas_price: Option<BigInt>,
    /// Maximum tip per gas that's given directly to the forger.
    pub gas_priority_fee: Option<BigInt>,
    /// (Up to) 256-bit unsigned value.
    pub value: Option<BigInt>,
    /// Nonce of sender account.
    pub nonce: Option<BigInt>,
    /// Input byte data
    pub input: Option<Buffer>,
    /// A list of addresses and storage keys that the transaction plans to access.
    pub access_list: Option<Vec<AccessListItem>>,
    /// Transaction is only valid on networks with this chain ID.
    pub chain_id: Option<BigInt>,
}

impl TryFrom<Transaction> for TxEnv {
    type Error = napi::Error;

    fn try_from(value: Transaction) -> std::result::Result<Self, Self::Error> {
        let caller = if let Some(from) = value.from.as_ref() {
            H160::from_slice(from)
        } else {
            H160::default()
        };

        let transact_to = if let Some(to) = value.to.as_ref() {
            TransactTo::Call(H160::from_slice(to))
        } else {
            TransactTo::Create(CreateScheme::Create)
        };

        let data = value
            .input
            .map_or(Bytes::default(), |input| Bytes::copy_from_slice(&input));

        let access_list = value.access_list.map_or(Ok(Vec::new()), |access_list| {
            access_list
                .into_iter()
                .map(|item| item.try_into())
                .collect::<std::result::Result<Vec<(H160, Vec<U256>)>, _>>()
        })?;

        Ok(Self {
            caller,
            gas_limit: value
                .gas_limit
                .map_or(2u64.pow(63), |limit| limit.get_u64().1),
            gas_price: value
                .gas_price
                .map_or(Ok(U256::from(1)), BigInt::try_cast)?,
            gas_priority_fee: value
                .gas_priority_fee
                .map_or(Ok(None), |fee| BigInt::try_cast(fee).map(Some))?,
            transact_to,
            value: value.value.map_or(Ok(U256::default()), BigInt::try_cast)?,
            data,
            chain_id: value.chain_id.map(|chain_id| chain_id.get_u64().1),
            nonce: value.nonce.map(|nonce| nonce.get_u64().1),
            access_list,
        })
    }
}

#[napi(object)]
pub struct TransactionOutput {
    /// Return value from Call or Create transactions
    #[napi(readonly)]
    pub output: Option<Buffer>,
    /// Optionally, a 160-bit address from Create transactions
    #[napi(readonly)]
    pub address: Option<Buffer>,
}

impl From<rethnet_evm::TransactOut> for TransactionOutput {
    fn from(value: rethnet_evm::TransactOut) -> Self {
        let (output, address) = match value {
            rethnet_evm::TransactOut::None => (None, None),
            rethnet_evm::TransactOut::Call(output) => (Some(Buffer::from(output.as_ref())), None),
            rethnet_evm::TransactOut::Create(output, address) => (
                Some(Buffer::from(output.as_ref())),
                address.map(|address| Buffer::from(address.as_bytes())),
            ),
        };

        Self { output, address }
    }
}

#[napi(object)]
pub struct ExecutionResult {
    pub exit_code: u8,
    pub output: TransactionOutput,
    pub gas_used: BigInt,
    pub gas_refunded: BigInt,
    pub logs: Vec<serde_json::Value>,
}

impl TryFrom<rethnet_evm::ExecutionResult> for ExecutionResult {
    type Error = napi::Error;

    fn try_from(value: rethnet_evm::ExecutionResult) -> std::result::Result<Self, Self::Error> {
        let logs = value
            .logs
            .into_iter()
            .map(serde_json::to_value)
            .collect::<serde_json::Result<Vec<serde_json::Value>>>()?;

        Ok(Self {
            exit_code: value.exit_reason as u8,
            output: value.out.into(),
            gas_used: BigInt::from(value.gas_used),
            gas_refunded: BigInt::from(value.gas_refunded),
            logs,
        })
    }
}

#[napi(object)]
pub struct TransactionResult {
    pub exec_result: ExecutionResult,
    pub state: serde_json::Value,
}

impl TryFrom<(rethnet_evm::ExecutionResult, rethnet_evm::State)> for TransactionResult {
    type Error = napi::Error;

    fn try_from(
        value: (rethnet_evm::ExecutionResult, rethnet_evm::State),
    ) -> std::result::Result<Self, Self::Error> {
        let exec_result = value.0.try_into()?;
        let state = serde_json::to_value(value.1)?;

        Ok(Self { exec_result, state })
    }
}

#[napi]
pub struct Rethnet {
    client: Client,
}

#[napi]
impl Rethnet {
    #[allow(clippy::new_without_default)]
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            client: Client::with_db(LayeredDatabase::default()),
        }
    }

    #[allow(clippy::too_many_arguments)]
    #[napi(factory)]
    pub fn with_callbacks(
        env: Env,
        #[napi(ts_arg_type = "() => Promise<void>")] commit_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer) => Promise<Account>")]
        get_account_by_address_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, index: bigint) => Promise<bigint>")]
        get_account_storage_slot_fn: JsFunction,
        #[napi(ts_arg_type = "() => Promise<Buffer>")] get_storage_root_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, account: Account) => Promise<void>")]
        insert_account_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, balance: bigint) => Promise<void>")]
        set_account_balance_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, code: Buffer) => Promise<void>")]
        set_account_code_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, nonce: bigint) => Promise<void>")]
        set_account_nonce_fn: JsFunction,
        #[napi(ts_arg_type = "(address: Buffer, index: bigint, value: bigint) => Promise<void>")]
        set_account_storage_slot_fn: JsFunction,
    ) -> napi::Result<Self> {
        let commit_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { commit_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<CommitCall>| {
                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call::<JsUnknown>(None, &[])?;
                let result = await_void_promise(ctx.env, promise, ctx.value.sender);
                handle_error(sender, result)
            },
        )?;

        let get_account_by_address_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { get_account_by_address_fn.raw() },
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
            unsafe { get_account_storage_slot_fn.raw() },
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

        let get_storage_root_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { get_storage_root_fn.raw() },
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
            unsafe { insert_account_fn.raw() },
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
            unsafe { set_account_balance_fn.raw() },
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
            unsafe { set_account_code_fn.raw() },
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
            unsafe { set_account_nonce_fn.raw() },
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
            unsafe { set_account_storage_slot_fn.raw() },
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

        let db = CallbackDatabase::new(
            commit_fn,
            get_account_by_address_fn,
            get_account_storage_slot_fn,
            get_storage_root_fn,
            insert_account_fn,
            set_account_balance_fn,
            set_account_code_fn,
            set_account_nonce_fn,
            set_account_storage_slot_fn,
        );

        Ok(Self {
            client: Client::with_db(db),
        })
    }

    #[napi(factory)]
    pub fn with_genesis_accounts(accounts: Vec<GenesisAccount>) -> napi::Result<Self> {
        let context = Secp256k1::signing_only();
        let genesis_accounts = accounts
            .into_iter()
            .map(|account| {
                let private_key = account
                    .private_key
                    .strip_prefix("0x")
                    .unwrap_or(&account.private_key);

                let secret_key = SecretKey::from_str(private_key)
                    .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

                let address = public_key_to_address(secret_key.public_key(&context));
                account.balance.try_cast().map(|balance| {
                    let account_info = AccountInfo {
                        balance,
                        ..Default::default()
                    };

                    (address, account_info)
                })
            })
            .collect::<Result<HashMap<H160, AccountInfo>>>()?;

        Ok(Self {
            client: Client::with_genesis_accounts(genesis_accounts),
        })
    }

    #[napi]
    pub async fn dry_run(&self, transaction: Transaction) -> Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        self.client.dry_run(transaction).await.try_into()
    }

    #[napi]
    pub async fn run(&self, transaction: Transaction) -> Result<ExecutionResult> {
        let transaction = transaction.try_into()?;
        self.client.run(transaction).await.try_into()
    }

    #[napi]
    pub async fn create_checkpoint(&self) -> usize {
        self.client.create_checkpoint().await
    }

    #[napi]
    pub async fn revert_to_checkpoint(&self, checkpoint_id: BigInt) -> Result<()> {
        let checkpoint_id = usize::try_from(checkpoint_id.get_u64().1)
            .expect("Checkpoint IDs should not be larger than usize");
        self.client
            .revert_to_checkpoint(checkpoint_id)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn get_account_by_address(&self, address: Buffer) -> Result<Option<Account>> {
        let address = H160::from_slice(&address);
        self.client
            .get_account_by_address(address)
            .await
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |account_info| Ok(account_info.map(Account::from)),
            )
    }

    #[napi]
    pub async fn guarantee_transaction(&self, transaction: Transaction) -> Result<()> {
        let transaction = transaction.try_into()?;

        self.client
            .guarantee_transaction(transaction)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn insert_account(&self, address: Buffer) -> Result<()> {
        let address = H160::from_slice(&address);
        self.client
            .insert_account(address, AccountInfo::default())
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn insert_block(&self, block_number: BigInt, block_hash: Buffer) -> Result<()> {
        let block_number = BigInt::try_cast(block_number)?;
        let block_hash = H256::from_slice(&block_hash);

        self.client
            .insert_block(block_number, block_hash)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_account_balance(&self, address: Buffer, balance: BigInt) -> Result<()> {
        let address = H160::from_slice(&address);
        let balance = BigInt::try_cast(balance)?;

        self.client
            .set_account_balance(address, balance)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_account_code(&self, address: Buffer, code: Buffer) -> Result<()> {
        let address = H160::from_slice(&address);
        let code = Bytes::copy_from_slice(&code);

        self.client
            .set_account_code(address, code)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_account_nonce(&self, address: Buffer, nonce: BigInt) -> Result<()> {
        let address = H160::from_slice(&address);
        let nonce = nonce.get_u64().1;

        self.client
            .set_account_nonce(address, nonce)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> Result<()> {
        let address = H160::from_slice(&address);
        let index = BigInt::try_cast(index)?;
        let value = BigInt::try_cast(value)?;

        self.client
            .set_account_storage_slot(address, index, value)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }
}
