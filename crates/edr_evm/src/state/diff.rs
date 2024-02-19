use edr_eth::{Address, U256};
use revm::primitives::{Account, AccountInfo, AccountStatus, HashMap, StorageSlot};

/// The difference between two states, which can be applied to a state to get
/// the new state using [`revm::db::DatabaseCommit::commit`].
#[derive(Clone, Debug, Default)]
pub struct StateDiff {
    inner: HashMap<Address, Account>,
}

impl StateDiff {
    /// Applies a single change to this instance, combining it with any existing
    /// change.
    pub fn apply_account_change(&mut self, address: Address, account_info: AccountInfo) {
        self.inner
            .entry(address)
            .and_modify(|account| {
                account.info = account_info.clone();
            })
            .or_insert(Account {
                info: account_info,
                storage: HashMap::new(),
                status: AccountStatus::Touched,
            });
    }

    /// Applies a single storage change to this instance, combining it with any
    /// existing change.
    ///
    /// If the account corresponding to the specified address hasn't been
    /// modified before, either the value provided in `account_info` will be
    /// used, or alternatively a default account will be created.
    pub fn apply_storage_change(
        &mut self,
        address: Address,
        index: U256,
        slot: StorageSlot,
        account_info: Option<AccountInfo>,
    ) {
        self.inner
            .entry(address)
            .and_modify(|account| {
                account.storage.insert(index, slot.clone());
            })
            .or_insert_with(|| {
                let storage: HashMap<_, _> = std::iter::once((index, slot.clone())).collect();

                Account {
                    info: account_info.unwrap_or_default(),
                    storage,
                    status: AccountStatus::Created | AccountStatus::Touched,
                }
            });
    }

    /// Applies a state diff to this instance, combining with any and all
    /// existing changes.
    pub fn apply_diff(&mut self, diff: HashMap<Address, Account>) {
        for (address, account_diff) in diff {
            self.inner
                .entry(address)
                .and_modify(|account| {
                    account.info = account_diff.info.clone();
                    account.status.insert(account_diff.status);
                    account.storage.extend(account_diff.storage.clone());
                })
                .or_insert(account_diff);
        }
    }

    /// Retrieves the inner hash map.
    pub fn as_inner(&self) -> &HashMap<Address, Account> {
        &self.inner
    }
}

impl From<HashMap<Address, Account>> for StateDiff {
    fn from(value: HashMap<Address, Account>) -> Self {
        Self { inner: value }
    }
}

impl From<StateDiff> for HashMap<Address, Account> {
    fn from(value: StateDiff) -> Self {
        value.inner
    }
}
