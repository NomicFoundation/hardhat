use edr_eth::{Address, Bytes};
use edr_evm::HashMap;
use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

use crate::cast::TryCast;

#[napi(object)]
pub struct StorageSlotChange {
    pub index: BigInt,
    pub value: BigInt,
}

/// Values for overriding account information.
#[napi(object)]
pub struct AccountOverride {
    pub balance: Option<BigInt>,
    pub nonce: Option<BigInt>,
    pub code: Option<Buffer>,
    pub storage: Option<Vec<StorageSlotChange>>,
    pub storage_diff: Option<Vec<StorageSlotChange>>,
}

impl TryCast<edr_evm::state::AccountOverride> for AccountOverride {
    type Error = napi::Error;

    fn try_cast(self) -> napi::Result<edr_evm::state::AccountOverride> {
        let balance = self.balance.map(BigInt::try_cast).transpose()?;
        let nonce = self.nonce.map(BigInt::try_cast).transpose()?;
        let code = self
            .code
            .map(|code| edr_evm::Bytecode::new_raw(Bytes::copy_from_slice(code.as_ref())));

        let storage =
            match (self.storage, self.storage_diff) {
                (None, None) => None,
                (None, Some(diff)) => Some(edr_evm::state::StorageOverride::Diff(
                    diff.into_iter()
                        .map(|StorageSlotChange { index, value }| {
                            Ok((BigInt::try_cast(index)?, BigInt::try_cast(value)?))
                        })
                        .collect::<napi::Result<_>>()?,
                )),
                (Some(full), None) => Some(edr_evm::state::StorageOverride::Full(
                    full.into_iter()
                        .map(|StorageSlotChange { index, value }| {
                            Ok((BigInt::try_cast(index)?, BigInt::try_cast(value)?))
                        })
                        .collect::<napi::Result<_>>()?,
                )),
                (Some(_), Some(_)) => return Err(napi::Error::new(
                    napi::Status::InvalidArg,
                    "The properties 'storage' and 'storageDiff' cannot be used simultaneously when configuring the state override set passed to the eth_call method.",
                )),
            };

        Ok(edr_evm::state::AccountOverride {
            balance,
            nonce,
            code,
            storage,
        })
    }
}

#[napi]
pub struct StateOverrides {
    inner: edr_evm::state::StateOverrides,
}

impl StateOverrides {
    /// Returns a reference to the inner state overrides.
    pub fn as_inner(&self) -> &edr_evm::state::StateOverrides {
        &self.inner
    }
}

#[napi]
impl StateOverrides {
    #[doc = "Constructs a new set of state overrides."]
    #[napi(constructor)]
    pub fn new(account_overrides: Vec<(Buffer, AccountOverride)>) -> napi::Result<Self> {
        let account_overrides: HashMap<Address, _> = account_overrides
            .into_iter()
            .map(|(address, account_override)| {
                let address = Address::from_slice(&address);
                let account_override = account_override.try_cast()?;

                Ok((address, account_override))
            })
            .collect::<napi::Result<_>>()?;

        Ok(Self {
            inner: edr_evm::state::StateOverrides::new(account_overrides),
        })
    }
}
