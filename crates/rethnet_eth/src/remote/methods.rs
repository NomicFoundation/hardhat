use crate::remote::MethodInvocation as EthMethodInvocation;

/// RPC methods specific to Hardhat
pub mod hardhat;

/// an RPC method with its parameters
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
#[allow(clippy::large_enum_variant)]
pub enum MethodInvocation {
    /// an eth_* method invocation
    Eth(EthMethodInvocation),
    /// a hardhat_* method invocation
    Hardhat(hardhat::HardhatMethodInvocation),
}
