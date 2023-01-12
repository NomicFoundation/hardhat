mod access_list;
mod block;
mod blockchain;
mod cast;
mod receipt;
mod state;
mod sync;
mod threadsafe_function;
mod trace;
mod tracer;
mod transaction;

use std::{fmt::Debug, str::FromStr};

use block::BlockConfig;
use blockchain::Blockchain;
use napi::{
    bindgen_prelude::{BigInt, Buffer, ToNapiValue},
    Status,
};
use napi_derive::napi;
use once_cell::sync::OnceCell;
use rethnet_eth::Address;
use rethnet_evm::{AccountInfo, CfgEnv, TxEnv};
use secp256k1::{PublicKey, Secp256k1, SecretKey, SignOnly};
use sha3::{Digest, Keccak256};
use state::StateManager;
use trace::Trace;
use tracer::Tracer;
use transaction::{Transaction, TransactionOutput};

use crate::cast::TryCast;

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

#[napi(object)]
pub struct AccountData {
    /// Account balance
    #[napi(readonly)]
    pub balance: BigInt,
    /// Account nonce
    #[napi(readonly)]
    pub nonce: BigInt,
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
                words: account_info.balance.as_limbs().to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code_hash: Buffer::from(account_info.code_hash.as_bytes()),
            code: account_info
                .code
                .map(|code| Buffer::from(&code.bytes()[..code.len()])),
        }
    }
}

fn private_key_to_address(
    context: &Secp256k1<SignOnly>,
    private_key: String,
) -> napi::Result<Address> {
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

fn public_key_to_address(public_key: PublicKey) -> Address {
    let hash = Keccak256::digest(&public_key.serialize_uncompressed()[1..]);
    // Only take the lower 160 bits of the hash
    Address::from_slice(&hash[12..])
}

#[napi(object)]
pub struct GenesisAccount {
    /// Account private key
    pub private_key: String,
    /// Account balance
    pub balance: BigInt,
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
pub struct Log {
    pub address: Buffer,
    pub topics: Vec<Buffer>,
    pub data: Buffer,
}

impl From<rethnet_evm::Log> for Log {
    fn from(log: rethnet_evm::Log) -> Self {
        let topics = log
            .topics
            .into_iter()
            .map(|topic| Buffer::from(topic.as_bytes()))
            .collect();

        Self {
            address: Buffer::from(log.address.as_bytes()),
            topics,
            data: Buffer::from(log.data.as_ref()),
        }
    }
}

#[napi(object)]
pub struct ExecutionResult {
    pub exit_code: u8,
    pub output: TransactionOutput,
    pub gas_used: BigInt,
    pub gas_refunded: BigInt,
    pub logs: Vec<Log>,
    pub trace: Trace,
}

impl From<(rethnet_evm::ExecutionResult, rethnet_evm::trace::Trace)> for ExecutionResult {
    fn from((result, trace): (rethnet_evm::ExecutionResult, rethnet_evm::trace::Trace)) -> Self {
        let logs = result.logs.into_iter().map(Log::from).collect();

        Self {
            exit_code: result.exit_reason as u8,
            output: result.out.into(),
            gas_used: BigInt::from(result.gas_used),
            gas_refunded: BigInt::from(result.gas_refunded),
            logs,
            trace: trace.into(),
        }
    }
}

#[napi(object)]
pub struct TransactionResult {
    pub exec_result: ExecutionResult,
    pub state: serde_json::Value,
}

impl
    TryFrom<(
        rethnet_evm::ExecutionResult,
        rethnet_evm::State,
        rethnet_evm::trace::Trace,
    )> for TransactionResult
{
    type Error = napi::Error;

    fn try_from(
        (result, state, trace): (
            rethnet_evm::ExecutionResult,
            rethnet_evm::State,
            rethnet_evm::trace::Trace,
        ),
    ) -> std::result::Result<Self, Self::Error> {
        let exec_result = (result, trace).into();
        let state = serde_json::to_value(state)?;

        Ok(Self { exec_result, state })
    }
}

#[napi]
pub struct Rethnet {
    runtime: rethnet_evm::Rethnet<anyhow::Error>,
}

#[napi]
impl Rethnet {
    #[napi(constructor)]
    pub fn new(
        blockchain: &Blockchain,
        state_manager: &StateManager,
        cfg: Config,
    ) -> napi::Result<Self> {
        let _logger = LOGGER.get_or_init(|| {
            pretty_env_logger::init();
            Logger
        });

        let cfg = cfg.try_into()?;

        let runtime =
            rethnet_evm::Rethnet::new(blockchain.as_inner().clone(), state_manager.db.clone(), cfg);

        Ok(Self { runtime })
    }

    #[napi]
    pub async fn dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        self.runtime
            .dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .try_into()
    }

    #[napi]
    pub async fn guaranteed_dry_run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<TransactionResult> {
        let transaction = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        self.runtime
            .guaranteed_dry_run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .try_into()
    }

    #[napi]
    pub async fn run(
        &self,
        transaction: Transaction,
        block: BlockConfig,
        tracer: Option<&Tracer>,
    ) -> napi::Result<ExecutionResult> {
        let transaction: TxEnv = transaction.try_into()?;
        let block = block.try_into()?;

        let inspector = tracer.map(|tracer| tracer.as_dyn_inspector());

        Ok(self
            .runtime
            .run(transaction, block, inspector)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?
            .into())
    }
}
