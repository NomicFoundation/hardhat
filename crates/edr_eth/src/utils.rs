// Part of this code was adapted from foundry and is distributed under their
// licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/utils.rs
//
// Part of this code was adapted from ethers-rs and is distributed under their
// licenss:
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-MIT
// For the original context see: https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/ethers-core/src/utils/hash.rs

use revm_primitives::keccak256;
use rlp::Encodable;

use crate::{B256, U256, U64};

/// RLP-encodes the provided value, prepends it with the provided ID, and
/// appends it to the provided [`rlp::RlpStream`].
pub fn enveloped<T: Encodable>(id: u8, v: &T, s: &mut rlp::RlpStream) {
    let encoded = rlp::encode(v);
    let enveloped = envelop_bytes(id, &encoded);
    s.append_raw(&enveloped, 1);
}

/// Prepends the provided (RLP-encoded) bytes with the provided ID.
pub fn envelop_bytes(id: u8, bytes: &[u8]) -> Vec<u8> {
    let mut out = vec![0; 1 + bytes.len()];
    out[0] = id;
    out[1..].copy_from_slice(bytes);

    out
}

/// Hash a message according to EIP-191.
///
/// The data is a UTF-8 encoded string and will be enveloped as follows:
/// `"\x19Ethereum Signed Message:\n" + message.length + message` and hashed
/// using keccak256.
pub fn hash_message<S>(message: S) -> B256
where
    S: AsRef<[u8]>,
{
    const PREFIX: &str = "\x19Ethereum Signed Message:\n";

    let message = message.as_ref();

    let mut eth_message = format!("{}{}", PREFIX, message.len()).into_bytes();
    eth_message.extend_from_slice(message);

    keccak256(&eth_message)
}

/// Convert a U256 to String as a 32-byte 0x prefixed hex string.
pub fn u256_to_padded_hex(word: &U256) -> String {
    if word == &U256::ZERO {
        // For 0 zero, the #066x formatter doesn't add padding.
        format!("0x{}", "0".repeat(64))
    } else {
        // 66 = 64 hex chars + 0x prefix
        format!("{word:#066x}")
    }
}

/// Convert a U64 to String as an 8-byte 0x prefixed hex string.
pub fn u64_to_padded_hex(word: U64) -> String {
    if word == U64::ZERO {
        // For 0 zero, the #066x formatter doesn't add padding.
        format!("0x{}", "0".repeat(16))
    } else {
        // 18 = 16 hex chars + 0x prefix
        format!("{word:#018x}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_u256_to_padded_hex() {
        assert_eq!(
            u256_to_padded_hex(&U256::ZERO),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        assert_eq!(
            u256_to_padded_hex(&U256::from(1)),
            "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
    }

    #[test]
    fn test_u64_to_padded_hex() {
        assert_eq!(u64_to_padded_hex(U64::ZERO), "0x0000000000000000");
        assert_eq!(u64_to_padded_hex(U64::from(1)), "0x0000000000000001");
    }
}
