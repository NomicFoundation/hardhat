mod eip155;
mod eip1559;
mod eip2930;
mod eip4844;
mod legacy;

use k256::SecretKey;

use crate::{signature::SignatureError, transaction::SignedTransaction};

pub use self::{
    eip155::EIP155TransactionRequest, eip1559::EIP1559TransactionRequest,
    eip2930::EIP2930TransactionRequest, eip4844::Eip4844TransactionRequest,
    legacy::LegacyTransactionRequest,
};

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
    /// An EIP-4844 transaction request
    Eip4844(Eip4844TransactionRequest),
}

impl TransactionRequest {
    pub fn sign(self, secret_key: &SecretKey) -> Result<SignedTransaction, SignatureError> {
        Ok(match self {
            TransactionRequest::Legacy(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::EIP155(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::EIP2930(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::EIP1559(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::Eip4844(transaction) => transaction.sign(secret_key)?.into(),
        })
    }
}
