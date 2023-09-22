use clap::{Parser, Subcommand};

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
    /// Generate Ethereum execution API
    GenExecutionApi,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.command {
        Command::GenExecutionApi => execution_api::generate(Mode::Overwrite),
    }
}
