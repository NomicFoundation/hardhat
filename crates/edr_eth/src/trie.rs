// Part of this code was adapted from foundry and is distributed under their
// licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/trie.rs

//! Utility functions for Ethereum

use hash256_std_hasher::Hash256StdHasher;
use sha3::{
    digest::generic_array::{typenum::consts::U32, GenericArray},
    Digest, Keccak256,
};

use crate::B256;

/// The KECCAK of the RLP encoding of empty data.
pub const KECCAK_NULL_RLP: B256 = B256::new([
    0x56, 0xe8, 0x1f, 0x17, 0x1b, 0xcc, 0x55, 0xa6, 0xff, 0x83, 0x45, 0xe6, 0x92, 0xc0, 0xf8, 0x6e,
    0x5b, 0x48, 0xe0, 0x1b, 0x99, 0x6c, 0xad, 0xc0, 0x01, 0x62, 0x2f, 0xb5, 0xe3, 0x63, 0xb4, 0x21,
]);

/// The KECCAK of the RLP encoding of an empty array.
pub const KECCAK_RLP_EMPTY_ARRAY: B256 = B256::new([
    0x1d, 0xcc, 0x4d, 0xe8, 0xde, 0xc7, 0x5d, 0x7a, 0xab, 0x85, 0xb5, 0x67, 0xb6, 0xcc, 0xd4, 0x1a,
    0xd3, 0x12, 0x45, 0x1b, 0x94, 0x8a, 0x74, 0x13, 0xf0, 0xa1, 0x42, 0xfd, 0x40, 0xd4, 0x93, 0x47,
]);

/// Generates a trie root hash for a vector of key-value tuples
pub fn trie_root<I, K, V>(input: I) -> B256
where
    I: IntoIterator<Item = (K, V)>,
    K: AsRef<[u8]> + Ord,
    V: AsRef<[u8]>,
{
    B256::from_slice(triehash::trie_root::<KeccakHasher, _, _, _>(input).as_ref())
}

/// Generates a key-hashed (secure) trie root hash for a vector of key-value
/// tuples.
pub fn sec_trie_root<I, K, V>(input: I) -> B256
where
    I: IntoIterator<Item = (K, V)>,
    K: AsRef<[u8]>,
    V: AsRef<[u8]>,
{
    B256::from_slice(triehash::sec_trie_root::<KeccakHasher, _, _, _>(input).as_ref())
}

/// Generates a trie root hash for a vector of values
pub fn ordered_trie_root<I, V>(input: I) -> B256
where
    I: IntoIterator<Item = V>,
    V: AsRef<[u8]>,
{
    B256::from_slice(triehash::ordered_trie_root::<KeccakHasher, I>(input).as_ref())
}

struct KeccakHasher;

impl hash_db::Hasher for KeccakHasher {
    type Out = GenericArray<u8, U32>;

    type StdHasher = Hash256StdHasher;

    const LENGTH: usize = 32;

    fn hash(x: &[u8]) -> Self::Out {
        Keccak256::digest(x)
    }
}
