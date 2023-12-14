mod radix_tree;

use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    hash::{Hash, Hasher},
};

use radix_tree::RadixTree;
use revm::interpreter::opcode;
use revm_primitives::Bytes;

use self::radix_tree::RadixNode;
use crate::opcodes::get_opcode_length;

#[derive(Debug, PartialEq)]
pub enum BytecodeType {
    Runtime,
    Deployment,
}

#[derive(Debug, PartialEq)]
pub struct ImmutableReference {
    offset: usize,
    length: usize,
}

// bytecode and trace stubs
#[derive(Debug, PartialEq)]
pub struct Bytecode {
    normalized_code: Bytes,
    bytecode_type: BytecodeType,
    library_offsets: Vec<usize>,
    immutable_references: Vec<ImmutableReference>,
}

impl Bytecode {
    pub fn is_deployment(&self) -> bool {
        self.bytecode_type == BytecodeType::Deployment
    }
}

pub struct CreateMessageTrace {
    code: Bytes,
}

pub struct CallMessageTrace {
    code: Bytes,
}

pub enum EvmMessageTrace {
    Create(CreateMessageTrace),
    Call(CallMessageTrace),
}

impl EvmMessageTrace {
    fn code(&self) -> &Bytes {
        match self {
            EvmMessageTrace::Create(create_message_trace) => &create_message_trace.code,
            EvmMessageTrace::Call(call_message_trace) => &call_message_trace.code,
        }
    }
}

// TODO add cache
#[derive(Default)]
pub struct ContractsIdentifier<'a> {
    tree: RadixTree,
    bytecodes: HashMap<u64, &'a Bytecode>,
}

impl<'a> ContractsIdentifier<'a> {
    pub fn add_bytecode(&mut self, bytecode: &'a Bytecode) {
        self.tree.add_word(bytecode.normalized_code.clone());
        self.bytecodes
            .insert(calculate_hash(&bytecode.normalized_code), bytecode);
    }

    pub fn get_bytecode_from_message_trace(&self, trace: EvmMessageTrace) -> Option<&Bytecode> {
        let normalized_code = normalize_library_runtime_bytecode_if_necessary(trace.code().clone());

        self.search_bytecode_in_radix_tree(&trace, &normalized_code, true, None)
    }

    pub fn search_bytecode_in_radix_tree(
        &self,
        trace: &EvmMessageTrace,
        code: &Bytes,
        normalize_libraries: bool,
        radix_node: Option<&RadixNode>,
    ) -> Option<&Bytecode> {
        let radix_node = radix_node.unwrap_or(self.tree.root());

        let (found, matched_bytes, node) = radix_node.get_max_match(code);

        if found {
            let key = calculate_hash(&code);

            return self.bytecodes.get(&key).copied();
        }

        // The entire vector is present as a prefix, but not exactly
        if code.len() == matched_bytes {
            return None;
        }

        // Deployment messages have their abi-encoded arguments at the end of the
        // bytecode.
        //
        // We don't know how long those arguments are, as we don't know which contract
        // is being deployed, hence we don't know the signature of its
        // constructor.
        //
        // To make things even harder, we can't trust that the user actually passed the
        // right amount of arguments.
        //
        // Luckily, the chances of a complete deployment bytecode being the prefix of
        // another one are remote. For example, most of the time it ends with
        // its metadata hash, which will differ.
        //
        // We take advantage of this last observation, and just return the bytecode that
        // exactly matched the searchResult (sub)trie that we got.
        let entire_node_matched =
            matched_bytes == node.bytes_matched_before() + node.content().len();
        let not_entiry_bytecode_found = matched_bytes < code.len();
        if is_create_trace(trace)
            && entire_node_matched
            && not_entiry_bytecode_found
            && node.is_present()
        {
            // concatenate the normalized code and the node content
            let mut matched_bytecode = code.to_vec();
            matched_bytecode.drain(node.bytes_matched_before()..);
            matched_bytecode.extend(node.content());

            let key = calculate_hash(&matched_bytecode);
            let bytecode = self.bytecodes.get(&key).copied();

            if let Some(bytecode) = bytecode {
                if bytecode.is_deployment() {
                    return Some(bytecode);
                }
            }
        }

        if normalize_libraries {
            for suffix in node.descendant_suffixes() {
                let mut descendant = code.to_vec()[..node.bytes_matched_before()].to_vec();
                descendant.extend(suffix);

                let bytecode_with_libraries = self.bytecodes.get(&calculate_hash(&descendant));

                if bytecode_with_libraries.is_none() {
                    continue;
                }
                let bytecode_with_libraries = bytecode_with_libraries.unwrap();

                if bytecode_with_libraries.library_offsets.is_empty()
                    && bytecode_with_libraries.immutable_references.is_empty()
                {
                    continue;
                }

                let normalized_libraries_code =
                    zero_out_addresses(code, &bytecode_with_libraries.library_offsets);
                let normalized_code = zero_out_slices(
                    &normalized_libraries_code,
                    &bytecode_with_libraries.immutable_references,
                );

                let normalized_result =
                    self.search_bytecode_in_radix_tree(trace, &normalized_code, false, Some(node));

                if normalized_result.is_some() {
                    return normalized_result;
                }
            }
        }

        // If we got here we may still have the contract, but with a different metadata
        // hash.
        //
        // We check if we got to match the entire executable bytecode, and are just
        // stuck because of the metadata. If that's the case, we can assume that
        // any descendant will be a valid Bytecode, so we just choose the most
        // recently added one.
        //
        // The reason this works is that there's no chance that Solidity includes an
        // entire bytecode (i.e. with metadata), as a prefix of another one.

        if is_matching_metadata(code, matched_bytes) {
            let last_suffix = self.tree.root().descendant_suffixes().last();

            if let Some(last_suffix) = last_suffix {
                let mut descendant = code.to_vec()[..node.bytes_matched_before()].to_vec();
                descendant.extend(last_suffix);

                return self.bytecodes.get(&calculate_hash(&descendant)).copied();
            }
        }

        None
    }
}

