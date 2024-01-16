mod builder;

use std::{mem, ops::Deref, sync::Arc};

pub use builder::BlockBuilder;
use edr_eth::{Address, Bloom, Bytes, B256, B64};
use edr_evm::{blockchain::BlockchainError, BlobExcessGasAndPrice, BlockEnv, SyncBlock};
use napi::{
    bindgen_prelude::{BigInt, Buffer, Either4},
    Env, JsBuffer, JsBufferValue, Status,
};
use napi_derive::napi;

use crate::{
    cast::TryCast,
    receipt::Receipt,
    transaction::signed::{
        Eip1559SignedTransaction, Eip2930SignedTransaction, Eip4844SignedTransaction,
        LegacySignedTransaction,
    },
};

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
    pub blob_excess_gas: Option<BigInt>,
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
        let prevrandao = value.mix_hash.map(TryCast::<B256>::try_cast).transpose()?;
        let timestamp = value
            .timestamp
            .map_or(Ok(default.timestamp), BigInt::try_cast)?;
        let basefee = value
            .base_fee
            .map_or_else(|| Ok(default.basefee), TryCast::try_cast)?;
        let gas_limit = value
            .gas_limit
            .map_or(Ok(default.gas_limit), TryCast::try_cast)?;
        let blob_excess_gas: Option<u64> =
            value.blob_excess_gas.map(TryCast::try_cast).transpose()?;

        Ok(Self {
            number,
            coinbase,
            timestamp,
            difficulty,
            prevrandao,
            basefee,
            gas_limit,
            blob_excess_gas_and_price: blob_excess_gas.map(BlobExcessGasAndPrice::new),
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
    /// The block's withdrawals root
    pub withdrawals_root: Option<Buffer>,
    /// The hash tree root of the parent beacon block for the given execution
    /// block (EIP-4788).
    pub parent_beacon_block_root: Option<Buffer>,
}

impl TryFrom<BlockOptions> for edr_eth::block::BlockOptions {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: BlockOptions) -> Result<Self, Self::Error> {
        Ok(Self {
            parent_hash: value
                .parent_hash
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
            beneficiary: value
                .beneficiary
                .map(|coinbase| Address::from_slice(&coinbase)),
            state_root: value
                .state_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
            receipts_root: value
                .receipts_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
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
            mix_hash: value.mix_hash.map(TryCast::<B256>::try_cast).transpose()?,
            nonce: value.nonce.map(TryCast::<B64>::try_cast).transpose()?,
            base_fee: value
                .base_fee
                .map_or(Ok(None), |basefee| basefee.try_cast().map(Some))?,
            withdrawals_root: value
                .withdrawals_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
            parent_beacon_block_root: value
                .parent_beacon_block_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
        })
    }
}

/// Information about the blob gas used in a block.
#[napi(object)]
pub struct BlobGas {
    /// The total amount of blob gas consumed by the transactions within the
    /// block.
    pub gas_used: BigInt,
    /// The running total of blob gas consumed in excess of the target, prior to
    /// the block. Blocks with above-target blob gas consumption increase this
    /// value, blocks with below-target blob gas consumption decrease it
    /// (bounded at 0).
    pub excess_gas: BigInt,
}

impl TryFrom<BlobGas> for edr_eth::block::BlobGas {
    type Error = napi::Error;

