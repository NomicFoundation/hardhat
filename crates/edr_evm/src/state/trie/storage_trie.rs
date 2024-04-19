use std::{collections::BTreeMap, sync::Arc};

use alloy_rlp::Decodable;
use hasher::{Hasher, HasherKeccak};

use crate::{
    state::trie::{persistent_memory_db::PersistentMemoryDB, trie_query::TrieQuery},
    B256, U256,
};

#[derive(Debug)]
pub(super) struct StorageTrie {
    db: Arc<PersistentMemoryDB>,
    root: B256,
}

impl<'a> StorageTrie {
    pub fn mutate(&'a mut self) -> StorageTrieMutation<'a> {
        let trie_query = self.trie_query();
        StorageTrieMutation {
            storage_trie: self,
            trie_query,
        }
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn storage_slot(&self, index: &U256) -> Option<U256> {
        self.trie_query()
            .get(index.to_be_bytes::<32>())
            .map(decode_u256)
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    pub fn storage(&self) -> BTreeMap<B256, U256> {
        self.trie_query()
            .iter()
            .map(|(hashed_index, encoded_value)| {
                (B256::from_slice(&hashed_index), decode_u256(encoded_value))
            })
            .collect()
    }

    pub fn root(&self) -> B256 {
        self.root
    }

    fn trie_query(&'a self) -> TrieQuery {
        TrieQuery::new(Arc::clone(&self.db), &self.root)
    }
}

impl Clone for StorageTrie {
    fn clone(&self) -> Self {
        Self {
            db: Arc::new((*self.db).clone()),
            root: self.root,
        }
    }
}

impl Default for StorageTrie {
    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn default() -> Self {
        let db = Arc::new(PersistentMemoryDB::default());
        let mut trie = TrieQuery::empty(Arc::clone(&db));
        let root = trie.root();

        Self { db, root }
    }
}

pub(super) struct StorageTrieMutation<'a> {
    storage_trie: &'a mut StorageTrie,
    trie_query: TrieQuery,
}

impl<'a> StorageTrieMutation<'a> {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn set_storage_slots(&mut self, storage: &revm::primitives::Storage) {
        storage.iter().for_each(|(index, value)| {
            self.set_storage_slot(index, &value.present_value);
        });
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip(self)))]
    pub fn set_storage_slot(&mut self, index: &U256, value: &U256) -> Option<U256> {
        let hashed_index = HasherKeccak::new().digest(&index.to_be_bytes::<32>());

        let old_value = self
            .trie_query
            .get_hashed_key(&hashed_index)
            .map(decode_u256);

        if value.is_zero() {
            if old_value.is_some() {
                self.trie_query.remove_hashed_key(&hashed_index);
            }
        } else {
            self.trie_query.insert_hashed_key(hashed_index, value);
        }

        old_value
    }
}

impl<'a> Drop for StorageTrieMutation<'a> {
    fn drop(&mut self) {
        self.storage_trie.root = self.trie_query.root();
    }
}

fn decode_u256(encoded_value: Vec<u8>) -> U256 {
    U256::decode(&mut encoded_value.as_slice()).expect("Valid RLP")
}
