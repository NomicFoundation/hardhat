mod account;
mod persistent_memory_db;
mod state_trie;
mod storage_trie;
mod trie_query;

use edr_eth::{account::KECCAK_EMPTY, Address, B256, U256};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode, HashMap},
    DatabaseCommit,
};

pub use self::account::AccountTrie;
use super::{StateDebug, StateError};
use crate::collections::SharedMap;

/// An implementation of revm's state that uses a trie.
#[derive(Clone, Debug)]
pub struct TrieState {
    accounts: AccountTrie,
    contracts: SharedMap<B256, Bytecode>,
}

impl TrieState {
    /// Constructs a [`TrieState`] from the provided [`AccountTrie`].
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn with_accounts(accounts: AccountTrie) -> Self {
        Self {
            accounts,
            ..TrieState::default()
        }
    }

    /// Inserts the provided bytecode using its hash, potentially overwriting an
    /// existing value.
    pub fn insert_code(&mut self, code_hash: B256, code: Bytecode) {
        debug_assert_eq!(code_hash, code.hash_slow());

        self.contracts.insert(code_hash, code);
    }

    /// Removes the code corresponding to the provided hash, if it exists.
    pub fn remove_code(&mut self, code_hash: &B256) {
        if *code_hash != KECCAK_EMPTY {
            self.contracts.remove(code_hash);
        }
    }

    pub(super) fn modify_account_impl(
        &mut self,
        address: Address,
        modifier: super::AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, StateError>,
        external_code_by_hash_fn: &dyn Fn(B256) -> Result<Bytecode, StateError>,
    ) -> Result<AccountInfo, StateError> {
        let mut account_info = match self.accounts.account(&address) {
            Some(account) => AccountInfo::from(account),
            None => default_account_fn()?,
        };

        // Fill the bytecode
        if account_info.code_hash != KECCAK_EMPTY {
            let code = match self.code_by_hash(account_info.code_hash) {
                Ok(code) => code,
                Err(StateError::InvalidCodeHash(code_hash)) => external_code_by_hash_fn(code_hash)?,
                Err(err) => return Err(err),
            };

            account_info.code = Some(code);
        }

        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        let new_code = account_info.code.clone();
        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, Bytecode::hash_slow);
        account_info.code_hash = new_code_hash;

        let code_changed = new_code_hash != old_code_hash;
        if code_changed {
            if let Some(new_code) = new_code {
                self.insert_code(new_code_hash, new_code);
            }

            self.remove_code(&old_code_hash);
        }

        self.accounts.set_account(&address, &account_info);

        Ok(account_info)
    }

    pub(super) fn set_account_storage_slot_impl(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, StateError>,
    ) -> Result<U256, StateError> {
        let old_value =
            self.accounts
                .set_account_storage_slot(&address, &index, &value, default_account_fn)?;

        // If there is no old value, return zero to signal that the slot was empty
        Ok(old_value.unwrap_or(U256::ZERO))
    }
}

impl Default for TrieState {
    fn default() -> Self {
        let mut contracts = SharedMap::default();
        contracts.insert(KECCAK_EMPTY, Bytecode::new());

        Self {
            accounts: AccountTrie::default(),
            contracts,
        }
    }
}

impl StateRef for TrieState {
    type Error = StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(self.accounts.account(&address).map(AccountInfo::from))
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.contracts
            .get(&code_hash)
            .cloned()
            .ok_or(StateError::InvalidCodeHash(code_hash))
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        Ok(self
            .accounts
            .account_storage_slot(&address, &index)
            .unwrap_or(U256::ZERO))
    }
}

impl DatabaseCommit for TrieState {
    fn commit(&mut self, mut changes: HashMap<Address, Account>) {
        changes.iter_mut().for_each(|(address, account)| {
            if account.is_selfdestructed() {
                self.remove_code(&account.info.code_hash);
            } else if account.is_empty() && !account.is_created() {
                // Don't do anything. Account was merely touched
            } else {
                let old_code_hash = self
                    .accounts
                    .account(address)
                    .map_or(KECCAK_EMPTY, |old_account| old_account.code_hash);

                let code_changed = old_code_hash != account.info.code_hash;
                if code_changed {
                    if let Some(new_code) = account.info.code.take() {
                        self.insert_code(account.info.code_hash, new_code);
                    }

                    self.remove_code(&old_code_hash);
                }
            }
        });

        self.accounts.commit(&changes);
    }
}

