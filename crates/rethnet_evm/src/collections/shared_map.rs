use std::hash::Hash;

use revm::primitives::HashMap;

#[derive(Clone, Debug)]
pub struct SharedMapEntry<T, const DELETE_UNUSED_ENTRY: bool> {
    value: T,
    occurences: usize,
}

impl<T, const DELETE_UNUSED_ENTRY: bool> SharedMapEntry<T, DELETE_UNUSED_ENTRY> {
    /// Creates a new [`SharedMapEntry`] for the provided value.
    pub fn new(value: T) -> Self {
        Self {
            value,
            occurences: 1,
        }
    }

    /// Creates a new [`SharedMapEntry`] for the provided value and with the number of specified occurences.
    pub(crate) fn with_occurences(value: T, occurences: usize) -> Self {
        Self { value, occurences }
    }

    /// Retrieves the number of occurences that exist of the entry.
    pub fn occurences(&self) -> usize {
        self.occurences
    }

    /// Retrieves the value of the entry.
    pub fn value(&self) -> &T {
        &self.value
    }

    /// Increments the number of occurences.
    pub fn increment(&mut self) {
        self.occurences += 1;
    }

    /// Decrements the number of occurences. If no occurences are left, the [`SharedMapEntry`]
    /// is consumed.
    pub fn decrement(mut self) -> Option<Self> {
        self.occurences -= 1;

        if !DELETE_UNUSED_ENTRY || self.occurences > 0 {
            Some(self)
        } else {
            None
        }
    }
}

#[derive(Clone, Debug)]
pub struct SharedMap<K, V, const DELETE_UNUSED_ENTRY: bool> {
    entries: HashMap<K, SharedMapEntry<V, DELETE_UNUSED_ENTRY>>,
}

impl<K, V, const DELETE_UNUSED_ENTRY: bool> SharedMap<K, V, DELETE_UNUSED_ENTRY>
where
    K: Eq + Hash,
{
    /// Inserts new value or, if it already exists, increments the number of occurences of
    /// the corresponding entry.
    pub fn insert(&mut self, key: K, value: V) {
        self.entries
            .entry(key)
            .and_modify(SharedMapEntry::increment)
            .or_insert_with(|| SharedMapEntry::new(value));
    }

    /// Inserts new value or, if it already exists, increments the number of occurences of
    /// the corresponding entry.
    pub fn insert_with<F>(&mut self, key: K, constructor: F)
    where
        F: FnOnce() -> V,
    {
        self.entries
            .entry(key)
            .and_modify(SharedMapEntry::increment)
            .or_insert_with(|| SharedMapEntry::new(constructor()));
    }
}

impl<K, V, const DELETE_UNUSED_ENTRY: bool> SharedMap<K, V, DELETE_UNUSED_ENTRY>
where
    K: Clone + Eq + Hash,
{
    /// Decremenents the number of occurences of the value corresponding to the provided key,
    /// if it exists, and removes unused entry.
    pub fn remove(&mut self, key: &K) {
        self.entries
            .entry(key.clone())
            .and_replace_entry_with(|_key, entry| entry.decrement());
    }
}

impl<K, V, const DELETE_UNUSED_ENTRY: bool> SharedMap<K, V, DELETE_UNUSED_ENTRY> {
    /// Returns an iterator over its entries.
    pub fn iter(&self) -> impl Iterator<Item = (&K, &SharedMapEntry<V, DELETE_UNUSED_ENTRY>)> {
        self.entries.iter()
    }

    /// Returns a mutable reference to the underlaying collection.
    pub(crate) fn as_inner_mut(
        &mut self,
    ) -> &mut HashMap<K, SharedMapEntry<V, DELETE_UNUSED_ENTRY>> {
        &mut self.entries
    }
}

impl<K, V> SharedMap<K, V, true>
where
    K: Eq + Hash,
{
    /// Retrieves the entry corresponding to the provided key.
    pub fn get(&self, key: &K) -> Option<&V> {
        self.entries.get(key).map(|entry| &entry.value)
    }
}

impl<K, V> SharedMap<K, V, false>
where
    K: Eq + Hash,
{
    /// Retrieves the entry corresponding to the provided key.
    pub fn get(&self, key: &K) -> Option<&V> {
        self.entries.get(key).and_then(|entry| {
            if entry.occurences > 0 {
                Some(&entry.value)
            } else {
                None
            }
        })
    }
}

impl<K, V, const DELETE_UNUSED_ENTRY: bool> Default for SharedMap<K, V, DELETE_UNUSED_ENTRY> {
    fn default() -> Self {
        Self {
            entries: HashMap::default(),
        }
    }
}
