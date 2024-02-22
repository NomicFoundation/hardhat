use std::{convert::Infallible, path::Path, sync::Arc, time::Instant};

use anyhow::Context;
use edr_eth::remote::jsonrpc;
use edr_evm::blockchain::BlockchainError;
use edr_provider::{Logger, ProviderError, ProviderRequest};
use indicatif::ProgressBar;
use serde::Deserialize;
use tokio::{
    fs::File,
    io::{AsyncBufReadExt, BufReader},
    runtime, task,
};

#[derive(Clone, Debug, Deserialize)]
struct ScenarioConfig {
    provider_config: edr_provider::ProviderConfig,
    logger_enabled: bool,
}

pub async fn execute(scenario_path: &Path, max_count: Option<usize>) -> anyhow::Result<()> {
    let (config, requests) = load_requests(scenario_path).await?;

    if config.logger_enabled {
        // anyhow::bail!("This scenario expects logging, but logging is not yet
        // implemented")
    }

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

async fn load_requests(
    scenario_path: &Path,
) -> anyhow::Result<(ScenarioConfig, Vec<ProviderRequest>)> {
    println!("Loading requests from {scenario_path:?}");

    let reader = BufReader::new(File::open(scenario_path).await?);
    let mut lines = reader.lines();

    let first_line = lines.next_line().await?.context("Scenario file is empty")?;
    let config: ScenarioConfig = serde_json::from_str(&first_line)?;

    let mut requests: Vec<ProviderRequest> = Vec::new();

    while let Some(line) = lines.next_line().await? {
        let request: ProviderRequest = serde_json::from_str(&line)?;
        requests.push(request);
    }

    Ok((config, requests))
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
