use napi::bindgen_prelude::{Buffer, Either3};
use napi_derive::napi;
use rethnet_eth::Address;

use crate::cast::TryCast;

use super::signed::{EIP1559SignedTransaction, EIP2930SignedTransaction, LegacySignedTransaction};

#[napi(object)]
pub struct PendingTransaction {
    /// Signed transaction
    pub transaction:
        Either3<LegacySignedTransaction, EIP2930SignedTransaction, EIP1559SignedTransaction>,
    /// Optional 160-bit address of caller that will overwrite the signer's address
    pub caller: Option<Buffer>,
}

impl TryFrom<PendingTransaction> for rethnet_evm::PendingTransaction {
    type Error = napi::Error;

    fn try_from(value: PendingTransaction) -> Result<Self, Self::Error> {
        let transaction = value.transaction.try_cast()?;

        if let Some(caller) = value.caller {
            let caller = Address::from_slice(&caller);
            Ok(Self::with_caller(transaction, caller))
        } else {
            Self::new(transaction)
                .map_err(|e| napi::Error::new(napi::Status::InvalidArg, e.to_string()))
        }
    }
}
