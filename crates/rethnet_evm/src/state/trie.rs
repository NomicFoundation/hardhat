mod account;

use crate::collections::SharedMap;

pub use self::account::AccountTrie;

use hashbrown::HashMap;
use rethnet_eth::{
    account::{BasicAccount, KECCAK_EMPTY},
    trie::KECCAK_NULL_RLP,
    Address, B160, B256, U256,
};
use revm::{
    db::StateRef,
    primitives::{Account, AccountInfo, Bytecode},
    DatabaseCommit,
};

use super::{layered::LayeredChanges, RethnetLayer, StateDebug, StateError};

/// An implementation of revm's state that uses a trie.
#[derive(Clone, Debug)]
pub struct TrieState {
    accounts: AccountTrie,
    contracts: SharedMap<B256, Bytecode, true>,
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

    /// Inserts the provided bytecode using its hash, potentially overwriting an existing value.
    pub fn insert_code(&mut self, code: Bytecode) {
        self.contracts.insert(code.hash(), code);
    }

    /// Removes the code corresponding to the provided hash, if it exists.
    pub fn remove_code(&mut self, code_hash: &B256) {
        if *code_hash != KECCAK_EMPTY {
            self.contracts.remove(code_hash);
        }
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

    fn storage(&self, address: B160, index: U256) -> Result<U256, Self::Error> {
        Ok(self
            .accounts
            .account_storage_slot(&address, &index)
            .unwrap_or(U256::ZERO))
    }
}

impl DatabaseCommit for TrieState {
    fn commit(&mut self, mut changes: HashMap<B160, Account>) {
        changes.iter_mut().for_each(|(address, account)| {
            if account.is_selfdestructed() {
                self.remove_code(&account.info.code_hash);
            } else if account.is_empty() {
                // Don't do anything. Account was merely touched
            } else {
                let old_code_hash = self
                    .accounts
                    .account(address)
                    .map_or(KECCAK_EMPTY, |old_account| old_account.code_hash);

                let code_changed = old_code_hash != account.info.code_hash;
                if code_changed {
                    if let Some(new_code) = account.info.code.take() {
                        self.insert_code(new_code);
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
            account_info.code_hash = code.hash;

            self.insert_code(code);
        }

        self.accounts.set_account(&address, &account_info);

        Ok(())
    }

    fn modify_account(
        &mut self,
        address: Address,
        modifier: super::AccountModifierFn,
        default_account_fn: &dyn Fn() -> Result<AccountInfo, Self::Error>,
    ) -> Result<(), Self::Error> {
        let mut account_info = match self.accounts.account(&address) {
            Some(account) => {
                let mut account_info = AccountInfo::from(account);

                // Fill the bytecode
                if account_info.code_hash != KECCAK_EMPTY {
                    account_info.code = Some(
                        self.code_by_hash(account_info.code_hash)
                            .expect("Code must exist"),
                    );
                }

                account_info
            }
            None => default_account_fn()?,
        };

        let old_code_hash = account_info.code_hash;

        modifier(
            &mut account_info.balance,
            &mut account_info.nonce,
            &mut account_info.code,
        );

        // Strip the bytecode
        let new_code = account_info.code.take();

        let new_code_hash = new_code.as_ref().map_or(KECCAK_EMPTY, |code| code.hash());
        account_info.code_hash = new_code_hash;

        let code_changed = new_code_hash != old_code_hash;
        if code_changed {
            if let Some(new_code) = new_code {
                self.insert_code(new_code);
            }

            self.remove_code(&old_code_hash);
        }

        self.accounts.set_account(&address, &account_info);

        Ok(())
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
    ) -> Result<(), Self::Error> {
        self.accounts
            .set_account_storage_slot(&address, &index, &value);

        Ok(())
    }

    fn state_root(&self) -> Result<B256, Self::Error> {
        Ok(self.accounts.state_root())
    }
}

impl From<&LayeredChanges<RethnetLayer>> for TrieState {
    fn from(changes: &LayeredChanges<RethnetLayer>) -> Self {
        let accounts = AccountTrie::from_changes(changes.rev().map(|layer| {
            layer.accounts().map(|(address, account)| {
                (
                    address,
                    account.as_ref().map(|account| {
                        (
                            BasicAccount::from((&account.info, KECCAK_NULL_RLP)),
                            &account.storage,
                        )
                    }),
                )
            })
        }));

        let contracts = SharedMap::from(changes);

        Self {
            accounts,
            contracts,
        }
    }
}
