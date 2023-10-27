use std::ffi::OsString;
use std::fs;
use std::net::{IpAddr, Ipv4Addr};
use std::path::{Path, PathBuf};

use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use tracing::{event, Level};

use edr_eth::Address;

pub mod config;

use config::ConfigFile;

#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
struct Cli {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum Command {
    /// Start the local Ethereum development node to serve JSON-RPC requests over HTTP.
    Node(NodeArgs),
    /// Write default configuration values to edr.toml, overwriting any existing file.
    InitConfigFile,
}

const DEFAULT_CONFIG_FILE_NAME: &str = "edr.toml";

#[derive(Args)]
pub struct NodeArgs {
    #[clap(long, default_value_t = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)))]
    host: IpAddr,
    #[clap(long, default_value = "8545")]
    port: u16,
    #[clap(long, default_value = DEFAULT_CONFIG_FILE_NAME)]
    config_file: String,
    #[clap(long, action = clap::ArgAction::SetTrue)]
    allow_blocks_with_same_timestamp: bool,
    #[clap(long, action = clap::ArgAction::SetTrue)]
    allow_unlimited_contract_size: bool,
    #[clap(long)]
    fork_url: Option<String>,
    #[clap(long)]
    fork_block_number: Option<u64>,
    #[clap(long)]
    chain_id: Option<u64>,
    #[clap(long)]
    coinbase: Option<Address>,
    #[clap(long)]
    network_id: Option<u64>,
    #[clap(long)]
    cache_dir: Option<PathBuf>,
    #[clap(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

#[derive(Copy, Debug, Clone, PartialEq, Eq)]
pub enum ExitStatus {
    Success,
    Error,
}

impl From<bool> for ExitStatus {
    fn from(value: bool) -> Self {
        if value {
            ExitStatus::Success
        } else {
            ExitStatus::Error
        }
    }
}

pub async fn run_with_args<T, I>(args: I) -> Result<ExitStatus, anyhow::Error>
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    async fn await_signal() {
        use tokio::signal;

        let ctrl_c = async {
            signal::ctrl_c()
                .await
                .expect("failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            use signal::unix::{signal, SignalKind};
            signal(SignalKind::terminate())
                .expect("failed to install signal handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {},
            _ = terminate => {},
        }

        event!(Level::INFO, "Shutting down");
    }

    let args = Cli::parse_from(args);
    match args.command {
        Command::Node(node_args) => {
            tracing_subscriber::fmt::Subscriber::builder()
                .with_max_level(match node_args.verbose {
                    0 => Level::ERROR,
                    1 => Level::WARN,
                    2 => Level::INFO,
                    3 => Level::DEBUG,
                    4 => Level::TRACE,
                    _ => Err(anyhow!(
                        "Specifying --verbose more than 4 times is unsupported"
                    ))?,
                })
                .init();

            let config_file = if Path::new(&node_args.config_file).exists() {
                let mut contents = String::new();
                fs::read_to_string(&mut contents)?;
                toml::from_str(&contents)?
            } else if node_args.config_file != DEFAULT_CONFIG_FILE_NAME {
                Err(anyhow!(
                    "Failed to open config file {}",
                    node_args.config_file
                ))?
            } else {
                ConfigFile::default()
            };

            let server =
                edr_rpc_server::Server::new(config_file.into_server_config(node_args)?).await?;

            Ok(server
                .serve_with_shutdown_signal(await_signal())
                .await
                .map(|_| ExitStatus::Success)?)
        }
        Command::InitConfigFile => fs::write(
            DEFAULT_CONFIG_FILE_NAME,
            toml::to_string(&ConfigFile::default())?,
        )
        .map_err(|e| anyhow!("failed to write config file: {e}"))
        .map(|_| ExitStatus::Success),
    }
}
