use revm_primitives::{Address, Bytes, HashMap, B256, U256};

/// Type representing a set of overrides for storage information.
pub type StorageOverride = HashMap<B256, U256>;

/// Options for overriding account information.
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountOverrideOptions {
    /// Account balance override.
    pub balance: Option<U256>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "crate::serde::optional_u64"
    )]
    /// Account nonce override.
    pub nonce: Option<u64>,
    /// Account code override.
    pub code: Option<Bytes>,
    /// Account storage override. Mutually exclusive with `storage_diff`.
    #[serde(rename = "state")]
    pub storage: Option<StorageOverride>,
    /// Account storage diff override. Mutually exclusive with `storage`.
    #[serde(rename = "stateDiff")]
    pub storage_diff: Option<StorageOverride>,
}

/// Type representing a full set of overrides for account information.
pub type StateOverrideOptions = HashMap<Address, AccountOverrideOptions>;
