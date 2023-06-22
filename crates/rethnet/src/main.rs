use rethnet::{run_with_args, ExitStatus};

/// Main entry point for the `rethnet` executable.
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let status = run_with_args(std::env::args_os()).await.unwrap();
    match status {
        ExitStatus::Success => (),
        ExitStatus::Error => std::process::exit(1),
    }
    Ok(())
}
