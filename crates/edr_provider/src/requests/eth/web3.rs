use edr_eth::{serde::ZeroXPrefixedBytes, Bytes, B256};
use sha3::{Digest, Keccak256};

use crate::ProviderError;

pub fn handle_web3_client_version_request() -> Result<String, ProviderError> {
    Ok(format!(
        "edr/{}/revm/{}",
        env!("CARGO_PKG_VERSION"),
        env!("REVM_VERSION"),
    ))
}

pub fn handle_web3_sha3_request(message: ZeroXPrefixedBytes) -> Result<B256, ProviderError> {
    let message = Bytes::from(message);
    let hash = Keccak256::digest(&message[..]);
    Ok(B256::from_slice(&hash[..]))
}
