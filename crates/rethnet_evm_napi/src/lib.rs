mod cast;
mod db;
mod sync;
mod threadsafe_function;

use std::{fmt::Debug, str::FromStr};

use db::{JsDatabaseCommitInner, JsDatabaseDebugInner};
use napi::{bindgen_prelude::*, Status};
use napi_derive::napi;
use once_cell::sync::OnceCell;
use rethnet_evm::{
    sync::Client, AccountInfo, BlockEnv, Bytes, CfgEnv, CreateScheme, HashMap, LayeredDatabase,
    RethnetLayer, TransactTo, TxEnv, H160, H256, U256,
};
use secp256k1::{PublicKey, Secp256k1, SecretKey, SignOnly};
use sha3::{Digest, Keccak256};

use crate::{cast::TryCast, db::JsDatabase};

struct Logger;

unsafe impl Sync for Logger {}

static LOGGER: OnceCell<Logger> = OnceCell::new();

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
                .map_or(Ok(U256::from(0)), BigInt::try_cast)?,
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
pub struct Block {
    pub number: BigInt,
    pub coinbase: Option<Buffer>,
    pub timestamp: BigInt,
    pub difficulty: Option<BigInt>,
    pub basefee: Option<BigInt>,
    pub gas_limit: Option<BigInt>,
}

impl TryFrom<Block> for BlockEnv {
    type Error = napi::Error;

    fn try_from(value: Block) -> std::result::Result<Self, Self::Error> {
        let default = BlockEnv::default();
        let coinbase = value
            .coinbase
            .map_or(default.coinbase, |coinbase| H160::from_slice(&coinbase));
        let difficulty = value.difficulty.map_or_else(
            || Ok(default.difficulty),
            |difficulty| difficulty.try_cast(),
        )?;
        let basefee = value
            .basefee
            .map_or_else(|| Ok(default.basefee), |basefee| basefee.try_cast())?;
        let gas_limit = value
            .gas_limit
            .map_or(Ok(default.gas_limit), |gas_limit| gas_limit.try_cast())?;

        Ok(Self {
            number: value.number.try_cast()?,
            coinbase,
            timestamp: value.timestamp.try_cast()?,
            difficulty,
            basefee,
            gas_limit,
        })
    }
}

/// If not set, uses defaults from [`CfgEnv`].
#[napi(object)]
pub struct Config {
    pub chain_id: Option<BigInt>,
    pub spec_id: Option<SpecId>,
    pub limit_contract_code_size: Option<BigInt>,
    pub disable_block_gas_limit: Option<bool>,
    pub disable_eip3607: Option<bool>,
}

impl TryFrom<Config> for CfgEnv {
    type Error = napi::Error;

    fn try_from(value: Config) -> std::result::Result<Self, Self::Error> {
        let default = CfgEnv::default();
        let chain_id = value
            .chain_id
            .map_or(Ok(default.chain_id), |chain_id| chain_id.try_cast())?;

        let spec_id = value
            .spec_id
            .map_or(default.spec_id, |spec_id| spec_id.into());

        let limit_contract_code_size = value.limit_contract_code_size.map_or(Ok(None), |size| {
            // TODO: the lossless check in get_u64 is broken: https://github.com/napi-rs/napi-rs/pull/1348
            if let (false, size, _lossless) = size.get_u64() {
                usize::try_from(size).map_or_else(
                    |e| Err(napi::Error::new(Status::InvalidArg, e.to_string())),
                    |size| Ok(Some(size)),
                )
            } else {
                Err(napi::Error::new(
                    Status::InvalidArg,
                    "BigInt cannot be larger than usize::MAX".to_owned(),
                ))
            }
        })?;

        let disable_block_gas_limit = value
            .disable_block_gas_limit
            .unwrap_or(default.disable_block_gas_limit);
        let disable_eip3607 = value.disable_eip3607.unwrap_or(default.disable_eip3607);

        Ok(Self {
            chain_id,
            spec_id,
            limit_contract_code_size,
            disable_block_gas_limit,
            disable_eip3607,
            ..default
        })
    }
}

#[napi]
pub enum SpecId {
    Frontier = 0,
    FrontierThawing = 1,
    Homestead = 2,
    DaoFork = 3,
    Tangerine = 4,
    SpuriousDragon = 5,
    Byzantium = 6,
    Constantinople = 7,
    Petersburg = 8,
    Istanbul = 9,
    MuirGlacier = 10,
    Berlin = 11,
    London = 12,
    ArrowGlacier = 13,
    GrayGlacier = 14,
    Merge = 15,
    Latest = 16,
}

