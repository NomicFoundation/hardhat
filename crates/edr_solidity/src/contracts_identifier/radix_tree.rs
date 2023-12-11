use std::collections::HashMap;

#[derive(Debug)]
pub struct RadixNode {
    content: Vec<u8>,
    is_present: bool,
    bytes_matched_before: usize,
    child_nodes: HashMap<u8, RadixNode>,
}

impl RadixNode {
    fn new(content: Vec<u8>, is_present: bool, bytes_matched_before: usize) -> RadixNode {
        RadixNode {
            content,
            is_present,
            bytes_matched_before,
            child_nodes: HashMap::new(),
        }
    }

    pub fn content(&self) -> &Vec<u8> {
        &self.content
    }

    fn add_word(&mut self, word: Vec<u8>) {
        if word.is_empty() {
            return;
        }

        let b = word[0];

        // we temporarily remove the next node and then insert it back, possibly mutated
        // and/or in a different position
        let next_node = self.child_nodes.remove(&b);

        match next_node {
            None => {
                let bytes_matched_before = self.bytes_matched_before + self.content.len();

                let node = RadixNode::new(word, true, bytes_matched_before);

                self.child_nodes.insert(b, node);
            }
            Some(mut next_node) => {
                let prefix_length = get_shared_prefix_length(&word, &next_node.content);

                // We know it's at least 1
                assert!(prefix_length > 0);

                // Check if the next node's label is included in the word
                if prefix_length == next_node.content.len() {
                    // Check if the next node matches the word exactly
                    if prefix_length == word.len() {
                        next_node.is_present = true;
                        self.child_nodes.insert(b, next_node);
                        return;
                    }

                    // TODO can this (and all the other to_vec's) be replaced with .drain()?
                    next_node.add_word(word[prefix_length..].to_vec());
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
                    next_node.content = next_node.content[prefix_length..].to_vec();
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
                    word[..prefix_length].to_vec(),
                    false,
                    self.bytes_matched_before + self.content.len(),
                );

                // next_node should come after middle_node and its content and
                // bytes_matched_before need to be adapted
                next_node.content = next_node.content[prefix_length..].to_vec();
                next_node.bytes_matched_before +=
                    middle_node.bytes_matched_before + middle_node.content.len();
                middle_node
                    .child_nodes
                    .insert(next_node.content[0], next_node);

                // create a new node for the word
                let new_node = RadixNode::new(
                    word[prefix_length..].to_vec(),
                    true,
                    middle_node.bytes_matched_before + middle_node.content.len(),
                );
                middle_node
                    .child_nodes
                    .insert(word[prefix_length], new_node);

                // set the middle_node as current_node's child
                self.child_nodes.insert(b, middle_node);
            }
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
    fn get_max_match(&self, word: &[u8]) -> (bool, usize, &RadixNode) {
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
}

#[derive(Debug)]
pub struct RadixTree {
    root: RadixNode,
}

impl RadixTree {
    pub fn add_word(&mut self, word: Vec<u8>) {
        self.root.add_word(word);
    }

    pub fn get_max_match(&self, word: &[u8]) -> (bool, usize, &RadixNode) {
        self.root.get_max_match(word)
    }
}

impl Default for RadixTree {
    fn default() -> Self {
        RadixTree {
            root: RadixNode::new(vec![], false, 0),
        }
    }
}

fn get_shared_prefix_length(a: &[u8], b: &[u8]) -> usize {
    let max_index = std::cmp::min(a.len(), b.len());

    let mut i = 0;
    while i < max_index {
        if a[i] != b[i] {
            return i;
        }
        i += 1;
    }

    i
}

#[cfg(test)]
mod tests {
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
        tree.add_word(b"test".to_vec());

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
        tree.add_word(b"test".to_vec());
        tree.add_word(b"test".to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&b't').unwrap();

        assert_eq!(child.content, b"test".to_vec());
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_same_prefix() {
        let mut tree = RadixTree::default();
        tree.add_word(b"test".to_vec());
        tree.add_word(b"test2".to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&b't').unwrap();

        assert_eq!(child.content, b"test".to_vec());
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&b'2').unwrap();
        assert_eq!(grandchild.content, b"2".to_vec());
        assert!(grandchild.is_present);
        assert_eq!(grandchild.bytes_matched_before, 4);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_prefix_existing_one() {
        let mut tree = RadixTree::default();
        tree.add_word(b"test".to_vec());
        tree.add_word(b"te".to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, b"te".to_vec());
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&b's').unwrap();
        assert_eq!(grandchild.content, b"st".to_vec());
        assert!(grandchild.is_present);
        assert_eq!(grandchild.bytes_matched_before, 2);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_with_shared_prefix_but_different_existing_ones() {
        let mut tree = RadixTree::default();
        tree.add_word(b"test".to_vec());
        tree.add_word(b"tast".to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, b"t".to_vec());
        assert!(!child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&b'e').unwrap();
        assert_eq!(grandchild1.content, b"est".to_vec());
        assert!(grandchild1.is_present);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&b'a').unwrap();
        assert_eq!(grandchild2.content, b"ast".to_vec());
        assert!(grandchild2.is_present);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_match_existing_nodes() {
        let mut tree = RadixTree::default();
        tree.add_word(b"test".to_vec());
        tree.add_word(b"tast".to_vec());
        tree.add_word(b"t".to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&b't').unwrap();
        assert_eq!(child.content, b"t".to_vec());
        assert!(child.is_present);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&b'e').unwrap();
        assert_eq!(grandchild1.content, b"est".to_vec());
        assert!(grandchild1.is_present);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&b'a').unwrap();
        assert_eq!(grandchild2.content, b"ast".to_vec());
        assert!(grandchild2.is_present);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_empty_tree() {
        let tree = RadixTree::default();
        let (exact_match, length_matched, node) = tree.get_max_match(b"word");

        assert!(!exact_match);
        assert_eq!(length_matched, 0);
        assert!(std::ptr::eq(node, &tree.root));
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_words_without_prefix() {
        let mut tree = RadixTree::default();
        tree.add_word(b"asdf".to_vec());
        let (exact_match, length_matched, node) = tree.get_max_match(b"word");

        assert!(!exact_match);
        assert_eq!(length_matched, 0);
        assert!(std::ptr::eq(node, &tree.root));
    }

    #[test]
    fn test_radix_tree_get_max_match_default_first_node_prefix_smaller_than_content() {
        let mut tree = RadixTree::default();
        tree.add_word(b"asd".to_vec());
        let (exact_match, length_matched, node) = tree.get_max_match(b"as");

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
        tree.add_word(b"a".to_vec());
        tree.add_word(b"as".to_vec());
        tree.add_word(b"asd".to_vec());
        let (exact_match, length_matched, node) = tree.get_max_match(b"asd");

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
        tree.add_word(b"a".to_vec());
        tree.add_word(b"as".to_vec());
        tree.add_word(b"asd".to_vec());
        let (exact_match, length_matched, node) = tree.get_max_match(b"asdf");

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
}
