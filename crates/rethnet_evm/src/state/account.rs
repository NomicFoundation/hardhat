use rethnet_eth::state::Storage;
use revm::primitives::AccountInfo;

#[derive(Clone, Debug, Default)]
pub struct RethnetAccount {
    pub info: AccountInfo,
    pub storage: Storage,
}

impl From<AccountInfo> for RethnetAccount {
    fn from(info: AccountInfo) -> Self {
        Self {
            info,
            storage: Default::default(),
        }
    }
}
