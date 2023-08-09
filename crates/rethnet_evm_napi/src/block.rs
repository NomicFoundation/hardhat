mod builder;

use std::{mem, ops::Deref, sync::Arc};

use napi::{
    bindgen_prelude::{BigInt, Buffer, Either4},
    Env, JsBuffer, JsBufferValue, Status,
};
use napi_derive::napi;
use rethnet_eth::{Address, Bloom, Bytes, B256, B64};
use rethnet_evm::BlockEnv;

use crate::{
    cast::TryCast,
    receipt::Receipt,
    transaction::signed::{
        EIP1559SignedTransaction, EIP155SignedTransaction, EIP2930SignedTransaction,
        LegacySignedTransaction,
    },
};

pub use builder::BlockBuilder;

#[napi(object)]
pub struct BlockConfig {
    pub number: Option<BigInt>,
    pub beneficiary: Option<Buffer>,
    pub timestamp: Option<BigInt>,
    pub difficulty: Option<BigInt>,
    pub mix_hash: Option<Buffer>,
    pub base_fee: Option<BigInt>,
    pub gas_limit: Option<BigInt>,
    pub parent_hash: Option<Buffer>,
}

impl TryFrom<BlockConfig> for BlockEnv {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: BlockConfig) -> std::result::Result<Self, Self::Error> {
        let default = BlockEnv::default();

        let number = value.number.map_or(Ok(default.number), BigInt::try_cast)?;
        let coinbase = value
            .beneficiary
            .map_or(default.coinbase, |coinbase| Address::from_slice(&coinbase));
        let difficulty = value
            .difficulty
            .map_or_else(|| Ok(default.difficulty), TryCast::try_cast)?;
        let prevrandao = value
            .mix_hash
            .map(|prevrandao| B256::from_slice(&prevrandao));
        let timestamp = value
            .timestamp
            .map_or(Ok(default.timestamp), BigInt::try_cast)?;
        let basefee = value
            .base_fee
            .map_or_else(|| Ok(default.basefee), TryCast::try_cast)?;
        let gas_limit = value
            .gas_limit
            .map_or(Ok(default.gas_limit), TryCast::try_cast)?;

        Ok(Self {
            number,
            coinbase,
            timestamp,
            difficulty,
            prevrandao,
            basefee,
            gas_limit,
        })
    }
}

#[napi(object)]
pub struct BlockOptions {
    /// The parent block's hash
    pub parent_hash: Option<Buffer>,
    /// The block's beneficiary
    pub beneficiary: Option<Buffer>,
    /// The state's root hash
    pub state_root: Option<Buffer>,
    /// The receipts' root hash
    pub receipts_root: Option<Buffer>,
    /// The logs' bloom
    pub logs_bloom: Option<Buffer>,
    /// The block's difficulty
    pub difficulty: Option<BigInt>,
    /// The block's number
    pub number: Option<BigInt>,
    /// The block's gas limit
    pub gas_limit: Option<BigInt>,
    /// The block's timestamp
    pub timestamp: Option<BigInt>,
    /// The block's extra data
    pub extra_data: Option<Buffer>,
    /// The block's mix hash (or prevrandao)
    pub mix_hash: Option<Buffer>,
    /// The block's nonce
    pub nonce: Option<Buffer>,
    /// The block's base gas fee
    pub base_fee: Option<BigInt>,
}

