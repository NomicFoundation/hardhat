//! Utility functions for Ethereum

use hash256_std_hasher::Hash256StdHasher;
use primitive_types::H256;
use sha3::{
    digest::generic_array::{typenum::consts::U32, GenericArray},
    Digest, Keccak256,
};

/// The KECCAK of the RLP encoding of empty data.
pub const KECCAK_NULL_RLP: H256 = H256([
    0x56, 0xe8, 0x1f, 0x17, 0x1b, 0xcc, 0x55, 0xa6, 0xff, 0x83, 0x45, 0xe6, 0x92, 0xc0, 0xf8, 0x6e,
    0x5b, 0x48, 0xe0, 0x1b, 0x99, 0x6c, 0xad, 0xc0, 0x01, 0x62, 0x2f, 0xb5, 0xe3, 0x63, 0xb4, 0x21,
]);

/// Generates a trie root hash for a vector of key-value tuples
pub fn trie_root<I, K, V>(input: I) -> H256
where
    I: IntoIterator<Item = (K, V)>,
    K: AsRef<[u8]> + Ord,
    V: AsRef<[u8]>,
{
    H256::from_slice(triehash::trie_root::<KeccakHasher, _, _, _>(input).as_ref())
}

/// Generates a key-hashed (secure) trie root hash for a vector of key-value tuples.
pub fn sec_trie_root<I, K, V>(input: I) -> H256
where
    I: IntoIterator<Item = (K, V)>,
    K: AsRef<[u8]>,
    V: AsRef<[u8]>,
{
    H256::from_slice(triehash::sec_trie_root::<KeccakHasher, _, _, _>(input).as_ref())
}

/// Generates a trie root hash for a vector of values
pub fn ordered_trie_root<I, V>(input: I) -> H256
where
    I: IntoIterator<Item = V>,
    V: AsRef<[u8]>,
{
    H256::from_slice(triehash::ordered_trie_root::<KeccakHasher, I>(input).as_ref())
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
