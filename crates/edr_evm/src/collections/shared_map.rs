use std::hash::Hash;

use revm::primitives::HashMap;

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

    /// Decrements the number of occurences. If no occurences are left, the
    /// [`SharedMapEntry`] is consumed.
    pub fn decrement(mut self) -> Option<Self> {
        self.occurences -= 1;

        if self.occurences > 0 {
            Some(self)
        } else {
            None
        }
    }
}

#[derive(Debug, Default)]
pub struct SharedMap<K, V> {
    entries: HashMap<K, SharedMapEntry<V>>,
}

impl<K, V> SharedMap<K, V>
where
    K: Eq + Hash,
{
    /// Inserts new value or, if it already exists, increments the number of
    /// occurences of the corresponding entry.
    pub fn insert(&mut self, key: K, value: V) {
        self.entries
            .entry(key)
            .and_modify(SharedMapEntry::increment)
            .or_insert_with(|| SharedMapEntry::new(value));
    }
}

impl<K, V> SharedMap<K, V>
where
    K: Clone + Eq + Hash,
{
    /// Decremenents the number of occurences of the value corresponding to the
    /// provided key, if it exists, and removes unused entry.
    pub fn remove(&mut self, key: &K) {
        self.entries
            .entry(key.clone())
            .and_replace_entry_with(|_key, entry| entry.decrement());
    }
}

impl<K, V> SharedMap<K, V>
where
    K: Eq + Hash,
{
    /// Retrieves the entry corresponding to the provided key.
    pub fn get(&self, key: &K) -> Option<&V> {
        self.entries.get(key).map(|entry| &entry.value)
    }
}

impl<K, V> Clone for SharedMap<K, V>
where
    K: Clone,
    V: Clone,
{
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn clone(&self) -> Self {
        Self {
            entries: self.entries.clone(),
        }
    }
}
