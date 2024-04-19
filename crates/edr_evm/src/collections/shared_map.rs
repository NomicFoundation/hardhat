use std::hash::Hash;

use rpds::HashTrieMapSync;

#[derive(Clone, Debug)]
pub struct SharedMapEntry<T> {
    value: T,
    occurences: usize,
}

impl<T> SharedMapEntry<T> {
    /// Creates a new [`SharedMapEntry`] for the provided value.
    pub fn new(value: T) -> Self {
        Self {
            value,
            occurences: 1,
        }
    }

    /// Increments the number of occurences.
    pub fn increment(&mut self) {
        self.occurences += 1;
    }

    /// Decrements the number of occurences.
    pub fn decrement(&mut self) {
        self.occurences -= 1;
    }

    /// Returns the number of occurences
    pub fn occurences(&self) -> usize {
        self.occurences
    }
}

#[derive(Debug, Default)]
pub struct SharedMap<K: Eq + Hash, V: Clone> {
    entries: HashTrieMapSync<K, SharedMapEntry<V>>,
}

impl<K, V> SharedMap<K, V>
where
    K: Eq + Hash + Clone,
    V: Clone,
{
    /// Inserts new value or, if it already exists, increments the number of
    /// occurences of the corresponding entry.
    pub fn insert(&mut self, key: K, value: V) {
        if let Some(entry) = self.entries.get_mut(&key) {
            entry.increment();
        } else {
            self.entries.insert_mut(key, SharedMapEntry::new(value));
        }
    }
}

impl<K, V> SharedMap<K, V>
where
    K: Clone + Eq + Hash,
    V: Clone,
{
    /// Decremenents the number of occurences of the value corresponding to the
    /// provided key, if it exists, and removes unused entry.
    pub fn remove(&mut self, key: &K) {
        if let Some(entry) = self.entries.get_mut(key) {
            entry.decrement();
            if entry.occurences() == 0 {
                self.entries.remove_mut(key);
            }
        }
    }
}

impl<K, V> SharedMap<K, V>
where
    K: Eq + Hash,
    V: Clone,
{
    /// Retrieves the entry corresponding to the provided key.
    pub fn get(&self, key: &K) -> Option<&V> {
        self.entries.get(key).map(|entry| &entry.value)
    }
}

impl<K, V> Clone for SharedMap<K, V>
where
    K: Clone + Eq + Hash,
    V: Clone,
{
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn clone(&self) -> Self {
        Self {
            entries: self.entries.clone(),
        }
    }
}
