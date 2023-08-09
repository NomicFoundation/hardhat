use napi::bindgen_prelude::Either4;

mod eip155;
mod eip1559;
mod eip2930;
mod legacy;

use crate::cast::TryCast;

pub use self::{
    eip155::EIP155SignedTransaction, eip1559::EIP1559SignedTransaction,
    eip2930::EIP2930SignedTransaction, legacy::LegacySignedTransaction,
};

pub type SignedTransaction = Either4<
    LegacySignedTransaction,
    EIP155SignedTransaction,
    EIP2930SignedTransaction,
    EIP1559SignedTransaction,
>;

impl TryCast<rethnet_eth::transaction::SignedTransaction> for SignedTransaction {
    type Error = napi::Error;

    fn try_cast(self) -> Result<rethnet_eth::transaction::SignedTransaction, Self::Error> {
        Ok(match self {
            Either4::A(transaction) => {
                rethnet_eth::transaction::SignedTransaction::Legacy(transaction.try_into()?)
            }
            Either4::B(transaction) => {
                rethnet_eth::transaction::SignedTransaction::EIP155(transaction.try_into()?)
            }
            Either4::C(transaction) => {
                rethnet_eth::transaction::SignedTransaction::EIP2930(transaction.try_into()?)
            }
            Either4::D(transaction) => {
                rethnet_eth::transaction::SignedTransaction::EIP1559(transaction.try_into()?)
            }
        })
    }
}
