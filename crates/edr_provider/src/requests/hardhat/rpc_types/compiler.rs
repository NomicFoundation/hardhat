use edr_eth::HashMap;

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
    /// mapping: source name -> (mapping: contract name -> compiler output
    /// selections)
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
    /// mapping: source name -> (mapping: contract name ->
    /// CompilerOutputContract)
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

pub mod u64_that_must_be_20 {
    pub fn serialize<S>(val: &u64, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        if *val == 20 {
            s.serialize_u64(*val)
        } else {
            use serde::ser::Error;
            Err(S::Error::custom("value must be 20"))
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: u64 = serde::de::Deserialize::deserialize(deserializer)?;
        if s == 20 {
            Ok(s)
        } else {
            use serde::de::Error;
            Err(D::Error::custom("value must be 20"))
        }
    }
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkReference {
    start: usize,
    #[serde(with = "u64_that_must_be_20")]
    length: u64,
}
