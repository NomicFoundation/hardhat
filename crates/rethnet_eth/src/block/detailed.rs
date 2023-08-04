use std::{ops::Deref, sync::OnceLock};

use crate::{block::Block, receipt::TypedReceipt, transaction::DetailedTransaction, Address};
use itertools::izip;
use revm_primitives::B256;

/// A type that combines the block with transaction details about caller addresses
/// and receipts.
#[derive(Clone, Debug)]
pub struct DetailedBlock {
    block: Block,
    transaction_callers: Vec<Address>,
    transaction_receipts: Vec<TypedReceipt>,
    hash: OnceLock<B256>,
}

impl DetailedBlock {
    /// Constructs a new instance with the provided data.
    pub fn new(
        block: Block,
        transaction_callers: Vec<Address>,
        transaction_receipts: Vec<TypedReceipt>,
    ) -> Self {
        Self {
            block,
            transaction_callers,
            transaction_receipts,
            hash: OnceLock::new(),
        }
    }

    /// Retrieves the block's hash.
    pub fn hash(&self) -> &B256 {
        self.hash.get_or_init(|| self.block.header.hash())
    }

    /// Retrieves the instance's transactions.
    pub fn transactions(&self) -> impl Iterator<Item = DetailedTransaction<'_>> {
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
