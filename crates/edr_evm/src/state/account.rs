use edr_eth::state::Storage;
use revm::primitives::AccountInfo;

#[derive(Clone, Debug, Default)]
pub struct EdrAccount {
    pub info: AccountInfo,
    pub storage: Storage,
}

impl From<AccountInfo> for EdrAccount {
    fn from(info: AccountInfo) -> Self {
        Self {
            info,
            storage: Storage::default(),
        }
    }
}
