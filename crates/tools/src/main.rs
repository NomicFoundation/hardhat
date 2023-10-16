use clap::{Parser, Subcommand};
use std::path::PathBuf;

mod benchmark;
mod execution_api;
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
    /// Generate Ethereum execution API
    GenExecutionApi,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.command {
        Command::Benchmark {
            working_directory,
            test_command,
            iterations,
        } => benchmark::run(working_directory, &test_command, iterations),
        Command::GenExecutionApi => execution_api::generate(Mode::Overwrite),
    }
}
