use std::{
    ops::Deref,
    sync::{Arc, OnceLock},
};

use crate::{
    block::Block,
    log::{FullBlockLog, Log, ReceiptLog},
    receipt::{BlockReceipt, TransactionReceipt, TypedReceipt},
    transaction::DetailedTransaction,
    Address,
};
use itertools::izip;
use revm_primitives::B256;

/// A type that combines the block with transaction details about caller addresses
/// and receipts.
#[derive(Clone, Debug)]
pub struct DetailedBlock {
    block: Block,
    transaction_callers: Vec<Address>,
    transaction_receipts: Vec<Arc<BlockReceipt>>,
    hash: OnceLock<B256>,
}

impl DetailedBlock {
    /// Constructs a new instance with the provided data.
    pub fn new(
        block: Block,
        transaction_callers: Vec<Address>,
        transaction_receipts: Vec<Arc<BlockReceipt>>,
    ) -> Self {
        Self {
            block,
            transaction_callers,
            transaction_receipts,
            hash: OnceLock::new(),
        }
    }

    /// Constructs a new instance with the provided data, where the receipts are resolved.
    pub fn with_partial_receipts(
        block: Block,
        transaction_callers: Vec<Address>,
        transaction_receipts: Vec<TransactionReceipt<Log>>,
    ) -> Self {
        let block_hash = block.header.hash();
        let mut log_index = 0;

        let transaction_receipts = transaction_receipts
            .into_iter()
            .enumerate()
            .map(|(transaction_index, receipt)| {
                let transaction_index = transaction_index as u64;

                Arc::new(BlockReceipt {
                    inner: TransactionReceipt {
                        inner: TypedReceipt {
                            cumulative_gas_used: receipt.inner.cumulative_gas_used,
                            logs_bloom: receipt.inner.logs_bloom,
                            logs: receipt
                                .inner
                                .logs
                                .into_iter()
                                .map(|log| FullBlockLog {
                                    inner: ReceiptLog {
                                        inner: log,
                                        transaction_hash: receipt.transaction_hash,
                                    },
                                    block_hash,
                                    block_number: block.header.number,
                                    log_index: {
                                        let index = log_index;
                                        log_index += 1;
                                        index
                                    },
                                    transaction_index,
                                })
                                .collect(),
                            data: receipt.inner.data,
                        },
                        transaction_hash: receipt.transaction_hash,
                        transaction_index,
                        from: receipt.from,
                        to: receipt.to,
                        contract_address: receipt.contract_address,
                        gas_used: receipt.gas_used,
                        effective_gas_price: receipt.effective_gas_price,
                    },
                    block_hash,
                    block_number: block.header.number,
                })
            })
            .collect();

        Self::new(block, transaction_callers, transaction_receipts)
    }

    /// Retrieves the block's hash.
    pub fn hash(&self) -> &B256 {
        self.hash.get_or_init(|| self.block.header.hash())
    }

    /// Retrieves the receipts of the block's transactions.
    pub fn transaction_receipts(&self) -> &[Arc<BlockReceipt>] {
        &self.transaction_receipts
    }

    /// Retrieves the block's transactions.
    pub fn transactions(&self) -> impl Iterator<Item = DetailedTransaction> {
        izip!(
            self.transactions.iter(),
            self.transaction_callers.iter(),
            self.transaction_receipts.iter()
        )
        .map(|(transaction, caller, receipt)| {
            DetailedTransaction::new(transaction, caller, receipt)
        })
    }
}

impl Deref for DetailedBlock {
    type Target = Block;

    fn deref(&self) -> &Self::Target {
        &self.block
    }
}
