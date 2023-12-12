mod eip155;
mod eip1559;
mod eip2930;
mod eip4844;
mod fake_signature;
mod legacy;

use k256::SecretKey;
use revm_primitives::U256;

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
    /// Retrieves the instance's chain ID.
    pub fn chain_id(&self) -> Option<u64> {
        match self {
            TransactionRequest::Legacy(_) => None,
            TransactionRequest::Eip155(transaction) => Some(transaction.chain_id),
            TransactionRequest::Eip2930(transaction) => Some(transaction.chain_id),
            TransactionRequest::Eip1559(transaction) => Some(transaction.chain_id),
            TransactionRequest::Eip4844(transaction) => Some(transaction.chain_id),
        }
    }

    /// Retrieves the instance's gas price.
    pub fn gas_price(&self) -> &U256 {
        match self {
            TransactionRequest::Legacy(transaction) => &transaction.gas_price,
            TransactionRequest::Eip155(transaction) => &transaction.gas_price,
            TransactionRequest::Eip2930(transaction) => &transaction.gas_price,
            TransactionRequest::Eip1559(transaction) => &transaction.max_fee_per_gas,
            TransactionRequest::Eip4844(transaction) => &transaction.max_fee_per_gas,
        }
    }

    /// Retrieves the instance's max fee per gas, if it exists.
    pub fn max_fee_per_gas(&self) -> Option<&U256> {
        match self {
            TransactionRequest::Legacy(_)
            | TransactionRequest::Eip155(_)
            | TransactionRequest::Eip2930(_) => None,
            TransactionRequest::Eip1559(transaction) => Some(&transaction.max_fee_per_gas),
            TransactionRequest::Eip4844(transaction) => Some(&transaction.max_fee_per_gas),
        }
    }

    /// Retrieves the instance's max priority fee per gas, if it exists.
    pub fn max_priority_fee_per_gas(&self) -> Option<&U256> {
        match self {
            TransactionRequest::Legacy(_)
            | TransactionRequest::Eip155(_)
            | TransactionRequest::Eip2930(_) => None,
            TransactionRequest::Eip1559(transaction) => Some(&transaction.max_priority_fee_per_gas),
            TransactionRequest::Eip4844(transaction) => Some(&transaction.max_priority_fee_per_gas),
        }
    }

    /// Retrieves the instance's nonce.
    pub fn nonce(&self) -> u64 {
        match self {
            TransactionRequest::Legacy(transaction) => transaction.nonce,
            TransactionRequest::Eip155(transaction) => transaction.nonce,
            TransactionRequest::Eip2930(transaction) => transaction.nonce,
            TransactionRequest::Eip1559(transaction) => transaction.nonce,
            TransactionRequest::Eip4844(transaction) => transaction.nonce,
        }
    }

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
            TransactionRequest::Eip155(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::Eip2930(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::Eip1559(transaction) => transaction.fake_sign(sender).into(),
            TransactionRequest::Eip4844(transaction) => transaction.fake_sign(sender).into(),
        }
    }
}

/// A transaction request and the sender's address.
#[derive(Clone, Debug)]
pub struct TransactionRequestAndSender {
    /// The transaction request.
    pub request: TransactionRequest,
    /// The sender's address.
    pub sender: Address,
}
