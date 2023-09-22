use anyhow::anyhow;
use rethnet::{run_with_args, ExitStatus};

/// Main entry point for the `rethnet` executable.
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let status = run_with_args(std::env::args_os()).await?;
    match status {
        ExitStatus::Success => Ok(()),
        ExitStatus::Error => Err(anyhow!("Exited unexpectedly")),
    }
}
