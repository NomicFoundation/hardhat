use std::sync::Arc;

use alloy_rlp::Decodable;
use edr_eth::account::BasicAccount;

use crate::{
    state::trie::{persistent_memory_db::PersistentMemoryDB, trie_query::TrieQuery},
    AccountInfo, Address, B256,
};

#[derive(Debug)]
pub(super) struct StateTrie {
    db: Arc<PersistentMemoryDB>,
    root: B256,
}

impl<'a> StateTrie {
    pub fn account(&self, address: &Address) -> Option<BasicAccount> {
        self.trie_query().get(address).map(|encoded_account| {
            BasicAccount::decode(&mut encoded_account.as_slice()).expect("Valid RLP")
        })
    }

    /// Create a helper struct that allows setting and removing multiple
    /// accounts and then updates the state root when dropped.
    pub fn mutate(&'a mut self) -> StateTrieMutation<'a> {
        let trie_query = self.trie_query();
        StateTrieMutation {
            state_trie: self,
            trie_query,
        }
    }

    pub fn root(&self) -> B256 {
        self.root
    }

    pub fn trie_query(&self) -> TrieQuery {
        TrieQuery::new(Arc::clone(&self.db), &self.root)
    }
}

impl Clone for StateTrie {
    fn clone(&self) -> Self {
        Self {
            db: Arc::new((*self.db).clone()),
            root: self.root,
        }
    }
}

impl Default for StateTrie {
    fn default() -> Self {
        let db = Arc::new(PersistentMemoryDB::default());
        let mut trie = TrieQuery::empty(Arc::clone(&db));
        let root = trie.root();

        // TODO root should be cacheable
        Self { db, root }
    }
}

/// A helper struct lets us update multiple accounts and
/// updates the state root when dropped.
pub(super) struct StateTrieMutation<'a> {
    state_trie: &'a mut StateTrie,
    trie_query: TrieQuery,
}

impl<'a> StateTrieMutation<'a> {
    pub fn account(&self, address: &Address) -> Option<BasicAccount> {
        self.state_trie.account(address)
    }

    pub fn remove_account(&mut self, address: &Address) {
        self.trie_query.remove(address);
    }

    pub fn insert_account_info_with_storage_root(
        &mut self,
        address: &Address,
        account_info: &AccountInfo,
        storage_root: B256,
    ) {
        let account = BasicAccount::from((account_info, storage_root));
        self.insert_basic_account(address, account);
    }

    pub fn insert_basic_account(&mut self, address: &Address, account: BasicAccount) {
        self.trie_query.insert(address, account);
    }
}

impl<'a> Drop for StateTrieMutation<'a> {
    fn drop(&mut self) {
        self.state_trie.root = self.trie_query.root();
    }
}
