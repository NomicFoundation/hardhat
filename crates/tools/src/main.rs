use std::path::PathBuf;

use clap::{Parser, Subcommand};

mod benchmark;
mod compare_test_runs;
mod execution_api;
mod remote_block;
mod scenario;
mod update;

use update::Mode;

#[derive(Parser)]
#[clap(name = "tasks", version, author)]
struct Args {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run benchmarks
    Benchmark {
        working_directory: PathBuf,
        #[clap(long, short, default_value = "npx hardhat test")]
        test_command: String,
        /// The number of iterations to run
        #[clap(long, short, default_value = "3")]
        iterations: usize,
    },
    /// Compare JSON format test execution outputs for slower tests. Pass the
    /// --reporter json argument to mocha to generate the input files.
    CompareTestRuns {
        /// The path to the baseline test run
        baseline: PathBuf,
        /// The path to the candidate test run
        candidate: PathBuf,
    },
    /// Generate Ethereum execution API
    GenExecutionApi,
    /// Replays a block from a remote node and compares it to the mined block.
    ReplayBlock {
        /// The URL of the remote node
        #[clap(long, short)]
        url: String,
        /// The block number to replay
        #[clap(long, short)]
        block_number: Option<u64>,
        /// The chain ID
        #[clap(long, short)]
        chain_id: u64,
    },
    /// Execute a benchmark scenario and report statistics
    Scenario {
        /// The path to the scenario file (JSON lines or GZipped JSON lines)
        path: PathBuf,
        /// The maximum number of requests to execute.
        #[clap(long, short)]
        count: Option<usize>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.command {
        Command::CompareTestRuns {
            baseline,
            candidate,
        } => compare_test_runs::compare(&baseline, &candidate),
        Command::Benchmark {
            working_directory,
            test_command,
            iterations,
        } => benchmark::run(working_directory, &test_command, iterations),
        Command::GenExecutionApi => execution_api::generate(Mode::Overwrite),
        Command::ReplayBlock {
            url,
            block_number,
            chain_id,
        } => remote_block::replay(url, block_number, chain_id).await,
        Command::Scenario { path, count } => scenario::execute(&path, count).await,
    }
}
