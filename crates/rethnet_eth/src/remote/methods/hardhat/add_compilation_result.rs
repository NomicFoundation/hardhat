#![allow(missing_docs)]

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
    /// maps a source name to a mapping from contract names to a vector of output
    /// selections:
    output_selection: HashMap<String, HashMap<String, Vec<String>>>,
    evm_version: Option<String>,
    /// maps a library file name to a mapping from library name to library content:
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
    /// a mapping from source name to CompilerOutputSource:
    sources: HashMap<String, CompilerOutputSource>,
    /// a mapping from source name to a mapping from contract name to
    /// CompilerOutputContract:
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
    /// a mapping from method signatures to method identifiers:
    method_identifiers: HashMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerOutputBytecode {
    object: String,
    opcodes: String,
    source_map: String,
    /// a mapping from source name to a mapping from library name to an array of
    /// LinkReferences:
    link_references: HashMap<String, HashMap<String, Vec<LinkReference>>>,
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkReference {
    start: usize,
    length: usize, // TODO: this should always be 20; can we enforce that
                   // statically?
}
