use std::ops::Deref;

use napi::{
    bindgen_prelude::{Buffer, Either3},
    tokio::runtime,
    Env, JsObject,
};
use napi_derive::napi;
use rethnet_eth::Address;

use crate::{cast::TryCast, config::SpecId, state::StateManager};

use super::signed::{EIP1559SignedTransaction, EIP2930SignedTransaction, LegacySignedTransaction};

#[napi]
pub struct PendingTransaction {
    inner: rethnet_evm::PendingTransaction,
}

impl From<rethnet_evm::PendingTransaction> for PendingTransaction {
    fn from(value: rethnet_evm::PendingTransaction) -> Self {
        Self { inner: value }
    }
}

#[napi]
impl PendingTransaction {
    /// Tries to construct a new [`PendingTransaction`].
    // TODO: There seems to be a limitation in napi-rs that prevents us from creating
    // a #[napi(factory)] with an async fn
    #[napi(ts_return_type = "Promise<PendingTransaction>")]
    pub fn create(
        env: Env,
        state_manager: &StateManager,
        spec_id: SpecId,
        transaction: Either3<
            LegacySignedTransaction,
            EIP2930SignedTransaction,
            EIP1559SignedTransaction,
        >,
        caller: Option<Buffer>,
    ) -> napi::Result<JsObject> {
        let transaction = transaction.try_cast()?;
        let spec_id: rethnet_evm::SpecId = spec_id.into();

        let state = (*state_manager).clone();

        let (deferred, promise) = env.create_deferred()?;
        runtime::Handle::current().spawn(async move {
            let state = state.read().await;

            let result = if let Some(caller) = caller {
                let caller = Address::from_slice(&caller);

                rethnet_evm::PendingTransaction::with_caller(&*state, spec_id, transaction, caller)
            } else {
                rethnet_evm::PendingTransaction::new(&*state, spec_id, transaction)
            }
            .map_or_else(
                |e| Err(napi::Error::new(napi::Status::InvalidArg, e.to_string())),
                |transaction| Ok(PendingTransaction::from(transaction)),
            );

            deferred.resolve(|_| result);
        });

        Ok(promise)
    }

    #[napi(getter)]
    pub fn caller(&self) -> Buffer {
        Buffer::from(self.inner.caller().as_bytes())
    }

    #[napi(getter)]
    pub fn transaction(
        &self,
        env: Env,
    ) -> napi::Result<
        // HACK: napi does not convert Rust type aliases to its underlaying types when generating bindings
        // so manually do that here
        Either3<LegacySignedTransaction, EIP2930SignedTransaction, EIP1559SignedTransaction>,
    > {
        match &*self.inner {
            rethnet_eth::transaction::SignedTransaction::PreEip155Legacy(transaction) => {
                LegacySignedTransaction::from_legacy(&env, transaction).map(Either3::A)
            }
            rethnet_eth::transaction::SignedTransaction::PostEip155Legacy(transaction) => {
                LegacySignedTransaction::from_eip155(&env, transaction).map(Either3::A)
            }
            rethnet_eth::transaction::SignedTransaction::Eip2930(transaction) => {
                EIP2930SignedTransaction::new(&env, transaction).map(Either3::B)
            }
            rethnet_eth::transaction::SignedTransaction::Eip1559(transaction) => {
                EIP1559SignedTransaction::new(&env, transaction).map(Either3::C)
            }
        }
    }
}

impl Deref for PendingTransaction {
    type Target = rethnet_evm::PendingTransaction;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}
