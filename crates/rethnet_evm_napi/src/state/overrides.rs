use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Either,
};
use napi_derive::napi;
use rethnet_eth::{Address, Bytes};
use rethnet_evm::HashMap;

use crate::cast::TryCast;

/// Type representing either a diff or full set of overrides for storage information.
pub type StorageOverride = Either<Vec<StorageSlotChange>, Vec<StorageSlotChange>>;

impl TryCast<rethnet_evm::state::StorageOverride> for StorageOverride {
    type Error = napi::Error;

    fn try_cast(self) -> napi::Result<rethnet_evm::state::StorageOverride> {
        match self {
            Either::A(diff) => Ok(rethnet_evm::state::StorageOverride::Diff(
                diff.into_iter()
                    .map(|StorageSlotChange { index, value }| {
                        Ok((BigInt::try_cast(index)?, BigInt::try_cast(value)?))
                    })
                    .collect::<napi::Result<_>>()?,
            )),
            Either::B(full) => Ok(rethnet_evm::state::StorageOverride::Full(
                full.into_iter()
                    .map(|StorageSlotChange { index, value }| {
                        Ok((BigInt::try_cast(index)?, BigInt::try_cast(value)?))
                    })
                    .collect::<napi::Result<_>>()?,
            )),
        }
    }
}

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
    pub storage: Option<StorageOverride>,
}

impl TryCast<rethnet_evm::state::AccountOverride> for AccountOverride {
    type Error = napi::Error;

    fn try_cast(self) -> napi::Result<rethnet_evm::state::AccountOverride> {
        let balance = self.balance.map(BigInt::try_cast).transpose()?;
        let nonce = self.nonce.map(BigInt::try_cast).transpose()?;
        let code = self
            .code
            .map(|code| rethnet_evm::Bytecode::new_raw(Bytes::copy_from_slice(code.as_ref())));
        let storage = self.storage.map(StorageOverride::try_cast).transpose()?;

        Ok(rethnet_evm::state::AccountOverride {
            balance,
            nonce,
            code,
            storage,
        })
    }
}

#[napi]
pub struct StateOverrides {
    inner: rethnet_evm::state::StateOverrides,
}

impl StateOverrides {
    /// Returns a reference to the inner state overrides.
    pub fn as_inner(&self) -> &rethnet_evm::state::StateOverrides {
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
            inner: rethnet_evm::state::StateOverrides::new(account_overrides),
        })
    }
}
