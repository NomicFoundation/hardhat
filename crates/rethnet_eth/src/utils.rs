// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/utils.rs
//
// Part of this code was adapted from ethers-rs and is distributed under their licenss:
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-MIT
// For the original context see: https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/ethers-core/src/utils/hash.rs

use crate::B256;
use revm_primitives::keccak256;

/// RLP-encodes the provided value, prepends it with the provided ID, and appends it to the provided [`RlpStream`].
pub fn enveloped<T: rlp::Encodable>(id: u8, v: &T, s: &mut rlp::RlpStream) {
    let encoded = rlp::encode(v);
    let mut out = vec![0; 1 + encoded.len()];
    out[0] = id;
    out[1..].copy_from_slice(&encoded);
    s.append_raw(&out, 1);
}

const PREFIX: &str = "\x19Ethereum Signed Message:\n";

/// Hash a message according to EIP-191.
///
/// The data is a UTF-8 encoded string and will enveloped as follows:
/// `"\x19Ethereum Signed Message:\n" + message.length + message` and hashed
/// using keccak256.
pub fn hash_message<S>(message: S) -> B256
where
    S: AsRef<[u8]>,
{
    let message = message.as_ref();

    let mut eth_message = format!("{}{}", PREFIX, message.len()).into_bytes();
    eth_message.extend_from_slice(message);

    keccak256(&eth_message)
}
