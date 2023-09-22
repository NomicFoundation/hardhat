use std::{
    fs::File,
    io::Write,
    path::Path,
    process::{Command, Stdio},
};

use anyhow::{anyhow, bail};
use cfg_if::cfg_if;

use crate::update::{project_root, Mode};

const EXECUTION_API_DIR: &str = "crates/eth_execution_api";
const EXECUTION_API_RAW_REPO: &str = "https://raw.githubusercontent.com/ethereum/execution-apis";

fn get_version(crate_path: &Path) -> anyhow::Result<String> {
    let crate_manifest_path = crate_path.join("Cargo.toml");

    let contents = std::fs::read_to_string(Path::new(&crate_manifest_path))?;
    let crate_manifest: toml::Value = toml::from_str(&contents)?;

    let package = crate_manifest
        .get("package")
        .ok_or_else(|| anyhow!("Cargo.toml does not contain `package` section."))?;

    let version = package
        .get("version")
        .ok_or_else(|| anyhow!("Cargo.toml does not contain `version` under `package` section."))?;

    version
        .as_str()
        .map(ToOwned::to_owned)
        .ok_or_else(|| anyhow!("Expected `version` to be a string value."))
}

fn get_openrpc_json(version: &str) -> anyhow::Result<String> {
    let url = format!("{EXECUTION_API_RAW_REPO}/v{version}/refs-openrpc.json");

    reqwest::blocking::get(url)
        .map_err(|e| {
            anyhow!(
                "Failed to retrieve `openrpc.json` for version: {} due to error: `{}`.",
                version,
                e.to_string()
            )
        })?
        .text()
        .map_err(|e| {
            anyhow!(
                "Failed to convert retrieved `openrpc.json` to UTF-8, due to: {}.",
                e
            )
        })
}

pub fn generate(_mode: Mode) -> anyhow::Result<()> {
    let crate_path = project_root().join(EXECUTION_API_DIR);
    let version = get_version(&crate_path)?;
    let openrpc_json = get_openrpc_json(&version)?;

    cfg_if! {
        if #[cfg(windows)] {
            let program = "npx.cmd";
        } else {
            let program = "npx";
        }
    };

    let tempdir = tempfile::tempdir()?;
    let tempfile_path = tempdir.path().join("openrpc.json");

    {
        let mut tempfile = File::create(&tempfile_path)?;
        tempfile.write_all(openrpc_json.as_bytes())?;
    }

    let src_path = crate_path.join("src");
    let mut command = Command::new(program)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .arg("open-rpc-typings")
        .arg("-d")
        .arg(tempfile_path.to_str().unwrap())
        .arg("--output-rs")
        .arg(src_path.to_str().unwrap())
        .arg("--name-rs")
        .arg("lib")
        .spawn()?;

    let status = command.wait()?;
    if status.success() {
        Ok(())
    } else {
        bail!("Failed to generate execution api, due to: {}", status)
    }
}
