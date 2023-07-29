use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
struct CargoToml {
    dependencies: HashMap<String, DependencyValue>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
enum DependencyValue {
    String(String),
    Object {
        version: String,
        git: Option<String>,
        rev: Option<String>,
    },
}

fn main() {
    let cargo_toml: CargoToml = toml::from_str(include_str!("../rethnet_evm/Cargo.toml"))
        .expect("should deserialize Cargo.toml");
    let revm_version = match cargo_toml.dependencies.get("revm") {
        Some(DependencyValue::String(s)) => s.clone(),
        Some(DependencyValue::Object { version, git, rev }) => {
            let rev = rev.clone().map_or(String::new(), |rev| format!("@{rev}"));
            let git = git
                .clone()
                .map_or(String::new(), |git| format!("({git}{rev})"));
            format!("{git}{version}")
        }
        None => panic!("revm dependency not found"),
    };
    println!("cargo:rustc-env=REVM_VERSION={revm_version}");
}
