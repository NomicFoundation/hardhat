use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;

/// Run a command iterations times and print the time it takes to run each time.
pub(crate) fn run(working_directory: PathBuf, test_command: &str, iterations: usize) -> Result<()> {
    let mut times = Vec::new();

    // Run test command in working directory iterations times and capture the time it takes to run
    for i in 0..iterations {
        println!("Running {}/{iterations} `{test_command}`", i + 1);
        let start = std::time::Instant::now();
        let output = if cfg!(target_os = "windows") {
            std::process::Command::new("cmd")
                .args(["/C", test_command])
                .current_dir(&working_directory)
                .output()?
        } else {
            std::process::Command::new("sh")
                .arg("-c")
                .arg(test_command)
                .current_dir(&working_directory)
                .output()?
        };
        let end = std::time::Instant::now();

        if !output.status.success() {
            anyhow::bail!(
                "Benchmark failed with exit code: {}",
                output.status.code().unwrap_or(-1)
            );
        }

        times.push(end - start);
    }

    let seconds = times.iter().map(Duration::as_secs).collect::<Vec<_>>();
    println!("Benchmark results (seconds): {seconds:?}");

    Ok(())
}
