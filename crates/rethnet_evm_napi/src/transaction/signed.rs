use napi::bindgen_prelude::Either3;

mod eip1559;
mod eip2930;
mod legacy;

use crate::cast::TryCast;

pub use self::{
    eip1559::EIP1559SignedTransaction, eip2930::EIP2930SignedTransaction,
    legacy::LegacySignedTransaction,
};

pub type SignedTransaction =
    Either3<LegacySignedTransaction, EIP2930SignedTransaction, EIP1559SignedTransaction>;

impl TryCast<rethnet_eth::transaction::SignedTransaction> for SignedTransaction {
    type Error = napi::Error;

    fn try_cast(self) -> Result<rethnet_eth::transaction::SignedTransaction, Self::Error> {
        Ok(match self {
            Either3::A(transaction) => {
                let v: u64 = transaction.signature.v.clone().try_cast()?;

                if v >= 35 {
                    rethnet_eth::transaction::SignedTransaction::PostEip155Legacy(
                        transaction.try_into()?,
                    )
                } else {
                    rethnet_eth::transaction::SignedTransaction::PreEip155Legacy(
                        transaction.try_into()?,
                    )
                }
            }
            Either3::B(transaction) => {
                rethnet_eth::transaction::SignedTransaction::Eip2930(transaction.try_into()?)
            }
            Either3::C(transaction) => {
                rethnet_eth::transaction::SignedTransaction::Eip1559(transaction.try_into()?)
            }
        })
    }
}
