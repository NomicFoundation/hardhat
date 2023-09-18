use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;
use rethnet_eth::transaction::{
    EIP1559TransactionRequest, EIP155TransactionRequest, EIP2930TransactionRequest, TransactionKind,
};
use rethnet_eth::{Address, Bytes, U256};
use rethnet_evm::{CreateScheme, TransactTo};

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
    /// A list of addresses and storage keys that the transaction plans to access.
    pub access_list: Option<Vec<AccessListItem>>,
    /// Transaction is only valid on networks with this chain ID.
    pub chain_id: Option<BigInt>,
}

impl TransactionRequest {
    fn chain_id_to_u64(&self) -> Option<u64> {
        self.chain_id.as_ref().map(|nonce| nonce.get_u64().1)
    }

    fn chain_id_or_err(&self) -> napi::Result<u64> {
        self.chain_id_to_u64().ok_or(napi::Error::new(
            napi::Status::InvalidArg,
            "chain_id is required",
        ))
    }

    fn gas_limit_to_u64(&self) -> Option<u64> {
        self.chain_id.as_ref().map(|nonce| nonce.get_u64().1)
    }

    fn gas_limit_or_err(&self) -> napi::Result<u64> {
        self.gas_limit_to_u64().ok_or(napi::Error::new(
            napi::Status::InvalidArg,
            "gas_limit is required",
        ))
    }

    fn gas_priority_fee_to_u256(&self) -> napi::Result<Option<U256>> {
        if let Some(fee) = self.gas_priority_fee.as_ref() {
            Ok(Some(BigInt::try_cast(fee.clone())?))
        } else {
            Ok(None)
        }
    }

    fn gas_price_to_u256(&self) -> napi::Result<Option<U256>> {
        if let Some(price) = self.gas_price.as_ref() {
            Ok(Some(BigInt::try_cast(price.clone())?))
        } else {
            Ok(None)
        }
    }

    fn gas_price_or_err(&self) -> napi::Result<U256> {
        self.gas_price_to_u256()?.ok_or(napi::Error::new(
            napi::Status::InvalidArg,
            "gas_price is required",
        ))
    }

    fn input_to_bytes(&self) -> Bytes {
        self.input
            .as_ref()
            .map_or(Bytes::default(), |input| Bytes::copy_from_slice(&input))
    }

    fn nonce_to_64(&self) -> Option<u64> {
        self.nonce.as_ref().map(|nonce| nonce.get_u64().1)
    }

    fn nonce_or_err(&self) -> napi::Result<u64> {
        self.nonce_to_64().ok_or(napi::Error::new(
            napi::Status::InvalidArg,
            "nonce is required",
        ))
    }

    fn transaction_kind(&self) -> TransactionKind {
        if let Some(to) = self.to.as_ref() {
            TransactionKind::Call(Address::from_slice(to))
        } else {
            TransactionKind::Create
        }
    }

    fn value_to_u256(&self) -> napi::Result<Option<U256>> {
        if let Some(value) = self.value.as_ref() {
            Ok(Some(BigInt::try_cast(value.clone())?))
        } else {
            Ok(None)
        }
    }

    fn value_or_err(&self) -> napi::Result<U256> {
        self.value_to_u256()?.ok_or(napi::Error::new(
            napi::Status::InvalidArg,
            "value is required",
        ))
    }
}

impl TryFrom<TransactionRequest> for rethnet_evm::TxEnv {
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
                .map(|item| {
                    rethnet_eth::access_list::AccessListItem::try_from(item).map(Into::into)
                })
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
        })
    }
}

impl TryFrom<TransactionRequest> for rethnet_eth::transaction::TransactionRequest {
    type Error = napi::Error;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn try_from(value: TransactionRequest) -> Result<Self, Self::Error> {
        let result = if let Some(gas_priority_fee) = value.gas_priority_fee_to_u256()? {
            rethnet_eth::transaction::TransactionRequest::EIP1559(EIP1559TransactionRequest {
                chain_id: value.chain_id_or_err()?,
                nonce: value.nonce_or_err()?,
                max_priority_fee_per_gas: gas_priority_fee,
                max_fee_per_gas: value.gas_price_or_err()?,
                gas_limit: value.gas_limit_or_err()?,
                kind: value.transaction_kind(),
                value: value.value_or_err()?,
                input: value.input_to_bytes(),
                access_list: value
                    .access_list
                    .map(|al| al.into_iter().map(|item| item.into()).collect())
                    .unwrap_or_else(Vec::default),
            })
        } else if value.access_list.is_some() {
            rethnet_eth::transaction::TransactionRequest::EIP2930(EIP2930TransactionRequest {
                chain_id: value.chain_id_or_err()?,
                nonce: value.nonce_or_err()?,
                gas_price: value.gas_price_or_err()?,
                gas_limit: value.gas_limit_or_err()?,
                kind: value.transaction_kind(),
                value: value.value_or_err()?,
                input: value.input_to_bytes(),
                access_list: value
                    .access_list
                    .expect("someness is checked")
                    .into_iter()
                    .map(|item| item.into())
                    .collect(),
            })
        } else if let Some(chain_id) = value.chain_id_to_u64() {
            rethnet_eth::transaction::TransactionRequest::EIP155(EIP155TransactionRequest {
                chain_id,
                nonce: value.nonce_or_err()?,
                gas_price: value.gas_price_or_err()?,
                gas_limit: value.gas_limit_or_err()?,
                kind: value.transaction_kind(),
                value: value.value_or_err()?,
                input: value.input_to_bytes(),
            })
        } else {
            rethnet_eth::transaction::TransactionRequest::Legacy(
                rethnet_eth::transaction::LegacyTransactionRequest {
                    nonce: value.nonce_or_err()?,
                    gas_price: value.gas_price_or_err()?,
                    gas_limit: value.gas_limit_or_err()?,
                    kind: value.transaction_kind(),
                    value: value.value_or_err()?,
                    input: value.input_to_bytes(),
                },
            )
        };

        Ok(result)
    }
}
