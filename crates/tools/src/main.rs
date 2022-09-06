use clap::{Parser, Subcommand};

mod hardhat;
mod update;

#[derive(Parser)]
#[clap(name = "tasks", version, author)]
struct Args {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Generate Rust WASM bindings for Hardhat
    GenHardhatApi,
    /// Generate WASM and JS/TS bindings for Rethnet
    GenRethnetApi,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.command {
        Command::GenHardhatApi => todo!(),
        Command::GenRethnetApi => todo!(),
    }
    Ok(())
}
