mod eip155;
mod eip1559;
mod eip2930;
mod legacy;

pub use self::{
    eip155::EIP155TransactionRequest, eip1559::EIP1559TransactionRequest,
    eip2930::EIP2930TransactionRequest, legacy::LegacyTransactionRequest,
};
use crate::access_list::AccessList;
use crate::transaction::TransactionKind;
use revm_primitives::{Address, CreateScheme, TransactTo, TxEnv, B256};

/// Container type for various Ethereum transaction requests
///
/// Its variants correspond to specific allowed transactions:
/// 1. Legacy (pre-EIP2718) [`LegacyTransactionRequest`]
/// 2. EIP2930 (state access lists) [`EIP2930TransactionRequest`]
/// 3. EIP1559 [`EIP1559TransactionRequest`]
#[derive(Debug, Clone, Eq, PartialEq)]
pub enum TransactionRequest {
    /// A legacy transaction request
    Legacy(LegacyTransactionRequest),
    /// An EIP-155 transaction request
    EIP155(EIP155TransactionRequest),
    /// An EIP-2930 transaction request
    EIP2930(EIP2930TransactionRequest),
    /// An EIP-1559 transaction request
    EIP1559(EIP1559TransactionRequest),
}

impl TransactionRequest {
    pub fn hash(&self) -> B256 {
        match self {
            TransactionRequest::Legacy(tx) => tx.hash(),
            TransactionRequest::EIP155(tx) => tx.hash(),
            TransactionRequest::EIP2930(tx) => tx.hash(),
            TransactionRequest::EIP1559(tx) => tx.hash(),
        }
    }
}

impl From<TransactionRequest> for TxEnv {
    fn from(value: TransactionRequest) -> Self {
        fn transact_to(kind: TransactionKind) -> TransactTo {
            match kind {
                TransactionKind::Call(to) => TransactTo::Call(to),
                TransactionKind::Create => TransactTo::Create(CreateScheme::Create),
            }
        }

        match value {
            TransactionRequest::Legacy(LegacyTransactionRequest {
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
            }) => Self {
                caller: Address::default(),
                gas_limit,
                gas_price,
                gas_priority_fee: None,
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id: None,
                nonce: Some(nonce),
                access_list: vec![],
            },
            TransactionRequest::EIP155(EIP155TransactionRequest {
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
                chain_id,
            }) => Self {
                caller: Address::default(),
                gas_limit,
                gas_price,
                gas_priority_fee: None,
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id: Some(chain_id),
                nonce: Some(nonce),
                access_list: vec![],
            },
            TransactionRequest::EIP2930(EIP2930TransactionRequest {
                chain_id,
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
                access_list,
            }) => Self {
                caller: Address::default(),
                gas_limit,
                gas_price,
                gas_priority_fee: None,
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id: Some(chain_id),
                nonce: Some(nonce),
                access_list: AccessList::from(access_list).into(),
            },
            TransactionRequest::EIP1559(EIP1559TransactionRequest {
                chain_id,
                nonce,
                max_priority_fee_per_gas,
                max_fee_per_gas,
                gas_limit,
                kind,
                value,
                input,
                access_list,
            }) => Self {
                caller: Address::default(),
                gas_limit,
                gas_price: max_fee_per_gas,
                gas_priority_fee: Some(max_priority_fee_per_gas),
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id: Some(chain_id),
                nonce: Some(nonce),
                access_list: AccessList::from(access_list).into(),
            },
        }
    }
}
