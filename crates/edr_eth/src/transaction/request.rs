mod eip155;
mod eip1559;
mod eip2930;
mod eip4844;
mod fake_signature;
mod legacy;

use k256::SecretKey;

pub use self::{
    eip155::Eip155TransactionRequest, eip1559::Eip1559TransactionRequest,
    eip2930::Eip2930TransactionRequest, eip4844::Eip4844TransactionRequest,
    legacy::LegacyTransactionRequest,
};
use crate::{signature::SignatureError, transaction::SignedTransaction, Address};

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
    Eip155(Eip155TransactionRequest),
    /// An EIP-2930 transaction request
    Eip2930(Eip2930TransactionRequest),
    /// An EIP-1559 transaction request
    Eip1559(Eip1559TransactionRequest),
    /// An EIP-4844 transaction request
    Eip4844(Eip4844TransactionRequest),
}

impl TransactionRequest {
    pub fn sign(self, secret_key: &SecretKey) -> Result<SignedTransaction, SignatureError> {
        Ok(match self {
            TransactionRequest::Legacy(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::Eip155(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::Eip2930(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::Eip1559(transaction) => transaction.sign(secret_key)?.into(),
            TransactionRequest::Eip4844(transaction) => transaction.sign(secret_key)?.into(),
        })
    }

    pub fn fake_sign(self, sender: &Address) -> SignedTransaction {
        match self {
            TransactionRequest::Legacy(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::EIP155(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::EIP2930(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::EIP1559(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::Eip4844(transaction) => transaction.fake_sign(sender).into(),
        }
    }
}
