/// Ethereum RPC request types
pub mod eth;
/// Hardhat RPC request types
pub mod hardhat;
mod methods;
mod validation;

pub use edr_eth::remote::client::Request as RpcRequest;

pub use crate::requests::methods::{MethodInvocation, OneUsizeOrTwo, U64OrUsize};

///
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum ProviderRequest {
    /// A single JSON-RPC request
    Single(MethodInvocation),
    /// A batch of requests
    Batch(Vec<MethodInvocation>),
}
