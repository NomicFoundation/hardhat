use edr_eth::{Address, Bytes, U256};
use edr_evm::{CreateScheme, TransactTo};
use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

use crate::{access_list::AccessListItem, cast::TryCast};

#[napi(object)]
pub struct TransactionRequest {
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
    /// A list of addresses and storage keys that the transaction plans to
    /// access.
    pub access_list: Option<Vec<AccessListItem>>,
    /// Transaction is only valid on networks with this chain ID.
    pub chain_id: Option<BigInt>,
}

impl TryFrom<TransactionRequest> for edr_evm::TxEnv {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: TransactionRequest) -> std::result::Result<Self, Self::Error> {
        let caller = if let Some(from) = value.from.as_ref() {
            Address::from_slice(from)
        } else {
            Address::default()
        };

        let transact_to = if let Some(to) = value.to.as_ref() {
            TransactTo::Call(Address::from_slice(to))
        } else {
            TransactTo::Create(CreateScheme::Create)
        };

        let data = value
            .input
            .map_or(Bytes::default(), |input| Bytes::copy_from_slice(&input));

        let access_list = value.access_list.map_or(Ok(Vec::new()), |access_list| {
            access_list
                .into_iter()
                .map(|item| edr_eth::access_list::AccessListItem::try_from(item).map(Into::into))
                .collect::<Result<Vec<_>, _>>()
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
            blob_hashes: Vec::new(),
            max_fee_per_blob_gas: None,
        })
    }
}
