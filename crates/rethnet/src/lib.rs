use std::ffi::OsString;
use std::fs;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::Path;
use std::time::UNIX_EPOCH;

use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use secp256k1::{Error as Secp256k1Error, SecretKey};
use tracing::{event, Level};

use rethnet_eth::{Address, Bytes, U256, U64};
use rethnet_rpc_server::{
    AccountConfig as ServerAccountConfig, Config as ServerConfig, RpcForkConfig,
    RpcHardhatNetworkConfig,
};

pub mod config;

use config::{AccountConfig, ConfigFile};

#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
struct Cli {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum Command {
    Node(NodeArgs),
}

const DEFAULT_CONFIG_FILE_NAME: &str = "edr.toml";

#[derive(Args)]
struct NodeArgs {
    #[clap(long, default_value_t = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)))]
    host: IpAddr,
    #[clap(long, default_value = "8545")]
    port: u16,
    #[clap(long, default_value = DEFAULT_CONFIG_FILE_NAME)]
    config_file: String,
    /// Instead of starting the node, overwrite edr.toml with default configuration values
    #[clap(long, action = clap::ArgAction::SetTrue)]
    init_config_file: bool,
    #[clap(long)]
    fork_url: Option<String>,
    #[clap(long)]
    fork_block_number: Option<usize>,
    #[clap(long)]
    chain_id: Option<u64>,
    #[clap(long)]
    coinbase: Option<Address>,
    #[clap(long)]
    network_id: Option<u64>,
    #[clap(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

fn server_config_from_cli_args_and_config_file(
    node_args: NodeArgs,
    config_file: ConfigFile,
) -> Result<ServerConfig, anyhow::Error> {
    let config_file = ConfigFile::resolve_none_values_to_defaults(config_file);
    Ok(ServerConfig {
        address: SocketAddr::new(node_args.host, node_args.port),
        rpc_hardhat_network_config: RpcHardhatNetworkConfig {
            forking: if let Some(json_rpc_url) = node_args.fork_url {
                Some(RpcForkConfig {
                    json_rpc_url,
                    block_number: node_args.fork_block_number,
                    http_headers: None,
                })
            } else if node_args.fork_block_number.is_some() {
                Err(anyhow!(
                    "A fork block number can only be used if you also supply a fork URL"
                ))?
            } else {
                None
            },
        },
        accounts: config_file
            .accounts
            .expect("should be resolved to default")
            .iter()
            .map(ServerAccountConfig::try_from)
            .collect::<Result<Vec<_>, _>>()?,
        block_gas_limit: config_file
            .block_gas_limit
            .expect("should be resovled to default"),
        chain_id: node_args
            .chain_id
            .or(config_file.chain_id)
            .map(U64::from)
            .expect("should be resolved to default"),
        coinbase: node_args
            .coinbase
            .or(config_file.coinbase)
            .expect("should be resolved to default"),
        gas: config_file.gas.expect("should be resolved to default"),
        hardfork: config_file.hardfork.expect("should be resovled to default"),
        initial_base_fee_per_gas: config_file.initial_base_fee_per_gas,
        initial_date: config_file.initial_date.map(|instant| {
            U256::from(
                instant
                    .duration_since(UNIX_EPOCH)
                    .expect("initial date must be after UNIX epoch")
                    .as_secs(),
            )
        }),
        network_id: node_args
            .network_id
            .or(config_file.network_id)
            .map(U64::from)
            .expect("should be resolved to default"),
    })
}

impl TryFrom<&AccountConfig> for ServerAccountConfig {
    type Error = Secp256k1Error;
    fn try_from(account_config: &AccountConfig) -> Result<Self, Self::Error> {
        let bytes: Bytes = account_config.private_key.clone().into();
        Ok(Self {
            private_key: SecretKey::from_slice(&bytes[..])?,
            balance: account_config.balance,
        })
    }
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
            if node_args.init_config_file {
                fs::write(
                    DEFAULT_CONFIG_FILE_NAME,
                    toml::to_string(&ConfigFile::default())?,
                )
                .map_err(|e| anyhow!("failed to write config file: {e}"))
                .map(|_| ExitStatus::Success)
            } else {
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

                let server = rethnet_rpc_server::Server::new(
                    server_config_from_cli_args_and_config_file(node_args, config_file)?,
                )
                .await?;

                Ok(server
                    .serve_with_shutdown_signal(await_signal())
                    .await
                    .map(|_| ExitStatus::Success)?)
            }
        }
    }
}
