use std::{io::Write, path::PathBuf};

/// Run a command iterations times and print the time it takes to run each time.
pub(crate) fn run(
    working_directory: PathBuf,
    test_command: &str,
    iterations: usize,
) -> anyhow::Result<()> {
    let mut deltas = Vec::new();

    // Run test command in working directory iterations times and capture the time
    // it takes to run
    for i in 1..(iterations + 1) {
        println!("Running {i}/{iterations} `{test_command}`");
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

        let delta = (end - start).as_secs();
        if !output.status.success() {
            let mut stdout = std::io::stdout();
            stdout.write_all(&output.stdout)?;
            stdout.flush()?;
            let mut stderr = std::io::stderr();
            stderr.write_all(&output.stderr)?;
            stderr.flush()?;

            println!("Interim benchmark results (seconds): {deltas:?}");

            anyhow::bail!(
                "Command `{}` failed in {} seconds with exit code {}",
                test_command,
                delta,
                output
                    .status
                    .code()
                    .map_or_else(|| "N/A".to_string(), |c| c.to_string())
            );
        }

        println!("Command `{test_command}` succeeded in {delta} seconds");

        deltas.push(delta);
    }

    println!("Benchmark results (seconds): {deltas:?}");

    Ok(())
}
