mod radix_tree;

use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    hash::{Hash, Hasher},
};

use radix_tree::RadixTree;

// bytecode and trace stubs
pub struct Bytecode {
    normalized_code: Vec<u8>,
}

pub struct CreateMessageTrace {
    code: Vec<u8>,
}

pub struct CallMessageTrace {
    code: Vec<u8>,
}

pub enum EvmMessageTrace {
    Create(CreateMessageTrace),
    Call(CallMessageTrace),
}

impl EvmMessageTrace {
    fn get_code(&self) -> &Vec<u8> {
        match self {
            EvmMessageTrace::Create(create_message_trace) => &create_message_trace.code,
            EvmMessageTrace::Call(call_message_trace) => &call_message_trace.code,
        }
    }
}

// TODO add cache
pub struct ContractsIdentifier<'a> {
    tree: RadixTree,
    bytecodes: HashMap<u64, &'a Bytecode>,
}

impl<'a> ContractsIdentifier<'a> {
    pub fn new() -> Self {
        Self {
            tree: RadixTree::new(),
            bytecodes: HashMap::new(),
        }
    }

    pub fn add_bytecode(&mut self, bytecode: &'a Bytecode) {
        // TODO reduce cloning
        self.tree.add_word(bytecode.normalized_code.clone());
        self.bytecodes
            .insert(calculate_hash(&bytecode.normalized_code), bytecode);
    }

    pub fn get_bytecode_from_message_trace(&mut self, trace: EvmMessageTrace) -> Option<&Bytecode> {
        let normalized_code =
            normalize_library_runtime_bytecode_if_necessary(trace.get_code().clone());

        self.search_bytecode_in_radix_tree(&trace, &normalized_code)
    }

    pub fn search_bytecode_in_radix_tree(
        &self,
        _trace: &EvmMessageTrace,
        normalized_code: &[u8],
    ) -> Option<&Bytecode> {
        let (found, matched_bytes, node) = self.tree.get_max_match(normalized_code);

        if found {
            let key = calculate_hash(node.content());

            return self.bytecodes.get(&key).copied();
        }

        // The entire vector is present as a prefix, but not exactly
        if normalized_code.len() == matched_bytes {
            return None;
        }

        // TODO: handle create traces and constructor arguments

        // TODO: add normalize_libraries option

        // TODO: handle metadata hashes

        None
    }
}

impl<'a> Default for ContractsIdentifier<'a> {
    fn default() -> Self {
        Self::new()
    }
}

fn normalize_library_runtime_bytecode_if_necessary(bytecode: Vec<u8>) -> Vec<u8> {
    // TODO
    bytecode
}

fn calculate_hash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}
