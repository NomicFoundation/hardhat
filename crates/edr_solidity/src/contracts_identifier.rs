use std::collections::HashMap;

#[derive(Debug)]
struct RadixNode {
    content: Vec<u8>,
    is_present: bool,
    bytes_matched_before: u32,
    child_nodes: HashMap<u8, RadixNode>,
}

impl RadixNode {
    fn new(content: Vec<u8>, is_present: bool, bytes_matched_before: u32) -> RadixNode {
        RadixNode {
            content,
            is_present,
            bytes_matched_before,
            child_nodes: HashMap::new(),
        }
    }

    fn add_word(&mut self, word: Vec<u8>) {
        if word.is_empty() {
            return;
        }

        let b = word[0];

        let next_node = self.child_nodes.remove(&b);

        match next_node {
            None => {
                let bytes_matched_before = self.bytes_matched_before + self.content.len() as u32;

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

                    next_node.add_word(word[prefix_length..].to_vec());
                    self.child_nodes.insert(b, next_node);

                    return;
                }

                // If the content includes what's left of the word and some extra
                if prefix_length == word.len() {
                    // nextNode includes the current word and some extra, so we insert a
                    // new node with the word
                    let mut node = RadixNode::new(
                        word,
                        true,
                        self.bytes_matched_before + self.content.len() as u32,
                    );

                    // the new node points to next_node
                    next_node.content = next_node.content[prefix_length..].to_vec();
                    next_node.bytes_matched_before += node.content.len() as u32;
                    node.child_nodes
                        .insert(next_node.content[0], next_node);

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
                    self.bytes_matched_before + self.content.len() as u32,
                );

                // next_node should come after middle_node and its content and bytes_matched_before need to be adapted
                next_node.content = next_node.content[prefix_length..].to_vec();
                next_node.bytes_matched_before +=
                    middle_node.bytes_matched_before + middle_node.content.len() as u32;
                middle_node
                    .child_nodes
                    .insert(next_node.content[0], next_node);

                // create a new node for the word
                let new_node = RadixNode::new(
                    word[prefix_length..].to_vec(),
                    true,
                    middle_node.bytes_matched_before + middle_node.content.len() as u32,
                );
                middle_node
                    .child_nodes
                    .insert(word[prefix_length], new_node);

                // set the middle_node as current_node's child
                self.child_nodes.insert(b, middle_node);
            }
        }
    }
}

#[derive(Debug)]
struct RadixTree {
    root: RadixNode,
}

impl RadixTree {
    fn new() -> RadixTree {
        RadixTree {
            root: RadixNode::new(Vec::new(), false, 0),
        }
    }

    fn add_word(&mut self, word: Vec<u8>) {
        self.root.add_word(word);
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

// tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_radix_tree_empty() {
        let tree = RadixTree::new();

        // check that the root content is empty
        assert_eq!(tree.root.content.len(), 0);

        // check that the root is not present
        assert_eq!(tree.root.is_present, false);

        // check that the bytes matched before in the root is 0
        assert_eq!(tree.root.bytes_matched_before, 0);

        // check that the root doesn't have children
        assert_eq!(tree.root.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_single_word() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();

        assert_eq!(child.content, "test".as_bytes().to_vec());
        assert_eq!(child.is_present, true);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_same_word_twice() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());
        tree.add_word("test".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();

        assert_eq!(child.content, "test".as_bytes().to_vec());
        assert_eq!(child.is_present, true);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_same_prefix() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());
        tree.add_word("test2".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);

        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();

        assert_eq!(child.content, "test".as_bytes().to_vec());
        assert_eq!(child.is_present, true);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&('2' as u8)).unwrap();
        assert_eq!(grandchild.content, "2".as_bytes().to_vec());
        assert_eq!(grandchild.is_present, true);
        assert_eq!(grandchild.bytes_matched_before, 4);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_prefix_existing_one() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());
        tree.add_word("te".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();
        assert_eq!(child.content, "te".as_bytes().to_vec());
        assert_eq!(child.is_present, true);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 1);

        let grandchild = child.child_nodes.get(&('s' as u8)).unwrap();
        assert_eq!(grandchild.content, "st".as_bytes().to_vec());
        assert_eq!(grandchild.is_present, true);
        assert_eq!(grandchild.bytes_matched_before, 2);
        assert_eq!(grandchild.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_with_shared_prefix_but_different_existing_ones() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());
        tree.add_word("tast".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();
        assert_eq!(child.content, "t".as_bytes().to_vec());
        assert_eq!(child.is_present, false);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&('e' as u8)).unwrap();
        assert_eq!(grandchild1.content, "est".as_bytes().to_vec());
        assert_eq!(grandchild1.is_present, true);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&('a' as u8)).unwrap();
        assert_eq!(grandchild2.content, "ast".as_bytes().to_vec());
        assert_eq!(grandchild2.is_present, true);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }

    #[test]
    fn test_radix_tree_add_word_match_existing_nodes() {
        let mut tree = RadixTree::new();
        tree.add_word("test".as_bytes().to_vec());
        tree.add_word("tast".as_bytes().to_vec());
        tree.add_word("t".as_bytes().to_vec());

        assert_eq!(tree.root.child_nodes.len(), 1);
        let child = tree.root.child_nodes.get(&('t' as u8)).unwrap();
        assert_eq!(child.content, "t".as_bytes().to_vec());
        assert_eq!(child.is_present, true);
        assert_eq!(child.bytes_matched_before, 0);
        assert_eq!(child.child_nodes.len(), 2);

        let grandchild1 = child.child_nodes.get(&('e' as u8)).unwrap();
        assert_eq!(grandchild1.content, "est".as_bytes().to_vec());
        assert_eq!(grandchild1.is_present, true);
        assert_eq!(grandchild1.bytes_matched_before, 1);
        assert_eq!(grandchild1.child_nodes.len(), 0);

        let grandchild2 = child.child_nodes.get(&('a' as u8)).unwrap();
        assert_eq!(grandchild2.content, "ast".as_bytes().to_vec());
        assert_eq!(grandchild2.is_present, true);
        assert_eq!(grandchild2.bytes_matched_before, 1);
        assert_eq!(grandchild2.child_nodes.len(), 0);
    }
}