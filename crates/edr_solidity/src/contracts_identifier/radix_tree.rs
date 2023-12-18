use std::collections::BTreeMap;

use edr_eth::Bytes;

#[derive(Debug)]
pub struct RadixNode {
    content: Bytes,
    is_present: bool,
    bytes_matched_before: usize,
    child_nodes: BTreeMap<u8, RadixNode>,
}

impl RadixNode {
    fn new(content: Bytes, is_present: bool, bytes_matched_before: usize) -> RadixNode {
        RadixNode {
            content,
            is_present,
            bytes_matched_before,
            child_nodes: BTreeMap::new(),
        }
    }

    pub fn content(&self) -> &[u8] {
        &self.content
    }

    pub fn is_present(&self) -> bool {
        self.is_present
    }

    pub fn bytes_matched_before(&self) -> usize {
        self.bytes_matched_before
    }

    fn add_word(&mut self, word: Bytes) {
        if word.is_empty() {
            return;
        }

        let b = word[0];

        // we temporarily remove the next node and then insert it back, possibly mutated
        // and/or in a different position
        let next_node = self.child_nodes.remove(&b);

        if let Some(mut next_node) = next_node {
            let prefix_length = get_shared_prefix_length(&word, &next_node.content);

            // We know it's at least 1
            debug_assert!(prefix_length > 0);

            // Check if the next node's label is included in the word
            if prefix_length == next_node.content.len() {
                // Check if the next node matches the word exactly
                if prefix_length == word.len() {
                    next_node.is_present = true;
                    self.child_nodes.insert(b, next_node);
                    return;
                }

                next_node.add_word(word.slice(prefix_length..));
                self.child_nodes.insert(b, next_node);

                return;
            }

            // If the content includes what's left of the word and some extra
            if prefix_length == word.len() {
                // nextNode includes the current word and some extra, so we insert a
                // new node with the word
                let mut node =
                    RadixNode::new(word, true, self.bytes_matched_before + self.content.len());

                // the new node points to next_node
                next_node.content = next_node.content.slice(prefix_length..);
                next_node.bytes_matched_before += node.content.len();
                node.child_nodes.insert(next_node.content[0], next_node);

                // the current node now points to the new node
                self.child_nodes.insert(b, node);

                return;
            }

            // The content includes some part of the word, but not all of it
            // insert a new in-between node between current node and it's child, that
            // will have children for the old child and a new node for the given word.
            let mut middle_node = RadixNode::new(
                word.slice(..prefix_length),
                false,
                self.bytes_matched_before + self.content.len(),
            );

            // next_node should come after middle_node and its content and
            // bytes_matched_before need to be adapted
            next_node.content = next_node.content.slice(prefix_length..);
            next_node.bytes_matched_before +=
                middle_node.bytes_matched_before + middle_node.content.len();
            middle_node
                .child_nodes
                .insert(next_node.content[0], next_node);

            // create a new node for the word
            let new_node = RadixNode::new(
                word.slice(prefix_length..),
                true,
                middle_node.bytes_matched_before + middle_node.content.len(),
            );
            middle_node
                .child_nodes
                .insert(word[prefix_length], new_node);

            // set the middle_node as current_node's child
            self.child_nodes.insert(b, middle_node);
        } else {
            let bytes_matched_before = self.bytes_matched_before + self.content.len();

            let node = RadixNode::new(word, true, bytes_matched_before);

            self.child_nodes.insert(b, node);
        }
    }

    /**
     * Returns a tuple containing:
     * - a boolean indicating if the word was matched exactly
     * - the number of bytes matched
     * - the node that matched the word
     * If the word is not matched exactly, the node will be the one that
     * matched the longest prefix.
     */
    pub fn get_max_match(&self, word: &[u8]) -> (bool, usize, &RadixNode) {
        let prefix_length = get_shared_prefix_length(word, &self.content);

        let matched = prefix_length + self.bytes_matched_before;

        let entire_word_matched = prefix_length == word.len();
        let entire_content_matched = prefix_length == self.content.len();

        if entire_word_matched {
            if entire_content_matched {
                return (self.is_present, matched, &self);
            }

            return (false, matched, &self);
        }

        if !entire_content_matched {
            return (false, matched, &self);
        }

        let next_node = self.child_nodes.get(&word[prefix_length]);

        match next_node {
            None => (false, matched, &self),
            Some(next_node) => next_node.get_max_match(&word[prefix_length..]),
        }
    }

