mod eip1559;
mod eip2930;
mod legacy;

use revm_primitives::B256;

pub use self::{
    eip1559::EIP1559TransactionRequest, eip2930::EIP2930TransactionRequest,
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
    /// An EIP-2930 transaction request
    EIP2930(EIP2930TransactionRequest),
    /// An EIP-1559 transaction request
    EIP1559(EIP1559TransactionRequest),
}

impl TransactionRequest {
    pub fn hash(&self) -> B256 {
        match self {
            Self::Legacy(t) => t.hash(),
            Self::EIP2930(t) => t.hash(),
            Self::EIP1559(t) => t.hash(),
        }
    }
}
