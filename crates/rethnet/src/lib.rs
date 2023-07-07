use std::ffi::OsString;

use clap::{Args, Parser, Subcommand};
use tracing::{event, Level};

use rethnet_rpc_server::{Config, RpcForkConfig, RpcHardhatNetworkConfig};

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
    #[clap(long, default_value = "127.0.0.1")]
    host: String,
    #[clap(long, default_value = "8545")]
    port: usize,
    #[clap(long)]
    fork_url: Option<String>,
    #[clap(long)]
    fork_block_number: Option<usize>,
}

impl TryFrom<NodeArgs> for Config {
    type Error = anyhow::Error;

    fn try_from(node_args: NodeArgs) -> Result<Config, Self::Error> {
        Ok(Config {
            address: format!("{}:{}", node_args.host, node_args.port).parse()?,
            rpc_hardhat_network_config: RpcHardhatNetworkConfig {
            forking: if let Some(json_rpc_url) = node_args.fork_url {
                Some(RpcForkConfig {
                    json_rpc_url,
                    block_number: node_args.fork_block_number,
                    http_headers: None,
                })
            } else if node_args.fork_block_number.is_some() {
                Err(anyhow::anyhow!(
                    "A fork block number can only be used if you also supply a fork URL"
                ))?
            } else {
                None
            },
            }
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
    let args = Cli::parse_from(args);
    match args.command {
        Command::Node(node_args) => {
            tracing_subscriber::fmt::Subscriber::builder().init();

            let server =
                rethnet_rpc_server::serve(node_args.try_into()?, None)
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
                .with_graceful_shutdown(await_signal())
                .await
                .map(|_| ExitStatus::Success)?)
        }
    }
}
