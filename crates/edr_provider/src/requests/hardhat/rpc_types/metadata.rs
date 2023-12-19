use edr_eth::B256;

/// Metadata about the provider instance.
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    /// A string identifying the version of Hardhat, for debugging purposes,
    /// not meant to be displayed to users.
    pub client_version: String,
    /// The chain's id. Used to sign transactions.
    pub chain_id: u64,
    /// A 0x-prefixed hex-encoded 32 bytes id which uniquely identifies an
    /// instance/run of Hardhat Network. Running Hardhat Network more than
    /// once (even with the same version and parameters) will always result
    /// in different `instanceId`s. Running `hardhat_reset` will change the
    /// `instanceId` of an existing Hardhat Network.
    pub instance_id: B256,
    /// The latest block's number in Hardhat Network
    pub latest_block_number: u64,
    /// The latest block's hash in Hardhat Network
    pub latest_block_hash: B256,
    /// This field is only present when Hardhat Network is forking another
    /// chain.
    pub forked_network: Option<ForkMetadata>,
}

/// Metadata about the forked network.
#[derive(Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForkMetadata {
    /// The chainId of the network that is being forked
    pub chain_id: u64,
    /// The number of the block that the network forked from.
    pub fork_block_number: u64,
    /// The hash of the block that the network forked from.
    pub fork_block_hash: B256,
}
