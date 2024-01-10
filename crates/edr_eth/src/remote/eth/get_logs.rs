use revm_primitives::Address;

use crate::remote::BlockSpec;

/// for specifying the inputs to `eth_getLogs`
#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLogsInput {
    /// starting block for get_logs request
    pub from_block: BlockSpec,
    /// ending block for get_logs request
    pub to_block: BlockSpec,
    /// address for get_logs request
    pub address: Option<Address>,
}