    fn try_from(value: BlobGas) -> Result<Self, Self::Error> {
        Ok(Self {
            gas_used: BigInt::try_cast(value.gas_used)?,
            excess_gas: BigInt::try_cast(value.excess_gas)?,
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
    pub blob_gas: Option<BlobGas>,
    pub parent_beacon_block_root: Option<Buffer>,
}

impl BlockHeader {
    pub fn new(env: &Env, header: &edr_eth::block::Header) -> napi::Result<Self> {
        let extra_data = header.extra_data.clone();
        let extra_data = unsafe {
            env.create_buffer_with_borrowed_data(
                extra_data.as_ptr(),
                extra_data.len(),
                extra_data,
                |extra_data: edr_eth::Bytes, _env| {
                    mem::drop(extra_data);
                },
            )
        }
        .map(JsBufferValue::into_raw)?;

        Ok(Self {
            parent_hash: Buffer::from(header.parent_hash.as_slice()),
            ommers_hash: Buffer::from(header.ommers_hash.as_slice()),
            beneficiary: Buffer::from(header.beneficiary.as_slice()),
            state_root: Buffer::from(header.state_root.as_slice()),
            transactions_root: Buffer::from(header.transactions_root.as_slice()),
            receipts_root: Buffer::from(header.receipts_root.as_slice()),
            logs_bloom: Buffer::from(header.logs_bloom.as_slice()),
            difficulty: BigInt {
                sign_bit: false,
                words: header.difficulty.as_limbs().to_vec(),
            },
            number: BigInt::from(header.number),
            gas_limit: BigInt::from(header.gas_limit),
            gas_used: BigInt::from(header.gas_used),
            timestamp: BigInt::from(header.timestamp),
            extra_data,
            mix_hash: Buffer::from(header.mix_hash.as_slice()),
            nonce: Buffer::from(header.nonce.as_slice()),
            base_fee_per_gas: header.base_fee_per_gas.map(|fee| BigInt {
                sign_bit: false,
                words: fee.as_limbs().to_vec(),
            }),
            withdrawals_root: header
                .withdrawals_root
                .map(|root| Buffer::from(root.as_slice())),
            blob_gas: header.blob_gas.as_ref().map(|blob_gas| BlobGas {
                gas_used: BigInt::from(blob_gas.gas_used),
                excess_gas: BigInt::from(blob_gas.excess_gas),
            }),
            parent_beacon_block_root: header
                .parent_beacon_block_root
                .as_ref()
                .map(|root| Buffer::from(root.as_slice())),
        })
    }
}

impl TryFrom<BlockHeader> for edr_eth::block::Header {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: BlockHeader) -> Result<Self, Self::Error> {
        Ok(Self {
            parent_hash: TryCast::<B256>::try_cast(value.parent_hash)?,
            ommers_hash: TryCast::<B256>::try_cast(value.ommers_hash)?,
            beneficiary: Address::from_slice(&value.beneficiary),
            state_root: TryCast::<B256>::try_cast(value.state_root)?,
            transactions_root: TryCast::<B256>::try_cast(value.transactions_root)?,
            receipts_root: TryCast::<B256>::try_cast(value.receipts_root)?,
            logs_bloom: Bloom::from_slice(&value.logs_bloom),
            difficulty: value.difficulty.try_cast()?,
            number: value.number.try_cast()?,
            gas_limit: value.gas_limit.try_cast()?,
            gas_used: value.gas_used.try_cast()?,
            timestamp: value.timestamp.try_cast()?,
            extra_data: Bytes::copy_from_slice(value.extra_data.into_value()?.as_ref()),
            mix_hash: TryCast::<B256>::try_cast(value.mix_hash)?,
            nonce: TryCast::<B64>::try_cast(value.nonce)?,
            base_fee_per_gas: value
                .base_fee_per_gas
                .map_or(Ok(None), |fee| fee.try_cast().map(Some))?,
            withdrawals_root: value
                .withdrawals_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
            blob_gas: value.blob_gas.map(BlobGas::try_into).transpose()?,
            parent_beacon_block_root: value
                .parent_beacon_block_root
                .map(TryCast::<B256>::try_cast)
                .transpose()?,
        })
    }
}

#[napi]
pub struct Block {
    inner: Arc<dyn SyncBlock<Error = BlockchainError>>,
}

impl Block {
    /// Retrieves a reference to the inner [`SyncBlock`].
    pub fn as_inner(&self) -> &Arc<dyn SyncBlock<Error = BlockchainError>> {
        &self.inner
    }
}

impl From<Arc<dyn SyncBlock<Error = BlockchainError>>> for Block {
    fn from(value: Arc<dyn SyncBlock<Error = BlockchainError>>) -> Self {
        Self { inner: value }
    }
}

impl Deref for Block {
    type Target = dyn SyncBlock<Error = BlockchainError>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl Block {
    #[doc = "Retrieves the block's hash, potentially calculating it in the process."]
    #[napi]
    pub fn hash(&self) -> Buffer {
        Buffer::from(self.inner.hash().as_slice())
    }

    #[doc = "Retrieves the block's header."]
    #[napi(getter)]
    pub fn header(&self, env: Env) -> napi::Result<BlockHeader> {
        BlockHeader::new(&env, self.inner.header())
    }

    #[doc = "Retrieves the block's transactions."]
    #[napi(getter)]
    pub fn transactions(
        &self,
        env: Env,
    ) -> napi::Result<
        // HACK: napi does not convert Rust type aliases to its underlaying types when generating
        // bindings so manually do that here
        Vec<
            Either4<
                LegacySignedTransaction,
                Eip2930SignedTransaction,
                Eip1559SignedTransaction,
                Eip4844SignedTransaction,
            >,
        >,
    > {
        self.inner
            .transactions()
            .iter()
            .map(|transaction| match transaction.as_inner() {
                edr_eth::transaction::SignedTransaction::PreEip155Legacy(transaction) => {
                    LegacySignedTransaction::from_legacy(&env, transaction).map(Either4::A)
                }
                edr_eth::transaction::SignedTransaction::PostEip155Legacy(transaction) => {
                    LegacySignedTransaction::from_eip155(&env, transaction).map(Either4::A)
                }
                edr_eth::transaction::SignedTransaction::Eip2930(transaction) => {
                    Eip2930SignedTransaction::new(&env, transaction).map(Either4::B)
                }
                edr_eth::transaction::SignedTransaction::Eip1559(transaction) => {
                    Eip1559SignedTransaction::new(&env, transaction).map(Either4::C)
                }
                edr_eth::transaction::SignedTransaction::Eip4844(transaction) => {
                    Eip4844SignedTransaction::new(&env, transaction).map(Either4::D)
                }
            })
            .collect()
    }

    #[doc = "Retrieves the callers of the block's transactions"]
    #[napi(getter)]
    pub fn callers(&self) -> Vec<Buffer> {
        self.inner
            .transactions()
            .iter()
            .map(|transaction| Buffer::from(transaction.caller().as_slice()))
            .collect()
    }

    #[doc = "Retrieves the transactions' receipts."]
    #[napi(getter)]
    pub fn receipts(&self) -> napi::Result<Vec<Receipt>> {
        self.inner.transaction_receipts().map_or_else(
            |error| Err(napi::Error::new(Status::InvalidArg, error.to_string())),
            |receipts: Vec<Arc<edr_eth::receipt::BlockReceipt>>| {
                Ok(receipts.into_iter().map(Receipt::from).collect())
            },
        )
    }
}
