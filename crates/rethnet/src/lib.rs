use std::ffi::OsString;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use anyhow::anyhow;
use clap::{Args, Parser, Subcommand};
use hashbrown::HashMap;
use tracing::{event, Level};

use rethnet_eth::{Address, U256};
use rethnet_evm::{AccountInfo, KECCAK_EMPTY};
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

impl TryFrom<NodeArgs> for Config {
    type Error = anyhow::Error;

    fn try_from(node_args: NodeArgs) -> Result<Config, Self::Error> {
        Ok(Config {
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

pub const DEFAULT_ACCOUNTS: [&str; 20] = [
    // these were taken from the standard output of a run of `hardhat node`
    "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "90F79bf6EB2c4f870365E785982E1f101E93b906",
    "15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "976EA74026E726554dB657fA54763abd0C3a0aa9",
    "14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "a0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "Bcd4042DE499D14e55001CcbB24a551F3b954096",
    "71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "FABB0ac9d68B0B445fB7357272Ff202C5651694a",
    "1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "dF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    "cd3B766CCDd6AE721141F452C550Ca635964ce71",
    "2546BcD3c84621e976D8185a91A922aE77ECEc30",
    "bDA5747bFD65F08deb54cb465eB87D40e51B197E",
    "dD2FD4581271e230360230F9337D5c0430Bf44C0",
    "8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
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
                    _ => Level::TRACE,
                })
                .init();

            let accounts = DEFAULT_ACCOUNTS.iter().fold(
                HashMap::default(),
                |mut genesis_accounts, account| {
                    use std::str::FromStr;
                    genesis_accounts.insert(
                        Address::from_str(account).unwrap_or_else(|e| {
                            panic!("Failed to parse default address {account}: {e}")
                        }),
                        AccountInfo {
                            balance: U256::from(10000), // copied from Hardhat Network stdout
                            nonce: 0,
                            code: None,
                            code_hash: KECCAK_EMPTY,
                        },
                    );
                    genesis_accounts
                },
            );

            let server = rethnet_rpc_server::Server::new(node_args.try_into()?, accounts).await?;

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
