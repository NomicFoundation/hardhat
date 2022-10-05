use std::{convert::TryFrom, str::FromStr};

use napi::bindgen_prelude::*;
use napi_derive::napi;
use rethnet_evm::{
    sync::Client, Bytes, CreateScheme, HashMap, LayeredDatabase, TransactTo, TxEnv, H160, H256,
    U256,
};
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use sha3::{Digest, Keccak256};

#[napi(constructor)]
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
}

impl From<rethnet_evm::AccountInfo> for Account {
    fn from(account_info: rethnet_evm::AccountInfo) -> Self {
        Self {
            balance: BigInt {
                sign_bit: false,
                words: account_info.balance.0.to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code_hash: Buffer::from(account_info.code_hash.as_bytes()),
        }
    }
}

fn try_u256_from_bigint(mut value: BigInt) -> napi::Result<U256> {
    let num_words = value.words.len();
    match num_words.cmp(&4) {
        std::cmp::Ordering::Less => value.words.append(&mut vec![0u64; 4 - num_words]),
        std::cmp::Ordering::Equal => (),
        std::cmp::Ordering::Greater => {
            return Err(napi::Error::new(
                Status::InvalidArg,
                "BigInt cannot have more than 4 words.".to_owned(),
            ));
        }
    }

    Ok(U256(value.words.try_into().unwrap()))
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
                .map_or(Ok(U256::from(1)), try_u256_from_bigint)?,
            gas_priority_fee: value
                .gas_priority_fee
                .map_or(Ok(None), |price| try_u256_from_bigint(price).map(Some))?,
            transact_to,
            value: value
                .value
                .map_or(Ok(U256::default()), try_u256_from_bigint)?,
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
                try_u256_from_bigint(account.balance).map(|balance| {
                    let account_info = rethnet_evm::AccountInfo {
                        balance,
                        ..Default::default()
                    };

                    (address, account_info)
                })
            })
            .collect::<Result<HashMap<H160, rethnet_evm::AccountInfo>>>()?;

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
    pub async fn revert_to_checkpoint(&self, checkpoint_id: BigInt) {
        let checkpoint_id = usize::try_from(checkpoint_id.get_u64().1)
            .expect("Checkpoint IDs should not be larger than usize");
        self.client.revert_to_checkpoint(checkpoint_id).await
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

        self.client.guarantee_transaction(transaction).await;
        Ok(())
    }

    #[napi]
    pub async fn insert_account(&self, address: Buffer) {
        let address = H160::from_slice(&address);
        self.client
            .insert_account(address, rethnet_evm::AccountInfo::default())
            .await;
    }

    #[napi]
    pub async fn insert_block(&self, block_number: BigInt, block_hash: Buffer) -> Result<()> {
        let block_number = try_u256_from_bigint(block_number)?;
        let block_hash = H256::from_slice(&block_hash);

        self.client.insert_block(block_number, block_hash).await;
        Ok(())
    }

    #[napi]
    pub async fn set_account_balance(&self, address: Buffer, balance: BigInt) -> Result<()> {
        let address = H160::from_slice(&address);
        let balance = try_u256_from_bigint(balance)?;

        self.client.set_account_balance(address, balance).await;
        Ok(())
    }

    #[napi]
    pub async fn set_account_code(&self, address: Buffer, code: Buffer) -> Result<()> {
        let address = H160::from_slice(&address);
        let code = Bytes::copy_from_slice(&code);

        self.client.set_account_code(address, code).await;
        Ok(())
    }

    #[napi]
    pub async fn set_account_nonce(&self, address: Buffer, nonce: BigInt) {
        let address = H160::from_slice(&address);
        let nonce = nonce.get_u64().1;

        self.client.set_account_nonce(address, nonce).await;
    }

    #[napi]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> Result<()> {
        let address = H160::from_slice(&address);
        let index = try_u256_from_bigint(index)?;
        let value = try_u256_from_bigint(value)?;

        self.client
            .set_account_storage_slot(address, index, value)
            .await;
        Ok(())
    }
}