impl TryFrom<BlockOptions> for rethnet_eth::block::BlockOptions {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: BlockOptions) -> Result<Self, Self::Error> {
        Ok(Self {
            parent_hash: value
                .parent_hash
                .map(|parent_hash| B256::from_slice(&parent_hash)),
            beneficiary: value
                .beneficiary
                .map(|coinbase| Address::from_slice(&coinbase)),
            state_root: value
                .state_root
                .map(|state_root| B256::from_slice(&state_root)),
            receipts_root: value
                .receipts_root
                .map(|receipts_root| B256::from_slice(&receipts_root)),
            logs_bloom: value
                .logs_bloom
                .map(|logs_bloom| Bloom::from_slice(&logs_bloom)),
            difficulty: value
                .difficulty
                .map_or(Ok(None), |difficulty| difficulty.try_cast().map(Some))?,
            number: value
                .number
                .map_or(Ok(None), |number| number.try_cast().map(Some))?,
            gas_limit: value
                .gas_limit
                .map_or(Ok(None), |gas_limit| gas_limit.try_cast().map(Some))?,
            timestamp: value
                .timestamp
                .map_or(Ok(None), |timestamp| timestamp.try_cast().map(Some))?,
            extra_data: value
                .extra_data
                .map(|extra_data| Bytes::copy_from_slice(&extra_data)),
            mix_hash: value.mix_hash.map(|mix_hash| B256::from_slice(&mix_hash)),
            nonce: value.nonce.map_or(Ok(None), |nonce| {
                B64::try_from_le_slice(&nonce)
                    .ok_or_else(|| {
                        napi::Error::new(
                            Status::InvalidArg,
                            "Expected nonce to contain no more than 8 bytes",
                        )
                    })
                    .map(Option::Some)
            })?,
            base_fee: value
                .base_fee
                .map_or(Ok(None), |basefee| basefee.try_cast().map(Some))?,
        })
    }
}

#[napi(object)]
pub struct BlockHeader {
    pub parent_hash: Buffer,
    pub ommers_hash: Buffer,
    pub beneficiary: Buffer,
    pub state_root: Buffer,
    pub transactions_root: Buffer,
    pub receipts_root: Buffer,
    pub logs_bloom: Buffer,
    pub difficulty: BigInt,
    pub number: BigInt,
    pub gas_limit: BigInt,
    pub gas_used: BigInt,
    pub timestamp: BigInt,
    pub extra_data: JsBuffer,
    pub mix_hash: Buffer,
    pub nonce: Buffer,
    pub base_fee_per_gas: Option<BigInt>,
    pub withdrawals_root: Option<Buffer>,
}

impl BlockHeader {
    pub fn new(env: &Env, header: &rethnet_eth::block::Header) -> napi::Result<Self> {
        let extra_data = header.extra_data.clone();
        let extra_data = unsafe {
            env.create_buffer_with_borrowed_data(
                extra_data.as_ptr(),
                extra_data.len(),
                extra_data,
                |extra_data: rethnet_eth::Bytes, _env| {
                    mem::drop(extra_data);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            parent_hash: Buffer::from(header.parent_hash.as_bytes()),
            ommers_hash: Buffer::from(header.ommers_hash.as_bytes()),
            beneficiary: Buffer::from(header.beneficiary.as_bytes()),
            state_root: Buffer::from(header.state_root.as_bytes()),
            transactions_root: Buffer::from(header.transactions_root.as_bytes()),
            receipts_root: Buffer::from(header.receipts_root.as_bytes()),
            logs_bloom: Buffer::from(header.logs_bloom.as_bytes()),
            difficulty: BigInt {
                sign_bit: false,
                words: header.difficulty.as_limbs().to_vec(),
            },
            number: BigInt {
                sign_bit: false,
                words: header.number.as_limbs().to_vec(),
            },
            gas_limit: BigInt {
                sign_bit: false,
                words: header.gas_limit.as_limbs().to_vec(),
            },
            gas_used: BigInt {
                sign_bit: false,
                words: header.gas_used.as_limbs().to_vec(),
            },
            timestamp: BigInt {
                sign_bit: false,
                words: header.timestamp.as_limbs().to_vec(),
            },
            extra_data,
            mix_hash: Buffer::from(header.mix_hash.as_bytes()),
            nonce: Buffer::from(header.nonce.as_le_bytes().as_ref()),
            base_fee_per_gas: header.base_fee_per_gas.map(|fee| BigInt {
                sign_bit: false,
                words: fee.as_limbs().to_vec(),
            }),
            withdrawals_root: header
                .withdrawals_root
                .map(|root| Buffer::from(root.as_bytes())),
        })
    }
}

impl TryFrom<BlockHeader> for rethnet_eth::block::Header {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: BlockHeader) -> Result<Self, Self::Error> {
        Ok(Self {
            parent_hash: B256::from_slice(&value.parent_hash),
            ommers_hash: B256::from_slice(&value.ommers_hash),
            beneficiary: Address::from_slice(&value.beneficiary),
            state_root: B256::from_slice(&value.state_root),
            transactions_root: B256::from_slice(&value.transactions_root),
            receipts_root: B256::from_slice(&value.receipts_root),
            logs_bloom: Bloom::from_slice(&value.logs_bloom),
            difficulty: value.difficulty.try_cast()?,
            number: value.number.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            gas_used: value.gas_used.try_cast()?,
            timestamp: value.timestamp.try_cast()?,
            extra_data: Bytes::copy_from_slice(value.extra_data.into_value()?.as_ref()),
            mix_hash: B256::from_slice(&value.mix_hash),
            nonce: B64::try_from_le_slice(&value.nonce).ok_or_else(|| {
                napi::Error::new(
                    Status::InvalidArg,
                    "Expected nonce to contain no more than 8 bytes",
                )
            })?,
            base_fee_per_gas: value
                .base_fee_per_gas
                .map_or(Ok(None), |fee| fee.try_cast().map(Some))?,
            withdrawals_root: value.withdrawals_root.map(|root| B256::from_slice(&root)),
        })
    }
}