fn zero_out_addresses(code: &Bytes, offsets: &[usize]) -> Bytes {
    let references = offsets
        .iter()
        .map(|offset| ImmutableReference {
            offset: *offset,
            length: 20,
        })
        .collect::<Vec<_>>();

    zero_out_slices(code, &references)
}

fn zero_out_slices(code: &Bytes, immutable_references: &[ImmutableReference]) -> Bytes {
    let mut result = code.to_vec();

    for reference in immutable_references {
        for byte in result
            .iter_mut()
            .skip(reference.offset)
            .take(reference.length)
        {
            *byte = 0;
        }
    }

    result.into()
}

fn is_create_trace(trace: &EvmMessageTrace) -> bool {
    match trace {
        EvmMessageTrace::Create(_) => true,
        EvmMessageTrace::Call(_) => false,
    }
}

fn normalize_library_runtime_bytecode_if_necessary(bytecode: Bytes) -> Bytes {
    // Libraries' protection normalization:
    // Solidity 0.4.20 introduced a protection to prevent libraries from being
    // called directly. This is done by modifying the code on deployment, and
    // hard-coding the contract address. The first instruction is a PUSH20 of
    // the address, which we zero-out as a way of normalizing it. Note that it's
    // also zeroed-out in the compiler output.

    if let Some(first_opcode) = bytecode.first() {
        if *first_opcode == opcode::PUSH20 {
            return zero_out_addresses(&bytecode, &[1]);
        }
    }

    bytecode
}

fn calculate_hash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}

fn is_matching_metadata(code: &[u8], last_byte: usize) -> bool {
    let mut byte = 0;
    while byte < last_byte {
        let opcode = code[byte];

        // Solidity always emits REVERT INVALID right before the metadata
        if opcode == opcode::REVERT && code[byte + 1] == opcode::INVALID {
            return true;
        }

        byte += get_opcode_length(opcode.into());
    }

    false
}

#[cfg(test)]
mod tests {
    use std::vec;

    use super::*;

    fn create_test_call_trace(code: Bytes) -> EvmMessageTrace {
        EvmMessageTrace::Call(CallMessageTrace { code })
    }

    fn create_test_create_trace(code: Bytes) -> EvmMessageTrace {
        EvmMessageTrace::Create(CreateMessageTrace { code })
    }

    fn create_test_bytecode(normalized_code: Bytes) -> Bytecode {
        Bytecode {
            normalized_code,
            bytecode_type: BytecodeType::Runtime,
            library_offsets: vec![],
            immutable_references: vec![],
        }
    }

    fn create_test_bytecode_with_libraries_and_immutable_references(
        normalized_code: Bytes,
        library_offsets: Vec<usize>,
        immutable_references: Vec<ImmutableReference>,
    ) -> Bytecode {
        Bytecode {
            normalized_code,
            bytecode_type: BytecodeType::Runtime,
            library_offsets,
            immutable_references,
        }
    }

