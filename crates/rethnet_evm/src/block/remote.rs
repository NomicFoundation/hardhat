use std::sync::Arc;

use rethnet_eth::{
    block::Header,
    remote::eth::{self, TransactionConversionError},
    transaction::SignedTransaction,
    withdrawal::Withdrawal,
    Address, B256, B64,
};

use crate::{blockchain::BlockchainError, Block, SyncBlock};

/// A remote block, which lazily loads additional information when requested.
#[derive(Clone, Debug)]
pub struct RemoteBlock {
    header: Header,
    transactions: Vec<SignedTransaction>,
    /// The caller addresses of the block's transactions
    callers: Vec<Address>,
    /// The hashes of the block's ommers
    _ommers: Vec<B256>,
    _withdrawals: Option<Vec<Withdrawal>>,
    /// The block's hash
    hash: B256,
}

impl Block for RemoteBlock {
    type Error = BlockchainError;

    fn hash(&self) -> &B256 {
        &self.hash
    }

    fn header(&self) -> &Header {
        &self.header
    }

    fn transactions(&self) -> &[SignedTransaction] {
        &self.transactions
    }

    fn transaction_callers(&self) -> &[Address] {
        &self.callers
    }
}

impl From<RemoteBlock> for Arc<dyn SyncBlock<Error = BlockchainError>> {
    fn from(value: RemoteBlock) -> Self {
        Arc::new(value)
    }
}

/// Error that occurs when trying to convert the JSON-RPC `Block` type.
#[derive(Debug, thiserror::Error)]
pub enum BlockConversionError {
    /// Missing hash
    #[error("Missing hash")]
    MissingHash,
    /// Missing miner
    #[error("Missing miner")]
    MissingMiner,
    /// Missing nonce
    #[error("Missing nonce")]
    MissingNonce,
    /// Missing number
    #[error("Missing numbeer")]
    MissingNumber,
    /// Transaction conversion error
    #[error(transparent)]
    TransactionConversionError(#[from] TransactionConversionError),
}

impl TryFrom<eth::Block<eth::Transaction>> for RemoteBlock {
    type Error = BlockConversionError;

    fn try_from(value: eth::Block<eth::Transaction>) -> Result<Self, Self::Error> {
        let header = Header {
            parent_hash: value.parent_hash,
            ommers_hash: value.sha3_uncles,
            beneficiary: value.miner.ok_or(BlockConversionError::MissingMiner)?,
            state_root: value.state_root,
            transactions_root: value.transactions_root,
            receipts_root: value.receipts_root,
            logs_bloom: value.logs_bloom,
            difficulty: value.difficulty,
            number: value.number.ok_or(BlockConversionError::MissingNumber)?,
            gas_limit: value.gas_limit,
            gas_used: value.gas_used,
            timestamp: value.timestamp,
            extra_data: value.extra_data,
            mix_hash: value.mix_hash,
            nonce: B64::from_limbs([value
                .nonce
                .ok_or(BlockConversionError::MissingNonce)?
                .to_be()]),
            base_fee_per_gas: value.base_fee_per_gas,
            withdrawals_root: value.withdrawals_root,
        };

        let (transactions, callers): (Vec<SignedTransaction>, Vec<Address>) =
            itertools::process_results(
                value.transactions.into_iter().map(TryInto::try_into),
                #[allow(clippy::redundant_closure_for_method_calls)]
                |iter| iter.unzip(),
            )?;

        let hash = value.hash.ok_or(BlockConversionError::MissingHash)?;

        Ok(Self {
            header,
            transactions,
            callers,
            _ommers: value.uncles,
            _withdrawals: value.withdrawals,
            hash,
        })
    }
}