impl From<SpecId> for rethnet_evm::SpecId {
    fn from(value: SpecId) -> Self {
        match value {
            SpecId::Frontier => rethnet_evm::SpecId::FRONTIER,
            SpecId::FrontierThawing => rethnet_evm::SpecId::FRONTIER_THAWING,
            SpecId::Homestead => rethnet_evm::SpecId::HOMESTEAD,
            SpecId::DaoFork => rethnet_evm::SpecId::DAO_FORK,
            SpecId::Tangerine => rethnet_evm::SpecId::TANGERINE,
            SpecId::SpuriousDragon => rethnet_evm::SpecId::SPURIOUS_DRAGON,
            SpecId::Byzantium => rethnet_evm::SpecId::BYZANTIUM,
            SpecId::Constantinople => rethnet_evm::SpecId::CONSTANTINOPLE,
            SpecId::Petersburg => rethnet_evm::SpecId::PETERSBURG,
            SpecId::Istanbul => rethnet_evm::SpecId::ISTANBUL,
            SpecId::MuirGlacier => rethnet_evm::SpecId::MUIR_GLACIER,
            SpecId::Berlin => rethnet_evm::SpecId::BERLIN,
            SpecId::London => rethnet_evm::SpecId::LONDON,
            SpecId::ArrowGlacier => rethnet_evm::SpecId::ARROW_GLACIER,
            SpecId::GrayGlacier => rethnet_evm::SpecId::GRAY_GLACIER,
            SpecId::Merge => rethnet_evm::SpecId::MERGE,
            SpecId::Latest => rethnet_evm::SpecId::LATEST,
        }
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
    #[napi(ts_type = "(blockNumber: bigint) => Promise<Buffer>")]
    pub get_block_hash_fn: JsFunction,
    #[napi(ts_type = "(codeHash: Buffer) => Promise<Buffer>")]
    pub get_code_by_hash_fn: JsFunction,
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

#[napi(object)]
pub struct TracingMessage {
    /// Recipient address. None if it is a Create message.
    #[napi(readonly)]
    pub to: Option<Buffer>,

    /// Depth of the message
    #[napi(readonly)]
    pub depth: u8,

    /// Input data of the message
    #[napi(readonly)]
    pub data: Buffer,

    /// Value sent in the message
    #[napi(readonly)]
    pub value: BigInt,

    /// Address of the code that is being executed. Can be different from `to` if a delegate call
    /// is being done.
    #[napi(readonly)]
    pub code_address: Option<Buffer>,
}

#[napi(object)]
pub struct TracingStep {
    /// Program counter
    #[napi(readonly)]
    pub pc: BigInt,
}

#[napi(object)]
pub struct TracingMessageResult {
    /// Execution result
    #[napi(readonly)]
    pub execution_result: ExecutionResult,
}

#[napi]
pub struct Rethnet {
    client: Client,
}

#[napi]
impl Rethnet {
    #[allow(clippy::new_without_default)]
    #[napi(constructor)]
    pub fn new(cfg: Config) -> napi::Result<Self> {
        let cfg = cfg.try_into()?;

        Ok(Self::with_logger(Client::with_db_mut_debug(
            cfg,
            LayeredDatabase::default(),
        )?))
    }

    #[napi(factory)]
    pub fn with_callbacks(
        env: Env,
        cfg: Config,
        db_callbacks: DatabaseCallbacks,
        db_mut_callbacks: Option<DatabaseCommitCallbacks>,
        db_debug_callbacks: Option<DatabaseDebugCallbacks>,
    ) -> napi::Result<Self> {
        let cfg = cfg.try_into()?;

        let db = JsDatabase::new(&env, db_callbacks)?;
        let db_commit = db_mut_callbacks.map_or(Ok(None), |db| {
            JsDatabaseCommitInner::new(&env, db).map(Some)
        })?;
        let db_debug = db_debug_callbacks
            .map_or(Ok(None), |db| JsDatabaseDebugInner::new(&env, db).map(Some))?;

        db::client(cfg, db, db_commit, db_debug).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |client| Ok(Self::with_logger(client)),
        )
    }

    fn with_logger(client: Client) -> Self {
        let _logger = LOGGER.get_or_init(|| {
            pretty_env_logger::init();
            Logger
        });

        Self { client }
    }

    #[napi(factory)]
    pub fn with_genesis_accounts(cfg: Config, accounts: Vec<GenesisAccount>) -> napi::Result<Self> {
        let cfg = cfg.try_into()?;

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

        Client::with_db(cfg, database).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |client| Ok(Self::with_logger(client)),
        )
    }

    #[napi]
    pub async fn dry_run(
        &self,
        transaction: Transaction,
        block: Block,
    ) -> Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        let block = block.try_into()?;

        self.client.dry_run(transaction, block).await.try_into()
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