impl StateDebug for TrieState {
    type Error = StateError;

    fn account_storage_root(&self, address: &Address) -> Result<Option<B256>, Self::Error> {
        Ok(self.accounts.storage_root(address))
    }

    fn insert_account(
        &mut self,
        address: Address,
        mut account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        if let Some(code) = account_info.code.take() {
            self.insert_code(account_info.code_hash, code);
        }

        self.accounts.set_account(&address, &account_info);

        Ok(())
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: super::AccountModifierFn,
    ) -> Result<AccountInfo, Self::Error> {
        self.modify_account_impl(
            address,
            modifier,
            &|| {
                Ok(AccountInfo {
                    code: None,
                    ..AccountInfo::default()
                })
            },
            &|code_hash| Err(StateError::InvalidCodeHash(code_hash)),
        )
    }

    fn remove_account(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(self.accounts.remove_account(&address).map(|account| {
            self.remove_code(&account.code_hash);

            AccountInfo {
                balance: account.balance,
                nonce: account.nonce,
                code_hash: account.code_hash,
                code: None,
            }
        }))
    }

    fn serialize(&self) -> String {
        self.accounts.serialize()
    }

    fn set_account_storage_slot(
        &mut self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<U256, Self::Error> {
        self.set_account_storage_slot_impl(address, index, value, &|| {
            Ok(AccountInfo {
                code: None,
                ..AccountInfo::default()
            })
        })
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        Ok(self.accounts.state_root())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{state::AccountModifierFn, Bytes};

    #[test]
    fn test_trie_state_clone() -> anyhow::Result<()> {
        let mut state1 = TrieState::default();

        let code_1 = Bytecode::new_raw(Bytes::from_static(&[0x01]));
        let code_1_hash = code_1.hash_slow();
        let code_2 = Bytecode::new_raw(Bytes::from_static(&[0x02]));
        let code_2_hash = code_2.hash_slow();

        let address1 = Address::random();
        let mut account1 = AccountInfo::default();
        account1.code_hash = code_1_hash;
        account1.code = Some(code_1);
        state1.insert_account(address1, account1)?;
        state1.set_account_storage_slot(address1, U256::from(100), U256::from(100))?;

        let address2 = Address::random();
        let mut account2 = AccountInfo::default();
        account2.code_hash = code_2_hash;
        account2.code = Some(code_2);
        let mut state2 = state1.clone();
        state2.insert_account(address2, account2)?;
        state2.set_account_storage_slot(address2, U256::from(200), U256::from(200))?;

        state2.set_account_storage_slot(address1, U256::from(100), U256::from(102))?;

        assert!(state1.basic(address1)?.is_some());
        assert!(state2.basic(address1)?.is_some());
        assert!(state1.basic(address2)?.is_none());
        assert!(state2.basic(address1)?.is_some());

        assert!(state1.code_by_hash(code_1_hash).is_ok());
        assert!(state2.code_by_hash(code_1_hash).is_ok());
        assert!(state2.code_by_hash(code_2_hash).is_ok());

        assert_eq!(state1.storage(address1, U256::from(100))?, U256::from(100));
        assert_eq!(state2.storage(address1, U256::from(100))?, U256::from(102));
        assert_eq!(state2.storage(address2, U256::from(200))?, U256::from(200));

        state2.modify_account(
            address1,
            AccountModifierFn::new(Box::new(|_balance, nonce, _code| {
                *nonce = 200;
            })),
        )?;

        assert_eq!(state1.basic(address1)?.unwrap().nonce, 0);
        assert_eq!(state2.basic(address1)?.unwrap().nonce, 200);

        Ok(())
    }
}
