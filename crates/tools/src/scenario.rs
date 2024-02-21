use std::{convert::Infallible, path::Path, sync::Arc, time::Instant};

use anyhow::Context;
use edr_eth::remote::jsonrpc;
use edr_evm::blockchain::BlockchainError;
use edr_provider::{Logger, ProviderError, ProviderRequest};
use indicatif::ProgressBar;
use rayon::prelude::*;
use serde::Deserialize;
use tokio::{runtime, task};

static CONFIG_FILE_NAME: &str = "config.json";

#[derive(Clone, Debug, Deserialize)]
struct ScenarioConfig {
    provider_config: edr_provider::ProviderConfig,
    logger_enabled: bool,
}

pub async fn execute(directory_path: &Path, max_count: Option<usize>) -> anyhow::Result<()> {
    let config_file_path = directory_path.join(CONFIG_FILE_NAME);
    let config_file = std::fs::File::open(config_file_path)?;
    let config: ScenarioConfig = serde_json::from_reader(config_file)?;
    if config.logger_enabled {
        anyhow::bail!("This scenario expects logging, but logging is not yet implemented")
    }

    let requests = load_requests(directory_path)?;

    let logger = Box::<DisabledLogger>::default();
    let subscription_callback = Box::new(|_| ());

    println!("Executing requests");

    let start = Instant::now();
    // Matches how `edr_napi` constructs and invokes the provider.
    let provider = task::spawn_blocking(move || {
        edr_provider::Provider::new(
            runtime::Handle::current(),
            logger,
            subscription_callback,
            config.provider_config,
        )
    })
    .await??;
    let provider = Arc::new(provider);

    let count = max_count.unwrap_or(requests.len());
    let bar = ProgressBar::new(count as u64);
    let mut success: usize = 0;
    let mut failure: usize = 0;
    for (i, request) in requests.into_iter().enumerate() {
        if let Some(max_count) = max_count {
            if i >= max_count {
                break;
            }
        }
        let p = provider.clone();
        let response = task::spawn_blocking(move || p.handle_request(request))
            .await?
            .map(|r| r.result);
        let response = jsonrpc::ResponseData::from(response);
        match response {
            jsonrpc::ResponseData::Success { .. } => success += 1,
            jsonrpc::ResponseData::Error { .. } => failure += 1,
        }
        if i % 100 == 0 {
            bar.inc(100);
        } else if i == count - 1 {
            bar.inc((count % 100) as u64);
        }
    }

    let elapsed = start.elapsed();

    println!(
        "Total time: {}s, Success: {}, Failure: {}",
        elapsed.as_secs(),
        success,
        failure
    );

    Ok(())
}

fn load_requests(directory_path: &Path) -> anyhow::Result<Vec<ProviderRequest>> {
    println!("Loading requests from {directory_path:?}");
    let mut requests: Vec<(usize, ProviderRequest)> = walkdir::WalkDir::new(directory_path)
        .into_iter()
        .par_bridge()
        .filter(|entry| {
            entry
                .as_ref()
                .map(|entry| {
                    if let Some(file_name) = entry.file_name().to_str() {
                        file_name != CONFIG_FILE_NAME && file_name.ends_with(".json")
                    } else {
                        false
                    }
                })
                .unwrap_or(false)
        })
        .map(|entry| {
            let entry = entry?;
            let path = entry.path();
            let file_name = path.file_name().expect("We filtered for files");
            let file_name = file_name.to_str().context("File name is not valid UTF-8")?;
            let ordinal = file_name
                .split('_')
                .next()
                .context("Expected method call ordinal as prefix in the filename")?;
            let ordinal: usize = ordinal.parse().map_err(|_err| {
                anyhow::anyhow!("Failed to parse ordinal from filename: '{}'", file_name)
            })?;

            let file = std::fs::File::open(path)?;
            let request: ProviderRequest = serde_json::from_reader(file)?;
            Ok((ordinal, request))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    requests.sort_by(|(a, _), (b, _)| a.cmp(b));
    if let Some(first) = requests.first() {
        if first.0 != 0 {
            anyhow::bail!(
                "Expected first request to have ordinal 0, but got {}",
                first.0
            );
        }
    }

    Ok(requests.into_iter().map(|(_, request)| request).collect())
}

#[derive(Clone, Default)]
struct DisabledLogger;

impl Logger for DisabledLogger {
    type BlockchainError = BlockchainError;

    type LoggerError = Infallible;

    fn is_enabled(&self) -> bool {
        false
    }

    fn set_is_enabled(&mut self, _is_enabled: bool) {}

    fn print_method_logs(
        &mut self,
        _method: &str,
        _error: Option<&ProviderError<Infallible>>,
    ) -> Result<(), Infallible> {
        Ok(())
    }
}
