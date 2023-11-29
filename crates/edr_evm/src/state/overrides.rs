use edr_eth::{
    account::KECCAK_EMPTY,
    remote::{AccountOverrideOptions, StateOverrideOptions},
    Address, B256, U256,
};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode, HashMap},
};

/// Type representing either a diff or full set of overrides for storage
/// information.
#[derive(Clone, Debug)]
pub enum StorageOverride {
    /// A diff of storage overrides.
    Diff(HashMap<U256, U256>),
    /// A full set of storage overrides.
    Full(HashMap<U256, U256>),
}

/// Values for overriding account information.
#[derive(Clone, Debug)]
pub struct AccountOverride {
    /// Account balance override.
    pub balance: Option<U256>,
    /// Account nonce override.
    pub nonce: Option<u64>,
    /// Account code override.
    pub code: Option<Bytecode>,
    /// Account storage override.
    pub storage: Option<StorageOverride>,
}

impl AccountOverride {
    /// Overrides the provided original account information.
    pub fn override_info(&self, original: Option<AccountInfo>) -> Option<AccountInfo> {
        let has_override = self.balance.is_some() | self.nonce.is_some() | self.code.is_some();

        if !has_override {
            return original;
        }

        let AccountInfo {
            mut balance,
            mut nonce,
            mut code_hash,
            mut code,
        } = original.unwrap_or_default();

        if let Some(new_balance) = &self.balance {
            balance = *new_balance;
        }

        if let Some(new_nonce) = &self.nonce {
            nonce = *new_nonce;
        }

        if let Some(new_code) = &self.code {
            let new_code_hash = new_code.hash_slow();
            if new_code_hash == KECCAK_EMPTY {
                code = None;
                code_hash = KECCAK_EMPTY;
            } else {
                code = Some(new_code.clone());
                code_hash = new_code_hash;
            }
        }

        Some(AccountInfo {
            balance,
            nonce,
            code_hash,
            code,
        })
    }
}

/// Error that occurs when converting account override options into an account
/// override.
#[derive(Debug, thiserror::Error)]
pub enum AccountOverrideConversionError {
    /// Storage override options are mutually exclusive.
    #[error("The properties `storage` and `storageDiff` cannot be used simultaneously when configuring the state override set passed to the eth_call method.")]
    StorageOverrideConflict,
}

impl TryFrom<AccountOverrideOptions> for AccountOverride {
    type Error = AccountOverrideConversionError;

    fn try_from(value: AccountOverrideOptions) -> Result<Self, Self::Error> {
        let AccountOverrideOptions {
            balance,
            nonce,
            code,
            storage,
            storage_diff,
        } = value;

        let storage = if let Some(storage) = storage {
            if storage_diff.is_some() {
                return Err(AccountOverrideConversionError::StorageOverrideConflict);
            } else {
                Some(StorageOverride::Full(storage))
            }
        } else {
            storage_diff.map(StorageOverride::Diff)
        };

        Ok(Self {
            balance,
            nonce,
            code: code.map(|bytes| Bytecode::new_raw(bytes.into())),
            storage,
        })
    }
}

/// A set of overrides for state information.
#[derive(Clone, Debug, Default)]
pub struct StateOverrides {
    account_overrides: HashMap<Address, AccountOverride>,
    code_by_hash_overrides: HashMap<B256, Bytecode>,
}

impl StateOverrides {
    /// Constructs a new set of state overrides.
    pub fn new(mut account_overrides: HashMap<Address, AccountOverride>) -> Self {
        let code_by_hash_overrides = account_overrides
            .values_mut()
            .filter_map(|account_override| {
                if let Some(code) = &mut account_override.code {
                    let code_hash = code.hash_slow();

                    Some((code_hash, code.clone()))
                } else {
                    None
                }
            })
            .collect();

        Self {
            account_overrides,
            code_by_hash_overrides,
        }
    }

    /// Retrieves the account information for the provided address, applying any
    /// overrides.
    pub fn account_info<StateError>(
        &self,
        state: &dyn StateRef<Error = StateError>,
        address: &Address,
    ) -> Result<Option<AccountInfo>, StateError> {
        let original = state.basic(*address)?;

        Ok(
            if let Some(account_override) = self.account_overrides.get(address) {
                account_override.override_info(original)
            } else {
                original
            },
        )
    }

    /// Retrieves the storage information for the provided address and index,
    /// applying any overrides.
    pub fn account_storage_at<StateError>(
        &self,
        state: &dyn StateRef<Error = StateError>,
        address: &Address,
        index: &U256,
    ) -> Result<U256, StateError> {
        match self.account_overrides.get(address) {
            Some(account_override) => match &account_override.storage {
                Some(StorageOverride::Diff(diff)) => {
                    if let Some(storage_override) = diff.get(index) {
                        Ok(*storage_override)
                    } else {
                        state.storage(*address, *index)
                    }
                }
                Some(StorageOverride::Full(full)) => {
                    Ok(full.get(index).copied().unwrap_or_default())
                }
                None => state.storage(*address, *index),
            },
            None => state.storage(*address, *index),
        }
    }

    /// Retrieves the code for the provided hash, applying any overrides.
    pub fn code_by_hash<StateError>(
        &self,
        state: &dyn StateRef<Error = StateError>,
        hash: B256,
    ) -> Result<Bytecode, StateError> {
        if let Some(code) = self.code_by_hash_overrides.get(&hash) {
            Ok(code.clone())
        } else {
            state.code_by_hash(hash)
        }
    }
}

impl TryFrom<StateOverrideOptions> for StateOverrides {
    type Error = AccountOverrideConversionError;

    fn try_from(value: StateOverrideOptions) -> Result<Self, Self::Error> {
        let account_overrides = value
            .into_iter()
            .map(|(address, options)| {
                let account_override = AccountOverride::try_from(options)?;

                Ok((address, account_override))
            })
            .collect::<Result<_, _>>()?;

        Ok(Self::new(account_overrides))
    }
}

/// A wrapper around a state ref object that applies overrides.
pub struct StateRefOverrider<'state, StateErrorT> {
    overrides: &'state StateOverrides,
    state: &'state dyn StateRef<Error = StateErrorT>,
}

impl<'state, StateErrorT> StateRefOverrider<'state, StateErrorT> {
    /// Creates a new state ref overrider.
    pub fn new(
        overrides: &'state StateOverrides,
        state: &'state dyn StateRef<Error = StateErrorT>,
    ) -> StateRefOverrider<'state, StateErrorT> {
        StateRefOverrider { overrides, state }
    }
}

impl<'state, StateErrorT> StateRef for StateRefOverrider<'state, StateErrorT> {
    type Error = StateErrorT;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.overrides.account_info(self.state, &address)
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.overrides.code_by_hash(self.state, code_hash)
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.overrides
            .account_storage_at(self.state, &address, &index)
    }
}
