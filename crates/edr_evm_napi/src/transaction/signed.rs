mod eip1559;
mod eip2930;
mod eip4844;
mod legacy;

use napi::bindgen_prelude::Either4;

use crate::cast::TryCast;

pub use self::{
    eip1559::EIP1559SignedTransaction, eip2930::EIP2930SignedTransaction,
    eip4844::Eip4844SignedTransaction, legacy::LegacySignedTransaction,
};

pub type SignedTransaction = Either4<
    LegacySignedTransaction,
    EIP2930SignedTransaction,
    EIP1559SignedTransaction,
    Eip4844SignedTransaction,
>;

impl TryCast<edr_eth::transaction::SignedTransaction> for SignedTransaction {
    type Error = napi::Error;

    fn try_cast(self) -> Result<edr_eth::transaction::SignedTransaction, Self::Error> {
        Ok(match self {
            Either4::A(transaction) => {
                let v: u64 = transaction.signature.v.clone().try_cast()?;

                if v >= 35 {
                    edr_eth::transaction::SignedTransaction::PostEip155Legacy(
                        transaction.try_into()?,
                    )
                } else {
                    edr_eth::transaction::SignedTransaction::PreEip155Legacy(
                        transaction.try_into()?,
                    )
                }
            }
            Either4::B(transaction) => {
                edr_eth::transaction::SignedTransaction::Eip2930(transaction.try_into()?)
            }
            Either4::C(transaction) => {
                edr_eth::transaction::SignedTransaction::Eip1559(transaction.try_into()?)
            }
            Either4::D(transaction) => {
                edr_eth::transaction::SignedTransaction::Eip4844(transaction.try_into()?)
            }
        })
    }
}