#[napi]
pub struct Block {
    inner: Arc<rethnet_eth::block::DetailedBlock>,
}

impl From<Arc<rethnet_eth::block::DetailedBlock>> for Block {
    fn from(value: Arc<rethnet_eth::block::DetailedBlock>) -> Self {
        Self { inner: value }
    }
}

impl Deref for Block {
    type Target = rethnet_eth::block::DetailedBlock;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl Block {
    #[doc = "Retrieves the block's header."]
    #[napi(getter)]
    pub fn header(&self, env: Env) -> napi::Result<BlockHeader> {
        BlockHeader::new(&env, &self.header)
    }

    #[doc = "Retrieves the block's transactions."]
    #[napi(getter)]
    pub fn transactions(
        &self,
        env: Env,
    ) -> napi::Result<
        // HACK: napi does not convert Rust type aliases to its underlaying types when generating bindings
        // so manually do that here
        Vec<
            Either4<
                LegacySignedTransaction,
                EIP155SignedTransaction,
                EIP2930SignedTransaction,
                EIP1559SignedTransaction,
            >,
        >,
    > {
        self.transactions
            .iter()
            .map(|transaction| match transaction {
                rethnet_eth::transaction::SignedTransaction::Legacy(transaction) => {
                    LegacySignedTransaction::new(&env, transaction).map(Either4::A)
                }
                rethnet_eth::transaction::SignedTransaction::EIP155(transaction) => {
                    EIP155SignedTransaction::new(&env, transaction).map(Either4::B)
                }
                rethnet_eth::transaction::SignedTransaction::EIP2930(transaction) => {
                    EIP2930SignedTransaction::new(&env, transaction).map(Either4::C)
                }
                rethnet_eth::transaction::SignedTransaction::EIP1559(transaction) => {
                    EIP1559SignedTransaction::new(&env, transaction).map(Either4::D)
                }
            })
            .collect()
    }

    #[doc = "Retrieves the callers of the block's transactions"]
    #[napi(getter)]
    pub fn callers(&self) -> Vec<Buffer> {
        self.inner
            .transactions()
            .map(|transaction| Buffer::from(transaction.caller.as_bytes()))
            .collect()
    }

    #[doc = "Retrieves the transactions' receipts."]
    #[napi(getter)]
    pub fn receipts(&self) -> Vec<Receipt> {
        self.inner
            .transactions()
            .map(|transaction| transaction.receipt.clone().into())
            .collect()
    }
}
