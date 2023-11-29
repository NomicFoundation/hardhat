use std::sync::{Arc, OnceLock};

use edr_eth::{
    block::{BlobGas, Header},
    receipt::BlockReceipt,
    remote::{
        eth::{self, TransactionConversionError},
        RpcClient,
    },
    transaction::SignedTransaction,
    withdrawal::Withdrawal,
    Address, B256, B64, U256,
};
use tokio::runtime;

use crate::{blockchain::BlockchainError, Block, SyncBlock};

/// Error that occurs when trying to convert the JSON-RPC `Block` type.
#[derive(Debug, thiserror::Error)]
pub enum CreationError {
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
    /// Size too large
    #[error("Size too large: {0}")]
    SizeTooLarge(U256),
    /// Transaction conversion error
    #[error(transparent)]
    TransactionConversionError(#[from] TransactionConversionError),
}

/// A remote block, which lazily loads receipts.
#[derive(Clone, Debug)]
pub struct RemoteBlock {
    header: Header,
    transactions: Vec<SignedTransaction>,
    /// The caller addresses of the block's transactions
    callers: Vec<Address>,
    /// The receipts of the block's transactions
    receipts: OnceLock<Vec<Arc<BlockReceipt>>>,
    /// The hashes of the block's ommers
    ommer_hashes: Vec<B256>,
    /// The staking withdrawals
    withdrawals: Option<Vec<Withdrawal>>,
    /// The block's hash
    hash: B256,
    /// The length of the RLP encoding of this block in bytes
    size: u64,
    // The RPC client is needed to lazily fetch receipts
    rpc_client: Arc<RpcClient>,
    runtime: runtime::Handle,
}

impl RemoteBlock {
    /// Constructs a new instance with the provided JSON-RPC block and client.
    pub fn new(
        block: eth::Block<eth::Transaction>,
        rpc_client: Arc<RpcClient>,
        runtime: runtime::Handle,
    ) -> Result<Self, CreationError> {
        let header = Header {
            parent_hash: block.parent_hash,
            ommers_hash: block.sha3_uncles,
            beneficiary: block.miner.ok_or(CreationError::MissingMiner)?,
            state_root: block.state_root,
            transactions_root: block.transactions_root,
            receipts_root: block.receipts_root,
            logs_bloom: block.logs_bloom,
            difficulty: block.difficulty,
            number: block.number.ok_or(CreationError::MissingNumber)?,
            gas_limit: block.gas_limit,
            gas_used: block.gas_used,
            timestamp: block.timestamp,
            extra_data: block.extra_data,
            mix_hash: block.mix_hash,
            nonce: B64::from_limbs([block.nonce.ok_or(CreationError::MissingNonce)?.to_be()]),
            base_fee_per_gas: block.base_fee_per_gas,
            withdrawals_root: block.withdrawals_root,
            blob_gas: block.blob_gas_used.and_then(|gas_used| {
                block.excess_blob_gas.map(|excess_gas| BlobGas {
                    gas_used,
                    excess_gas,
                })
            }),
            parent_beacon_block_root: block.parent_beacon_block_root,
        };

        let (transactions, callers): (Vec<SignedTransaction>, Vec<Address>) =
            itertools::process_results(
                block.transactions.into_iter().map(TryInto::try_into),
                #[allow(clippy::redundant_closure_for_method_calls)]
                |iter| iter.unzip(),
            )?;

        let hash = block.hash.ok_or(CreationError::MissingHash)?;

        Ok(Self {
            header,
            transactions,
            callers,
            receipts: OnceLock::new(),
            ommer_hashes: block.uncles,
            withdrawals: block.withdrawals,
            hash,
            rpc_client,
            size: block.size,
            runtime,
        })
    }
}

impl Block for RemoteBlock {
    type Error = BlockchainError;

    fn hash(&self) -> &B256 {
        &self.hash
    }

    fn header(&self) -> &Header {
        &self.header
    }

    fn ommer_hashes(&self) -> &[B256] {
        self.ommer_hashes.as_slice()
    }

    fn rlp_size(&self) -> u64 {
        self.size
    }

    fn transactions(&self) -> &[SignedTransaction] {
        &self.transactions
    }

    fn transaction_callers(&self) -> &[Address] {
        &self.callers
    }

    fn transaction_receipts(&self) -> Result<Vec<Arc<BlockReceipt>>, Self::Error> {
        if let Some(receipts) = self.receipts.get() {
            return Ok(receipts.clone());
        }

        let receipts: Vec<Arc<BlockReceipt>> = tokio::task::block_in_place(|| {
            self.runtime.block_on(
                self.rpc_client.get_transaction_receipts(
                    self.transactions.iter().map(SignedTransaction::hash),
                ),
            )
        })?
        .expect("All receipts of the block should exist")
        .into_iter()
        .map(Arc::new)
        .collect();

        self.receipts
            .set(receipts.clone())
            .expect("Receipts should not be set");

        Ok(receipts)
    }

    fn withdrawals(&self) -> Option<&[Withdrawal]> {
        self.withdrawals.as_deref()
    }
}

impl From<RemoteBlock> for Arc<dyn SyncBlock<Error = BlockchainError>> {
    fn from(value: RemoteBlock) -> Self {
        Arc::new(value)
    }
}