    fn create_test_deployment_bytecode(normalized_code: Bytes) -> Bytecode {
        Bytecode {
            normalized_code,
            bytecode_type: BytecodeType::Deployment,
            library_offsets: vec![],
            immutable_references: vec![],
        }
    }

    #[test]
    fn test_contracts_identifier_empty() {
        let contracts_identifier = ContractsIdentifier::default();

        // should not find any bytecode for a call trace
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);

        // sould not find any bytecode for a create trace
        let create_trace = create_test_create_trace(vec![1, 2, 3, 4, 5].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(create_trace);
        assert_eq!(contract, None);
    }

    #[test]
    fn test_contracts_identifier_single_matching_bytecode() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode(vec![1, 2, 3, 4, 5].into());
        contracts_identifier.add_bytecode(&bytecode);

        // should find a bytecode that matches exactly
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));

        // should not find a bytecode that doesn't match
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 6].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);
    }

    #[test]
    fn test_contracts_identifier_multiple_matches_same_prefix() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode1 = create_test_bytecode(vec![1, 2, 3, 4, 5].into());
        let bytecode2 = create_test_bytecode(vec![1, 2, 3, 4, 5, 6, 7, 8].into());
        contracts_identifier.add_bytecode(&bytecode1);
        contracts_identifier.add_bytecode(&bytecode2);

        // should find the exact match
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode1));

        // should find the exact match
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5, 6, 7, 8].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode2));

        // should not find a bytecode that doesn't match
        let call_trace = create_test_call_trace(vec![0, 1, 2, 3, 4, 5, 6, 7, 8].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);
    }

    #[test]
    fn test_contracts_identifier_trace_matches_common_prefix() {
        let mut contracts_identifier = ContractsIdentifier::default();

        // add two bytecodes that share a prefix
        let bytecode1 = create_test_bytecode(vec![1, 2, 3, 4, 5].into());
        let bytecode2 = create_test_bytecode(vec![1, 2, 3, 6, 7].into());
        contracts_identifier.add_bytecode(&bytecode1);
        contracts_identifier.add_bytecode(&bytecode2);

        // search a trace that matches the common prefix
        let call_trace = create_test_call_trace(vec![1, 2, 3].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);
    }

    #[test]
    fn test_contracts_identifier_trace_matches_deployment_bytecode_prefix() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_deployment_bytecode(vec![1, 2, 3, 4, 5].into());
        contracts_identifier.add_bytecode(&bytecode);

        // a create trace that matches the a deployment bytecode plus some extra stuff
        // (constructor args)
        let create_trace = create_test_create_trace(vec![1, 2, 3, 4, 5, 10, 11].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(create_trace);
        assert_eq!(contract, Some(&bytecode));

        // the same bytecode, but for a call trace, should not match
        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5, 10, 11].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);

        // the same scenario but with a runtime bytecode shouldn't result in matches
        let mut contracts_identifier = ContractsIdentifier::default();
        let bytecode = create_test_bytecode(vec![1, 2, 3, 4, 5].into());
        contracts_identifier.add_bytecode(&bytecode);

        let create_trace = create_test_create_trace(vec![1, 2, 3, 4, 5, 10, 11].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(create_trace);
        assert_eq!(contract, None);

        let call_trace = create_test_call_trace(vec![1, 2, 3, 4, 5, 10, 11].into());
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, None);
    }

    #[test]
    fn test_contracts_identifier_bytecode_with_one_library() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode_with_libraries_and_immutable_references(
            vec![
                // 0 -------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, library address
                // -------------------------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 40 ------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
            ]
            .into(),
            vec![20],
            vec![],
        );
        contracts_identifier.add_bytecode(&bytecode);

        // the same bytecode, but for a call trace, should not match
        let call_trace = create_test_call_trace(
            vec![
                // 0 -----------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, library address
                // -----------------------------------------------------------------
                101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
                118, 119, 120,
                // 40 ----------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
            ]
            .into(),
        );
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }

    #[test]
    fn test_contracts_identifier_bytecode_with_one_immutable_reference() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode_with_libraries_and_immutable_references(
            vec![
                // 0 -------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // --------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 30 ------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
            ]
            .into(),
            vec![],
            vec![ImmutableReference {
                offset: 20,
                length: 10,
            }],
        );
        contracts_identifier.add_bytecode(&bytecode);

        // the same bytecode, but for a call trace, should not match
        let call_trace = create_test_call_trace(
            vec![
                // 0 -----------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // ------------------------------------------------
                101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
                // 30 ----------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
            ]
            .into(),
        );
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }

    #[test]
    fn test_contracts_identifier_bytecode_with_one_library_and_one_immutable_reference() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode_with_libraries_and_immutable_references(
            vec![
                // 0 -------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // --------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 30 ------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
                // 35, library address
                // -------------------------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 55 ------------------------------------------------------------------------------
                26, 27, 28, 29, 30,
            ]
            .into(),
            vec![35],
            vec![ImmutableReference {
                offset: 20,
                length: 10,
            }],
        );
        contracts_identifier.add_bytecode(&bytecode);

        // the same bytecode, but for a call trace, should not match
        let call_trace = create_test_call_trace(
            vec![
                // 0 -----------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // ------------------------------------------------
                101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
                // 30 ----------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
                // 35, library address
                // -----------------------------------------------------------------
                201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217,
                218, 219, 220,
                // 55 ----------------------------------------------------------------------------------
                26, 27, 28, 29, 30,
            ]
            .into(),
        );
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }

    #[test]
    fn test_contracts_identifier_bytecode_with_multiple_libraries_and_immutable_references() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode_with_libraries_and_immutable_references(
            vec![
                // 0 -------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // --------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 30 ------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
                // 35, library address
                // -------------------------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 55 ------------------------------------------------------------------------------
                26, 27, 28, 29, 30,
                // 60, another library address
                // -----------------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // 80 ------------------------------------------------------------------------------
                31, 32, 33, 34, 35,
                // 85, immutable reference of length 30
                // --------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0,
                // 115 -----------------------------------------------------------------------------
                36, 37, 38, 39, 40,
            ]
            .into(),
            vec![35, 60],
            vec![
                ImmutableReference {
                    offset: 20,
                    length: 10,
                },
                ImmutableReference {
                    offset: 85,
                    length: 30,
                },
            ],
        );
        contracts_identifier.add_bytecode(&bytecode);

        // the same bytecode, but for a call trace, should not match
        let call_trace = create_test_call_trace(
            vec![
                // 0 -----------------------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                // 20, immutable reference of length 10
                // ------------------------------------------------
                101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
                // 30 ----------------------------------------------------------------------------------
                21, 22, 23, 24, 25,
                // 35, library address
                // -----------------------------------------------------------------
                201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217,
                218, 219, 220,
                // 55 ----------------------------------------------------------------------------------
                26, 27, 28, 29, 30,
                // 60, another library address
                // ---------------------------------------------------------
                221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237,
                238, 239, 240,
                // 80 ----------------------------------------------------------------------------------
                31, 32, 33, 34, 35,
                // 85, immutable reference of length 30
                // ------------------------------------------------
                111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
                128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
                // 115 ---------------------------------------------------------------------------------
                36, 37, 38, 39, 40,
            ]
            .into(),
        );
        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }

    #[test]
    fn test_contracts_identifier_bytecode_with_different_metadata() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode(
            vec![
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                // metadata ----------------------------------------------------------------------------
                0xfd, 0xfe, 11, 12, 13, 14, 15,
            ]
            .into(),
        );
        contracts_identifier.add_bytecode(&bytecode);

        let call_trace = create_test_call_trace(
            vec![
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                // metadata ----------------------------------------------------------------------------
                0xfd, 0xfe, 21, 22, 23,
            ]
            .into(),
        );

        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }

    #[test]
    fn test_contracts_identifier_normalized_library_runtime_code() {
        let mut contracts_identifier = ContractsIdentifier::default();

        let bytecode = create_test_bytecode(
            vec![
                // PUSH20
                0x73,
                // library address
                // ---------------------------------------------------------------------
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                // rest of the code
                // --------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
            ]
            .into(),
        );
        contracts_identifier.add_bytecode(&bytecode);

        let call_trace = create_test_call_trace(
            vec![
                // PUSH20
                0x73,
                // library address
                // ---------------------------------------------------------------------
                21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
                // rest of the code
                // --------------------------------------------------------------------
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
            ]
            .into(),
        );

        let contract = contracts_identifier.get_bytecode_from_message_trace(call_trace);
        assert_eq!(contract, Some(&bytecode));
    }
}
