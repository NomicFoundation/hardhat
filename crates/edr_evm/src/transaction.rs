mod detailed;
mod executable;

use std::fmt::Debug;

use edr_eth::{signature::SignatureError, U256};
use revm::{
    db::DatabaseComponentError,
    primitives::{EVMError, InvalidHeader, InvalidTransaction},
};

pub use self::{detailed::*, executable::*};

/// Invalid transaction error
#[derive(Debug, thiserror::Error)]
pub enum TransactionError<BE, SE> {
    /// Blockchain errors
    #[error(transparent)]
    Blockchain(#[from] BE),
    #[error("{0}")]
    /// Custom errors
    Custom(String),
    /// EIP-1559 is not supported
    #[error("Cannot run transaction: EIP 1559 is not activated.")]
    Eip1559Unsupported,
    /// Corrupt transaction data
    #[error("Invalid transaction: {0:?}")]
    InvalidTransaction(InvalidTransaction),
    /// The transaction is expected to have a prevrandao, as the executor's
    /// config is on a post-merge hardfork.
    #[error("Post-merge transaction is missing prevrandao")]
    MissingPrevrandao,
    /// State errors
    #[error(transparent)]
    State(SE),
}

impl<BE, SE> From<EVMError<DatabaseComponentError<SE, BE>>> for TransactionError<BE, SE>
where
    BE: Debug + Send,
    SE: Debug + Send,
{
    fn from(error: EVMError<DatabaseComponentError<SE, BE>>) -> Self {
        match error {
            EVMError::Transaction(e) => Self::InvalidTransaction(e),
            EVMError::Header(
                InvalidHeader::ExcessBlobGasNotSet | InvalidHeader::PrevrandaoNotSet,
            ) => unreachable!("error: {error:?}"),
            EVMError::Database(DatabaseComponentError::State(e)) => Self::State(e),
            EVMError::Database(DatabaseComponentError::BlockHash(e)) => Self::Blockchain(e),
            EVMError::Custom(error) => Self::Custom(error),
        }
    }
}

/// An error that occurred while trying to construct an
/// [`ExecutableTransaction`].
#[derive(Debug, thiserror::Error)]
pub enum TransactionCreationError {
    /// Creating contract without any data.
    #[error("Contract creation without any data provided")]
    ContractMissingData,
    /// Transaction gas limit is insufficient to afford initial gas cost.
    #[error("Transaction requires at least {initial_gas_cost} gas but got {gas_limit}")]
    InsufficientGas {
        /// The initial gas cost of a transaction
        initial_gas_cost: U256,
        /// The gas limit of the transaction
        gas_limit: u64,
    },
    /// An error involving the transaction's signature.
    #[error(transparent)]
    Signature(SignatureError),
}