    pub fn descendant_suffixes<'a>(&'a self) -> Box<dyn Iterator<Item = Bytes> + 'a> {
        let child_nodes = self.child_nodes.values();

        let suffixes = std::iter::once(self.content.clone())
            .filter(|_x| self.is_present)
            .chain(child_nodes.flat_map(|node| {
                node.descendant_suffixes()
                    .map(|suffix| [self.content.clone(), suffix].concat().into())
            }));

        Box::new(suffixes)
    }
}

#[derive(Debug)]
pub struct RadixTree {
    root: RadixNode,
}

impl RadixTree {
    pub fn root(&self) -> &RadixNode {
        &self.root
    }

    pub fn add_word(&mut self, word: Bytes) {
        self.root.add_word(word);
    }
}

impl Default for RadixTree {
    fn default() -> Self {
        RadixTree {
            root: RadixNode::new(Bytes::new(), false, 0),
        }
    }
}

fn get_shared_prefix_length(a: &[u8], b: &[u8]) -> usize {
    a.iter()
        .zip(b.iter())
        .enumerate()
        .find(|(_, (a, b))| a != b)
        .map_or_else(|| a.len().min(b.len()), |(idx, _)| idx)
}

#[cfg(test)]
mod tests {
    use edr_eth::hex_literal::hex;

    use super::*;

