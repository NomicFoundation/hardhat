use std::ffi::OsString;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use secp256k1::SecretKey;
use tracing::{event, Level};

use rethnet_eth::U256;
use rethnet_rpc_server::{
    AccountConfig, Config as ServerConfig, RpcForkConfig, RpcHardhatNetworkConfig,
};

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
    #[clap(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

pub struct ConfigFile {
    // TODO: expand this per https://github.com/NomicFoundation/rethnet/issues/111
    accounts: Vec<AccountConfig>,
}

impl Default for ConfigFile {
    fn default() -> Self {
        use std::str::FromStr;
        Self {
            accounts: DEFAULT_PRIVATE_KEYS
                .into_iter()
                .map(|s| AccountConfig {
                    private_key: SecretKey::from_str(s)
                        .expect("should decode all default private keys from strings"),
                    balance: U256::from(10000),
                })
                .collect(),
        }
    }
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

pub const DEFAULT_PRIVATE_KEYS: [&str; 20] = [
    // these were taken from the standard output of a run of `hardhat node`
    "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
    "f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
    "701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
    "a267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
    "47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
    "c526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
    "8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
    "ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
    "689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
    "de9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
    "df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

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
                    _ => Err(anyhow::anyhow!(
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
