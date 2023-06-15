use hashbrown::HashMap;

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerInput {
    language: String,
    /// maps sourceName to content:
    sources: HashMap<String, CompilerInputSource>,
    settings: CompilerSettings,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerInputSource {
    content: String,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CompilerSettings {
    #[serde(rename = "viaIR")]
    via_ir: Option<bool>,
    optimizer: OptimizerSettings,
    metadata: Option<MetadataSettings>,
    /// mapping: source name -> (mapping: contract name -> compiler output selections)
    output_selection: HashMap<String, HashMap<String, Vec<String>>>,
    evm_version: Option<String>,
    /// mapping: library file name -> (mapping: library name -> library content)
    libraries: Option<HashMap<String, HashMap<String, String>>>,
    remappings: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimizerSettings {
    runs: Option<usize>,
    enabled: Option<bool>,
    details: Option<OptimizerDetails>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimizerDetails {
    yul_details: YulDetails,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct YulDetails {
    optimizer_steps: String,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MetadataSettings {
    use_literal_content: bool,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutput {
    /// mapping: source name -> CompilerOutputSource
    sources: HashMap<String, CompilerOutputSource>,
    /// mapping: source name -> (mapping: contract name -> CompilerOutputContract)
    contracts: HashMap<String, HashMap<String, CompilerOutputContract>>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutputSource {
    id: usize,
    ast: serde_json::Value,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutputContract {
    abi: serde_json::Value,
    evm: CompilerOutputContractEvm,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutputContractEvm {
    bytecode: CompilerOutputBytecode,
    deployed_bytecode: CompilerOutputBytecode,
    /// mapping: method signature -> method identifier
    method_identifiers: HashMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutputBytecode {
    object: String,
    opcodes: String,
    source_map: String,
    /// mapping: source name -> (mapping: library name -> LinkReferences)
    link_references: HashMap<String, HashMap<String, Vec<LinkReference>>>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkReference {
    start: usize,
    length: usize, // TODO: this should always be 20; can we enforce that
                   // statically?
}
