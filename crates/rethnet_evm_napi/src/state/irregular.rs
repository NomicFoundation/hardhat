use std::sync::Arc;

use napi::{bindgen_prelude::BigInt, tokio::sync::RwLock};
use napi_derive::napi;
use rethnet_eth::U256;
use rethnet_evm::state::{StateError, SyncState};

use crate::cast::TryCast;

use super::State;

type IrregularSyncState =
    rethnet_evm::state::IrregularState<StateError, Box<dyn SyncState<StateError>>>;

#[doc = "Container for state that was modified outside of mining a block."]
#[napi]
pub struct IrregularState {
    inner: Arc<RwLock<IrregularSyncState>>,
}

#[napi]
impl IrregularState {
    #[doc = "Creates a new irregular state."]
    #[napi(constructor)]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(IrregularSyncState::default())),
        }
    }

    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn deep_clone(&self) -> Self {
        let irregular_state = (*self.inner.read().await).clone();
        Self {
            inner: Arc::new(RwLock::new(irregular_state)),
        }
    }

    #[doc = "Gets an irregular state by block number."]
    #[napi]
    pub async fn state_by_block_number(&self, block_number: BigInt) -> napi::Result<Option<State>> {
        let block_number: U256 = BigInt::try_cast(block_number)?;

        let irregular_state = self.inner.read().await;
        Ok(irregular_state
            .state_by_block_number(&block_number)
            .cloned()
            .map(State::from))
    }

    #[doc = "Inserts the state for a block number, overwriting the previous state if it exists."]
    #[napi]
    pub async fn insert_state(&self, block_number: BigInt, state: &State) -> napi::Result<()> {
        let block_number: U256 = BigInt::try_cast(block_number)?;

        let state = state.read().await.clone();

        let mut irregular_state = self.inner.write().await;
        irregular_state.insert_state(block_number, state);

        Ok(())
    }
}
