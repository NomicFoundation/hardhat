use hashbrown::HashMap;
use rethnet_eth::{account::KECCAK_EMPTY, B256};
use revm::primitives::Bytecode;

use super::{layered::LayeredChanges, RethnetLayer};

#[derive(Clone, Debug)]
struct ContractEntry<const DELETE_UNUSED_CODE: bool> {
    code: Bytecode,
    occurences: usize,
}

impl<const DELETE_UNUSED_CODE: bool> ContractEntry<DELETE_UNUSED_CODE> {
    pub fn new(code: Bytecode) -> Self {
        Self {
            code,
            occurences: 1,
        }
    }

    /// Increments the number of occurences.
    pub fn increment(&mut self) {
        self.occurences += 1;
    }

    /// Decrements the number of occurences. If no occurences are left, the [`ContractEntry`]
    /// is consumed.
    pub fn decrement(mut self) -> Option<Self> {
        self.occurences -= 1;

        if !DELETE_UNUSED_CODE || self.occurences > 0 {
            Some(self)
        } else {
            None
        }
    }
}

#[derive(Clone, Debug)]
pub struct ContractStorage<const DELETE_UNUSED_CODE: bool> {
    contracts: HashMap<B256, ContractEntry<DELETE_UNUSED_CODE>>,
}

impl<const DELETE_UNUSED_CODE: bool> ContractStorage<DELETE_UNUSED_CODE> {
    /// Inserts new code or, if it already exists, increments the number of occurences of
    /// the code.
    pub fn insert_code(&mut self, code: Bytecode) {
        self.contracts
            .entry(code.hash())
            .and_modify(|entry| entry.increment())
            .or_insert_with(|| ContractEntry::new(code));
    }

    /// Decremenents the number of occurences of the code corresponding to the provided code hash,
    /// if it exists, and removes unused code.
    pub fn remove_code(&mut self, code_hash: &B256) {
        self.contracts
            .entry(*code_hash)
            .and_replace_entry_with(|_code, entry| entry.decrement());
    }
}

impl ContractStorage<true> {
    /// Retrieves the contract code corresponding to the provided hash.
    pub fn get(&self, code_hash: &B256) -> Option<&Bytecode> {
        self.contracts.get(code_hash).map(|entry| &entry.code)
    }
}

impl ContractStorage<false> {
    /// Retrieves the contract code corresponding to the provided hash.
    pub fn get(&self, code_hash: &B256) -> Option<&Bytecode> {
        self.contracts.get(code_hash).and_then(|entry| {
            if entry.occurences > 0 {
                Some(&entry.code)
            } else {
                None
            }
        })
    }
}

impl<const DELETE_UNUSED_CODE: bool> Default for ContractStorage<DELETE_UNUSED_CODE> {
    fn default() -> Self {
        let mut contracts = HashMap::new();
        contracts.insert(KECCAK_EMPTY, ContractEntry::new(Bytecode::new()));

        Self { contracts }
    }
}

impl From<&LayeredChanges<RethnetLayer>> for ContractStorage<true> {
    fn from(changes: &LayeredChanges<RethnetLayer>) -> Self {
        let mut storage = Self::default();

        changes.iter().for_each(|layer| {
            layer
                .contracts()
                .contracts
                .iter()
                .for_each(|(code_hash, entry)| {
                    if entry.occurences > 0 {
                        storage.contracts.insert(
                            *code_hash,
                            ContractEntry {
                                code: entry.code.clone(),
                                occurences: entry.occurences,
                            },
                        );
                    } else {
                        storage.contracts.remove(code_hash);
                    }
                })
        });

        storage
    }
}
