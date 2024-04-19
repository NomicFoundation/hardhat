use std::sync::Arc;

use cita_trie::{PatriciaTrie, Trie};
use hasher::{Hasher, HasherKeccak};

use crate::{state::trie::persistent_memory_db::PersistentMemoryDB, B256};

/// A light wrapper over the DB of the Merkle-Patricia trie that allows us to
/// read, add and remove elements.
#[repr(transparent)]
pub(super) struct TrieQuery(PatriciaTrie<PersistentMemoryDB, HasherKeccak>);

const DB_IS_INFALLIBLE: &str = "DB is infallible";

impl TrieQuery {
    /// Create a new trie query from the provided state root. Panics if the
    /// state root is invalid.
    pub fn new(db: Arc<PersistentMemoryDB>, root: &B256) -> Self {
        let trie = PatriciaTrie::from(db, Arc::new(HasherKeccak::new()), root.as_slice())
            .expect("Valid state root");
        Self(trie)
    }

    /// Create an empty trie query.
    pub fn empty(db: Arc<PersistentMemoryDB>) -> Self {
        let trie = PatriciaTrie::new(db, Arc::new(HasherKeccak::new()));
        Self(trie)
    }

    /// Get the value at the specified (unhashed) key.
    pub fn get(&self, key: impl AsRef<[u8]>) -> Option<Vec<u8>> {
        self.0.get(&hash_key(key)).expect(DB_IS_INFALLIBLE)
    }

    /// Get the value at the specified hashed key.
    pub fn get_hashed_key(&self, key: &[u8]) -> Option<Vec<u8>> {
        self.0.get(key).expect(DB_IS_INFALLIBLE)
    }

    /// Insert a value at the specified (unhashed) key or modify it if it
    /// exists. The value will be RLP-encoded.
    pub fn insert(&mut self, key: impl AsRef<[u8]>, value: impl alloy_rlp::Encodable) {
        self.0
            .insert(hash_key(key), alloy_rlp::encode(value))
            .expect(DB_IS_INFALLIBLE);
    }

    /// Insert a value at the specified hashed key or modify it if it exists.
    /// The value will be RLP-encoded.
    pub fn insert_hashed_key(&mut self, key: Vec<u8>, value: impl alloy_rlp::Encodable) {
        self.0
            .insert(key, alloy_rlp::encode(value))
            .expect(DB_IS_INFALLIBLE);
    }

    /// Iterate over hashed key and RLP-encoded value pairs.
    pub fn iter(&self) -> impl Iterator<Item = (Vec<u8>, Vec<u8>)> + '_ {
        self.0.iter()
    }

    /// Remove the value at the specified (unhashed) key.
    pub fn remove(&mut self, key: impl AsRef<[u8]>) -> bool {
        self.remove_hashed_key(&hash_key(key))
    }

    /// Remove the value at the specified hashed key.
    pub fn remove_hashed_key(&mut self, key: &[u8]) -> bool {
        self.0.remove(key).expect(DB_IS_INFALLIBLE)
    }

    /// Get the state root
    pub fn root(&mut self) -> B256 {
        let root = self.0.root().expect(DB_IS_INFALLIBLE);
        B256::from_slice(&root)
    }
}

fn hash_key(key: impl AsRef<[u8]>) -> Vec<u8> {
    HasherKeccak::new().digest(key.as_ref())
}
