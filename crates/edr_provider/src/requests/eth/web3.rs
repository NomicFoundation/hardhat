use edr_eth::{Bytes, B256};
use sha3::{Digest, Keccak256};

use crate::ProviderError;

pub fn client_version() -> String {
    format!(
        "edr/{}/revm/{}",
        env!("CARGO_PKG_VERSION"),
        env!("REVM_VERSION"),
    )
}

pub fn handle_web3_client_version_request() -> Result<String, ProviderError> {
    Ok(client_version())
}

pub fn handle_web3_sha3_request(message: Bytes) -> Result<B256, ProviderError> {
    let hash = Keccak256::digest(&message[..]);
    Ok(B256::from_slice(&hash[..]))
}
