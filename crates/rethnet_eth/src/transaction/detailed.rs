use std::{ops::Deref, sync::Arc};

use crate::{receipt::BlockReceipt, transaction::SignedTransaction, Address};

pub struct DetailedTransaction<'t> {
    transaction: &'t SignedTransaction,
    pub caller: &'t Address,
    pub receipt: &'t Arc<BlockReceipt>,
}

impl<'t> DetailedTransaction<'t> {
    /// Constructs a new instance
    pub fn new(
        transaction: &'t SignedTransaction,
        caller: &'t Address,
        receipt: &'t Arc<BlockReceipt>,
    ) -> Self {
        Self {
            transaction,
            caller,
            receipt,
        }
    }
}

impl<'t> Deref for DetailedTransaction<'t> {
    type Target = SignedTransaction;

    fn deref(&self) -> &Self::Target {
        self.transaction
    }
}
