use rethnet_evm::HashMap;

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct RpcHardhatNetworkConfig {
    pub forking: Option<RpcForkConfig>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RpcForkConfig {
    pub json_rpc_url: String,
    pub block_number: Option<usize>,
    pub http_headers: Option<HashMap<String, String>>,
}
