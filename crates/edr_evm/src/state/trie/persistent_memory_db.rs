use parking_lot::RwLock;
use rpds::HashTrieMapSync;

/// An in-memory database for a Merkle-Patricia trie based on a persistent data
/// structure that allows efficient checkpointing.
/// Based on the `cita-trie` crate's `MemoryDB`.
#[derive(Debug, Default)]
pub(super) struct PersistentMemoryDB {
    storage: RwLock<HashTrieMapSync<Vec<u8>, Vec<u8>>>,
}

impl Clone for PersistentMemoryDB {
    fn clone(&self) -> Self {
        Self {
            storage: RwLock::new(self.storage.read().clone()),
        }
    }
}

impl cita_trie::DB for PersistentMemoryDB {
    type Error = std::convert::Infallible;

    fn get(&self, key: &[u8]) -> Result<Option<Vec<u8>>, Self::Error> {
        Ok(self.storage.read().get(key).cloned())
    }

    fn contains(&self, key: &[u8]) -> Result<bool, Self::Error> {
        Ok(self.storage.read().contains_key(key))
    }

    fn insert(&self, key: Vec<u8>, value: Vec<u8>) -> Result<(), Self::Error> {
        self.storage.write().insert_mut(key, value);
        Ok(())
    }

    fn remove(&self, key: &[u8]) -> Result<(), Self::Error> {
        self.storage.write().remove_mut(key);
        Ok(())
    }

    fn flush(&self) -> Result<(), Self::Error> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use cita_trie::DB;

    use super::*;

    // From https://github.com/Wodann/cita-trie/commit/60efef58be0b76c528b6d7fa45a8eccdfd8f615c
    #[test]
    fn test_persistent_memory_db_clone() {
        const KEY: &[u8] = b"test-key";
        const VALUE: &[u8] = b"test-value";

        let memdb1 = PersistentMemoryDB::default();
        memdb1.insert(KEY.to_vec(), VALUE.to_vec()).unwrap();

        let memdb2 = memdb1.clone();

        let v1 = memdb1.get(KEY).unwrap().unwrap();
        let v2 = memdb2.get(KEY).unwrap().unwrap();

        assert_eq!(v1, v2);

        memdb2.remove(KEY).unwrap();

        assert_eq!(memdb1.get(KEY).unwrap().unwrap(), VALUE);
        assert!(memdb2.get(KEY).unwrap().is_none());
    }
}
