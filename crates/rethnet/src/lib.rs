use std::ffi::OsString;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use tracing::{event, Level};

use rethnet_eth::U64;
use rethnet_rpc_server::{Config as ServerConfig, RpcForkConfig, RpcHardhatNetworkConfig};

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
    Node(NodeArgs),
}

#[derive(Args)]
struct NodeArgs {
    #[clap(long, default_value_t = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)))]
    host: IpAddr,
    #[clap(long, default_value = "8545")]
    port: u16,
    #[clap(long)]
    fork_url: Option<String>,
    #[clap(long)]
    fork_block_number: Option<usize>,
    #[clap(long)]
    chain_id: Option<u64>,
    #[clap(long)]
    network_id: Option<u64>,
    #[clap(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

fn server_config_from_cli_args_and_config_file(
    node_args: NodeArgs,
    config_file: ConfigFile,
) -> Result<ServerConfig, anyhow::Error> {
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
        accounts: config_file.accounts,
        chain_id: node_args
            .chain_id
            .map(U64::from)
            .unwrap_or(config_file.chain_id),
        coinbase: config_file.coinbase,
        network_id: node_args
            .network_id
            .map(U64::from)
            .unwrap_or(config_file.network_id),
    })
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

            let server = rethnet_rpc_server::Server::new(
                server_config_from_cli_args_and_config_file(node_args, ConfigFile::default())?,
            )
            .await?;

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

            Ok(server
                .serve_with_shutdown_signal(await_signal())
                .await
                .map(|_| ExitStatus::Success)?)
        }
    }
}
