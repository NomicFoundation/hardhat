use std::sync::Arc;

use edr_eth::{Address, B256, U256};
use edr_evm::{state::StateOverride, AccountInfo, StorageSlot};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    tokio::sync::RwLock,
};
use napi_derive::napi;

use crate::{account::Account, cast::TryCast};

#[doc = "Container for state that was modified outside of mining a block."]
#[napi]
pub struct IrregularState {
    inner: Arc<RwLock<edr_evm::state::IrregularState>>,
}

impl IrregularState {
    pub(crate) fn as_inner(&self) -> &Arc<RwLock<edr_evm::state::IrregularState>> {
        &self.inner
    }
}

#[napi]
impl IrregularState {
    #[doc = "Creates a new irregular state."]
    #[napi(constructor)]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(edr_evm::state::IrregularState::default())),
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

    #[doc = "Applies a single change to this instance, combining it with any existing change."]
    #[napi]
    pub async fn apply_account_changes(
        &self,
        block_number: BigInt,
        state_root: Buffer,
        changes: Vec<(Buffer, Account)>,
    ) -> napi::Result<()> {
        let block_number: U256 = BigInt::try_cast(block_number)?;
        let state_root = TryCast::<B256>::try_cast(state_root)?;
        let changes: Vec<(Address, AccountInfo)> = changes
            .into_iter()
            .map(|(address, account)| {
                let address = Address::from_slice(&address);
                let account_info: AccountInfo = Account::try_cast(account)?;

                Ok((address, account_info))
            })
            .collect::<napi::Result<_>>()?;

        let mut irregular_state = self.inner.write().await;

        let state_override = irregular_state
            .state_override_at_block_number(block_number)
            .and_modify(|state_override| {
                state_override.state_root = state_root;
            })
            .or_insert_with(|| StateOverride::with_state_root(state_root));

        for (address, account_info) in changes {
            state_override
                .diff
                .apply_account_change(address, account_info);
        }

        Ok(())
    }

    #[doc = "Applies a storage change for the block corresponding to the specified block number."]
    #[doc = ""]
    #[doc = "If the account corresponding to the specified address hasn't been modified before, either the"]
    #[doc = "value provided in `account_info` will be used, or alternatively a default account will be created."]
    #[napi]
    #[allow(clippy::too_many_arguments)]
    pub async fn apply_account_storage_change(
        &self,
        block_number: BigInt,
        state_root: Buffer,
        address: Buffer,
        index: BigInt,
        old_value: BigInt,
        new_value: BigInt,
        account: Option<Account>,
    ) -> napi::Result<()> {
        let block_number: U256 = BigInt::try_cast(block_number)?;
        let state_root = TryCast::<B256>::try_cast(state_root)?;
        let address = Address::from_slice(&address);
        let index: U256 = BigInt::try_cast(index)?;
        let old_value: U256 = BigInt::try_cast(old_value)?;
        let new_value: U256 = BigInt::try_cast(new_value)?;
        let account_info: Option<AccountInfo> = account.map(Account::try_cast).transpose()?;

        let slot = StorageSlot::new_changed(old_value, new_value);

        let mut irregular_state = self.inner.write().await;
        irregular_state
            .state_override_at_block_number(block_number)
            .and_modify(|state_override| {
                state_override.state_root = state_root;
            })
            .or_insert_with(|| StateOverride::with_state_root(state_root))
            .diff
            .apply_storage_change(address, index, slot, account_info);

        Ok(())
    }
}
