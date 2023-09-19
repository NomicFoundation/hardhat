use napi_derive::napi;

use super::PendingTransaction;

#[napi]
pub struct OrderedTransaction {
    transaction: rethnet_evm::OrderedTransaction,
}

#[napi]
impl OrderedTransaction {
    #[napi(getter)]
    pub fn transaction(&self) -> PendingTransaction {
        PendingTransaction::from(self.transaction.transaction().clone())
    }

    #[napi(getter)]
    pub fn order_id(&self) -> usize {
        self.transaction.order_id()
    }
}

impl From<rethnet_evm::OrderedTransaction> for OrderedTransaction {
    fn from(transaction: rethnet_evm::OrderedTransaction) -> Self {
        Self { transaction }
    }
}
