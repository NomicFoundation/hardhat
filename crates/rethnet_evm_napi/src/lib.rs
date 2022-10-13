mod cast;
mod db;
mod sync;
mod threadsafe_function;

use std::{fmt::Debug, str::FromStr};

use db::{JsDatabaseCommitInner, JsDatabaseDebugInner};
use napi::{bindgen_prelude::*, Status};
use napi_derive::napi;
use rethnet_evm::{
    sync::Client, AccountInfo, Bytes, CreateScheme, HashMap, LayeredDatabase, RethnetLayer,
    TransactTo, TxEnv, H160, H256, U256,
};
use secp256k1::{PublicKey, Secp256k1, SecretKey, SignOnly};
use sha3::{Digest, Keccak256};

use crate::{cast::TryCast, db::JsDatabase};

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

fn private_key_to_address(
    context: &Secp256k1<SignOnly>,
    private_key: String,
) -> napi::Result<H160> {
    private_to_public_key(context, private_key).map(public_key_to_address)
}

fn private_to_public_key(
    context: &Secp256k1<SignOnly>,
    private_key: String,
) -> napi::Result<secp256k1::PublicKey> {
    let private_key = private_key.strip_prefix("0x").unwrap_or(&private_key);

    SecretKey::from_str(private_key).map_or_else(
        |e| Err(napi::Error::new(Status::InvalidArg, e.to_string())),
        |secret_key| Ok(secret_key.public_key(context)),
    )
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

#[napi(object)]
pub struct DatabaseCallbacks {
    #[napi(ts_type = "(address: Buffer) => Promise<Account>")]
    pub get_account_by_address_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, index: bigint) => Promise<bigint>")]
    pub get_account_storage_slot_fn: JsFunction,
}

#[napi(object)]
pub struct DatabaseCommitCallbacks {
    #[napi(ts_type = "() => Promise<void>")]
    pub commit_fn: JsFunction,
}

#[napi(object)]
pub struct DatabaseDebugCallbacks {
    #[napi(ts_type = "() => Promise<void>")]
    pub checkpoint_fn: JsFunction,
    #[napi(ts_type = "() => Promise<void>")]
    pub revert_fn: JsFunction,
    #[napi(ts_type = "() => Promise<Buffer>")]
    pub get_storage_root_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, account: Account) => Promise<void>")]
    pub insert_account_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, balance: bigint) => Promise<void>")]
    pub set_account_balance_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, code: Buffer) => Promise<void>")]
    pub set_account_code_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, nonce: bigint) => Promise<void>")]
    pub set_account_nonce_fn: JsFunction,
    #[napi(ts_type = "(address: Buffer, index: bigint, value: bigint) => Promise<void>")]
    pub set_account_storage_slot_fn: JsFunction,
}

#[napi]
pub struct Rethnet {
    client: Client,
}

#[napi]
impl Rethnet {
    #[allow(clippy::new_without_default)]
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        Ok(Self {
            client: Client::with_db_mut_debug(LayeredDatabase::default())?,
        })
    }

    #[napi(factory)]
    pub fn with_callbacks(
        env: Env,
        db_callbacks: DatabaseCallbacks,
        db_mut_callbacks: Option<DatabaseCommitCallbacks>,
        db_debug_callbacks: Option<DatabaseDebugCallbacks>,
    ) -> napi::Result<Self> {
        let db = JsDatabase::new(&env, db_callbacks)?;
        let db_commit = db_mut_callbacks.map_or(Ok(None), |db| {
            JsDatabaseCommitInner::new(&env, db).map(Some)
        })?;
        let db_debug = db_debug_callbacks
            .map_or(Ok(None), |db| JsDatabaseDebugInner::new(&env, db).map(Some))?;

        db::client(db, db_commit, db_debug).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |client| Ok(Self { client }),
        )
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
            .collect::<Result<HashMap<H160, AccountInfo>>>()?;

        let mut database =
            LayeredDatabase::with_layer(RethnetLayer::with_genesis_accounts(genesis_accounts));
        database.add_layer_default();

        Client::with_db(database).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |client| Ok(Self { client }),
        )
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
    pub async fn checkpoint(&self) -> Result<()> {
        self.client
            .checkpoint()
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn revert(&self) -> Result<()> {
        self.client
            .revert()
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