    #[test]
    fn test_radix_tree_empty() {
        let tree = RadixTree::default();

        // check that the root content is empty
        assert_eq!(tree.root.content.len(), 0);

        // check that the root is not present
        assert!(!tree.root.is_present);

        // check that the bytes matched before in the root is 0
        assert_eq!(tree.root.bytes_matched_before, 0);

        // check that the root doesn't have children
        assert_eq!(tree.root.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_single_word() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&b't').unwrap();

        assert_eq!(child.content, b"test".to_vec());
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_same_word_twice() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));
        tree.add_word(Bytes::from("test"));

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&b't').unwrap();

        assert_eq!(child.content, Bytes::from("test"));
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_same_prefix() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));
        tree.add_word(Bytes::from("test2"));

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&b't').unwrap();

        assert_eq!(child.content, Bytes::from("test"));
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&b'2').unwrap();
        assert_eq!(grandchild.content, Bytes::from("2"));
        assert!(grandchild.is_present);
        assert_eq!(grandchild.bytes_matched_before, 4);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_prefix_existing_one() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));
        tree.add_word(Bytes::from("te"));

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, Bytes::from("te"));
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&b's').unwrap();
        assert_eq!(grandchild.content, Bytes::from("st"));
        assert!(grandchild.is_present);
        assert_eq!(grandchild.bytes_matched_before, 2);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_with_shared_prefix_but_different_existing_ones() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));
        tree.add_word(Bytes::from("tast"));

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, Bytes::from("t"));
        assert!(!child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&b'e').unwrap();
        assert_eq!(grandchild1.content, Bytes::from("est"));
        assert!(grandchild1.is_present);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&b'a').unwrap();
        assert_eq!(grandchild2.content, Bytes::from("ast"));
        assert!(grandchild2.is_present);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_match_existing_nodes() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));
        tree.add_word(Bytes::from("tast"));
        tree.add_word(Bytes::from("t"));

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, Bytes::from("t"));
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&b'e').unwrap();
        assert_eq!(grandchild1.content, Bytes::from("est"));
        assert!(grandchild1.is_present);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&b'a').unwrap();
        assert_eq!(grandchild2.content, Bytes::from("ast"));
        assert!(grandchild2.is_present);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_empty_tree() {
        let tree = RadixTree::default();
        let (exact_match, length_matched, node) = tree.root.get_max_match(&Bytes::from("word"));

        assert!(!exact_match);
        assert_eq!(length_matched, 0);
        assert!(std::ptr::eq(node, &tree.root));
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_words_without_prefix() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("asdf"));
        let (exact_match, length_matched, node) = tree.root.get_max_match(&Bytes::from("word"));

        assert!(!exact_match);
        assert_eq!(length_matched, 0);
        assert!(std::ptr::eq(node, &tree.root));
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_prefix_smaller_than_content() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("asd"));
        let (exact_match, length_matched, node) = tree.root.get_max_match(&Bytes::from("as"));

        assert!(!exact_match);
        assert_eq!(length_matched, 2);
        assert!(std::ptr::eq(
            node,
            tree.root.child_nodes.get(&b'a').unwrap()
        ),);
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_words_present_after_some_nodes() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("a"));
        tree.add_word(Bytes::from("as"));
        tree.add_word(Bytes::from("asd"));
        let (exact_match, length_matched, node) = tree.root.get_max_match(&Bytes::from("asd"));

        assert!(exact_match);
        assert_eq!(length_matched, 3);
        let expected_node = tree
            .root
            .child_nodes
            .get(&b'a')
            .unwrap()
            .child_nodes
            .get(&b's')
            .unwrap()
            .child_nodes
            .get(&b'd')
            .unwrap();
        assert!(std::ptr::eq(node, expected_node));
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_word_longer_than_existing_nodes() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("a"));
        tree.add_word(Bytes::from("as"));
        tree.add_word(Bytes::from("asd"));
        let (exact_match, length_matched, node) = tree.root.get_max_match(&Bytes::from("asdf"));

        assert!(!exact_match);
        assert_eq!(length_matched, 3);
        let expected_node = tree
            .root
            .child_nodes
            .get(&b'a')
            .unwrap()
            .child_nodes
            .get(&b's')
            .unwrap()
            .child_nodes
            .get(&b'd')
            .unwrap();
        assert!(std::ptr::eq(node, expected_node));
    }

    #[test]
    fn test_radix_tree_descendant_suffixes_empty_tree() {
        let tree = RadixTree::default();

        let suffixes: Vec<Bytes> = tree.root.descendant_suffixes().collect();

        assert_eq!(suffixes.len(), 0);
    }

    #[test]
    fn test_radix_tree_descendant_suffixes_return_the_node_label_if_present() {
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("test"));

        let suffixes: Vec<Bytes> = tree.root.descendant_suffixes().collect();

        assert_eq!(suffixes.len(), 1);
        assert_eq!(suffixes[0], Bytes::from("test"));
    }

    #[test]
    fn test_radix_tree_descendant_suffixes_more_complex_tree() {
        //       <root>
        //         |
        //       <abc>
        //      /    \
        //   [de]   <g>
        //    |     /  \
        //   [f]  [g]  [h]
        let mut tree = RadixTree::default();
        tree.add_word(Bytes::from("abcde"));
        tree.add_word(Bytes::from("abcdef"));
        tree.add_word(Bytes::from("abcgg"));
        tree.add_word(Bytes::from("abcgh"));

        let suffixes: Vec<Bytes> = tree.root.descendant_suffixes().collect();
        assert_eq!(
            suffixes,
            vec![
                b"abcde".to_vec(),
                b"abcdef".to_vec(),
                b"abcgg".to_vec(),
                b"abcgh".to_vec()
            ]
        );

        let abc_node = tree.root.child_nodes.get(&b'a').unwrap();
        let suffixes: Vec<Bytes> = abc_node.descendant_suffixes().collect();
        assert_eq!(
            suffixes,
            vec![
                b"abcde".to_vec(),
                b"abcdef".to_vec(),
                b"abcgg".to_vec(),
                b"abcgh".to_vec()
            ]
        );

        let abcde_node = abc_node.child_nodes.get(&b'd').unwrap();
        let suffixes: Vec<Bytes> = abcde_node.descendant_suffixes().collect();
        assert_eq!(suffixes, vec![b"de".to_vec(), b"def".to_vec()]);

        let abcg_node = abc_node.child_nodes.get(&b'g').unwrap();
        let suffixes: Vec<Bytes> = abcg_node.descendant_suffixes().collect();
        assert_eq!(suffixes, vec![b"gg".to_vec(), b"gh".to_vec()]);

        let abcgh_node = abcg_node.child_nodes.get(&b'h').unwrap();
        let suffixes: Vec<Bytes> = abcgh_node.descendant_suffixes().collect();
        assert_eq!(suffixes, vec![b"h".to_vec()]);
    }

    #[test]
    fn test_radix_tree_real_world_example() {
        // Bytecodes extracted from
        // Use compiler soljson-v0.6.3+commit.8dda9521.js
        //          0_6
        //            abi-v2
        //              call-failing-function
        //                Without optimizations
        //                  test-files/0_6/abi-v2/call-failing-function
        let mut tree = RadixTree::default();

        let bytecode1 = Bytes::from_static(&hex!("608060405234801561001057600080fd5b506105d5806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063f8a8fd6d14610030575b600080fd5b61003861003a565b005b6000604051610048906100f0565b604051809103906000f080158015610064573d6000803e3d6000fd5b5090508073ffffffffffffffffffffffffffffffffffffffff1663a9cc47186040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156100af57600080fd5b505af11580156100c3573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f820116820180604052506100ec91908101906101e1565b5050565b6103078061029983390190565b600082601f83011261010e57600080fd5b815161012161011c8261024f565b610222565b9150818183526020840193506020810190508385604084028201111561014657600080fd5b60005b83811015610176578161015c8882610180565b845260208401935060408301925050600181019050610149565b5050505092915050565b60006040828403121561019257600080fd5b61019c6040610222565b905060006101ac848285016101cc565b60008301525060206101c0848285016101cc565b60208301525092915050565b6000815190506101db81610281565b92915050565b6000602082840312156101f357600080fd5b600082015167ffffffffffffffff81111561020d57600080fd5b610219848285016100fd565b91505092915050565b6000604051905081810181811067ffffffffffffffff8211171561024557600080fd5b8060405250919050565b600067ffffffffffffffff82111561026657600080fd5b602082029050602081019050919050565b6000819050919050565b61028a81610277565b811461029557600080fd5b5056fe608060405234801561001057600080fd5b506102e7806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063a9cc471814610030575b600080fd5b61003861004e565b604051610045919061021b565b60405180910390f35b60606040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100829061023d565b60405180910390fd5b61009361010d565b81526020019060019003908161008b5790505090506040518060400160405280600181526020016002815250816000815181106100cc57fe5b60200260200101819052506040518060400160405280600281526020016003815250816001815181106100fb57fe5b60200260200101819052508091505090565b604051806040016040528060008152602001600081525090565b600061013383836101dd565b60408301905092915050565b600061014a8261026d565b6101548185610285565b935061015f8361025d565b8060005b838110156101905781516101778882610127565b975061018283610278565b925050600181019050610163565b5085935050505092915050565b60006101aa600883610296565b91507f44206661696c65640000000000000000000000000000000000000000000000006000830152602082019050919050565b6040820160008201516101f3600085018261020c565b506020820151610206602085018261020c565b50505050565b610215816102a7565b82525050565b60006020820190508181036000830152610235818461013f565b905092915050565b600060208201905081810360008301526102568161019d565b9050919050565b6000819050602082019050919050565b600081519050919050565b6000602082019050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905091905056fea2646970667358221220fbf4de57de6e06c6bac2a7ec2392518b6eb777da534fdd38b8bd290988583c6764736f6c63430006030033a264697066735822122070cadf9cc927971990ad70f87b31a21294cb7ba5f9498d6595ebde6fab6c9a9b64736f6c63430006030033"));
        let bytecode2 = Bytes::from_static(&hex!("608060405234801561001057600080fd5b506004361061002b5760003560e01c8063f8a8fd6d14610030575b600080fd5b61003861003a565b005b6000604051610048906100f0565b604051809103906000f080158015610064573d6000803e3d6000fd5b5090508073ffffffffffffffffffffffffffffffffffffffff1663a9cc47186040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156100af57600080fd5b505af11580156100c3573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f820116820180604052506100ec91908101906101e1565b5050565b6103078061029983390190565b600082601f83011261010e57600080fd5b815161012161011c8261024f565b610222565b9150818183526020840193506020810190508385604084028201111561014657600080fd5b60005b83811015610176578161015c8882610180565b845260208401935060408301925050600181019050610149565b5050505092915050565b60006040828403121561019257600080fd5b61019c6040610222565b905060006101ac848285016101cc565b60008301525060206101c0848285016101cc565b60208301525092915050565b6000815190506101db81610281565b92915050565b6000602082840312156101f357600080fd5b600082015167ffffffffffffffff81111561020d57600080fd5b610219848285016100fd565b91505092915050565b6000604051905081810181811067ffffffffffffffff8211171561024557600080fd5b8060405250919050565b600067ffffffffffffffff82111561026657600080fd5b602082029050602081019050919050565b6000819050919050565b61028a81610277565b811461029557600080fd5b5056fe608060405234801561001057600080fd5b506102e7806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063a9cc471814610030575b600080fd5b61003861004e565b604051610045919061021b565b60405180910390f35b60606040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100829061023d565b60405180910390fd5b61009361010d565b81526020019060019003908161008b5790505090506040518060400160405280600181526020016002815250816000815181106100cc57fe5b60200260200101819052506040518060400160405280600281526020016003815250816001815181106100fb57fe5b60200260200101819052508091505090565b604051806040016040528060008152602001600081525090565b600061013383836101dd565b60408301905092915050565b600061014a8261026d565b6101548185610285565b935061015f8361025d565b8060005b838110156101905781516101778882610127565b975061018283610278565b925050600181019050610163565b5085935050505092915050565b60006101aa600883610296565b91507f44206661696c65640000000000000000000000000000000000000000000000006000830152602082019050919050565b6040820160008201516101f3600085018261020c565b506020820151610206602085018261020c565b50505050565b610215816102a7565b82525050565b60006020820190508181036000830152610235818461013f565b905092915050565b600060208201905081810360008301526102568161019d565b9050919050565b6000819050602082019050919050565b600081519050919050565b6000602082019050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905091905056fea2646970667358221220fbf4de57de6e06c6bac2a7ec2392518b6eb777da534fdd38b8bd290988583c6764736f6c63430006030033a264697066735822122070cadf9cc927971990ad70f87b31a21294cb7ba5f9498d6595ebde6fab6c9a9b64736f6c63430006030033"));
        let bytecode3 = Bytes::from_static(&hex!("608060405234801561001057600080fd5b506102e7806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063a9cc471814610030575b600080fd5b61003861004e565b604051610045919061021b565b60405180910390f35b60606040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100829061023d565b60405180910390fd5b61009361010d565b81526020019060019003908161008b5790505090506040518060400160405280600181526020016002815250816000815181106100cc57fe5b60200260200101819052506040518060400160405280600281526020016003815250816001815181106100fb57fe5b60200260200101819052508091505090565b604051806040016040528060008152602001600081525090565b600061013383836101dd565b60408301905092915050565b600061014a8261026d565b6101548185610285565b935061015f8361025d565b8060005b838110156101905781516101778882610127565b975061018283610278565b925050600181019050610163565b5085935050505092915050565b60006101aa600883610296565b91507f44206661696c65640000000000000000000000000000000000000000000000006000830152602082019050919050565b6040820160008201516101f3600085018261020c565b506020820151610206602085018261020c565b50505050565b610215816102a7565b82525050565b60006020820190508181036000830152610235818461013f565b905092915050565b600060208201905081810360008301526102568161019d565b9050919050565b6000819050602082019050919050565b600081519050919050565b6000602082019050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905091905056fea2646970667358221220fbf4de57de6e06c6bac2a7ec2392518b6eb777da534fdd38b8bd290988583c6764736f6c63430006030033"));
        let bytecode4 = Bytes::from_static(&hex!("608060405234801561001057600080fd5b506004361061002b5760003560e01c8063a9cc471814610030575b600080fd5b61003861004e565b604051610045919061021b565b60405180910390f35b60606040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100829061023d565b60405180910390fd5b61009361010d565b81526020019060019003908161008b5790505090506040518060400160405280600181526020016002815250816000815181106100cc57fe5b60200260200101819052506040518060400160405280600281526020016003815250816001815181106100fb57fe5b60200260200101819052508091505090565b604051806040016040528060008152602001600081525090565b600061013383836101dd565b60408301905092915050565b600061014a8261026d565b6101548185610285565b935061015f8361025d565b8060005b838110156101905781516101778882610127565b975061018283610278565b925050600181019050610163565b5085935050505092915050565b60006101aa600883610296565b91507f44206661696c65640000000000000000000000000000000000000000000000006000830152602082019050919050565b6040820160008201516101f3600085018261020c565b506020820151610206602085018261020c565b50505050565b610215816102a7565b82525050565b60006020820190508181036000830152610235818461013f565b905092915050565b600060208201905081810360008301526102568161019d565b9050919050565b6000819050602082019050919050565b600081519050919050565b6000602082019050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905091905056fea2646970667358221220fbf4de57de6e06c6bac2a7ec2392518b6eb777da534fdd38b8bd290988583c6764736f6c63430006030033"));

        tree.add_word(bytecode1.clone());
        tree.add_word(bytecode2.clone());
        tree.add_word(bytecode3.clone());
        tree.add_word(bytecode4.clone());

        assert!(tree.root.get_max_match(&bytecode1).0);
        assert!(tree.root.get_max_match(&bytecode2).0);
        assert!(tree.root.get_max_match(&bytecode3).0);
        assert!(tree.root.get_max_match(&bytecode4).0);
    }
}
