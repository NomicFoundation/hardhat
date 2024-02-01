mod config;

use std::{
    path::PathBuf,
    sync::{atomic::AtomicUsize, Arc},
};

use edr_eth::remote::jsonrpc;
use edr_provider::{InvalidRequestReason, ProviderRequest};
use napi::{tokio::runtime, Env, JsFunction, JsObject, Status};
use napi_derive::napi;
use serde::Serialize;
use uuid::Uuid;

use self::config::ProviderConfig;
use crate::{
    context::EdrContext,
    logger::{Logger, LoggerConfig, LoggerError},
    subscribe::SubscriberCallback,
    trace::RawTrace,
};

const SCENARIO_DIR_ENV: &str = "EDR_SCENARIO_DIR";

/// A JSON-RPC provider for Ethereum.
#[napi]
pub struct Provider {
    provider: Arc<edr_provider::Provider<LoggerError>>,
    id: Uuid,
    request_counter: AtomicUsize,
}

#[napi]
impl Provider {
    #[doc = "Constructs a new provider with the provided configuration."]
    #[napi(ts_return_type = "Promise<Provider>")]
    pub fn with_config(
        env: Env,
        // We take the context as argument to ensure that tracing is initialized properly.
        _context: &EdrContext,
        config: ProviderConfig,
        logger_config: LoggerConfig,
        #[napi(ts_arg_type = "(event: SubscriptionEvent) => void")] subscriber_callback: JsFunction,
    ) -> napi::Result<JsObject> {
        let config = edr_provider::ProviderConfig::try_from(config)?;
        let runtime = runtime::Handle::current();

        let id = Uuid::new_v4();
        if let Some(scenario_dir) = scenario_directory(&id) {
            std::fs::create_dir_all(&scenario_dir)?;
            let config = ScenarioConfig {
                provider_config: &config,
                logger_enabled: logger_config.enable,
            };
            // Save provider config to scenario dir
            let config_path = scenario_dir.join("config.json");
            std::fs::write(config_path, serde_json::to_string_pretty(&config)?)?;
        }

        let logger = Box::new(Logger::new(&env, logger_config)?);
        let subscriber_callback = SubscriberCallback::new(&env, subscriber_callback)?;
        let subscriber_callback = Box::new(move |event| subscriber_callback.call(event));

        let (deferred, promise) = env.create_deferred()?;
        runtime.clone().spawn_blocking(move || {
            let result = edr_provider::Provider::new(runtime, logger, subscriber_callback, config)
                .map_or_else(
                    |error| Err(napi::Error::new(Status::GenericFailure, error.to_string())),
                    |provider| {
                        Ok(Provider {
                            provider: Arc::new(provider),
                            id,
                            request_counter: AtomicUsize::new(0),
                        })
                    },
                );

            deferred.resolve(|_env| result);
        });

        Ok(promise)
    }

    #[doc = "Handles a JSON-RPC request and returns a JSON-RPC response."]
    #[napi]
    pub async fn handle_request(&self, json_request: String) -> napi::Result<Response> {
        let provider = self.provider.clone();
        let request = match serde_json::from_str(&json_request) {
            Ok(request) => request,
            Err(error) => {
                let message = error.to_string();
                let reason = InvalidRequestReason::new(&json_request, &message);

                // HACK: We need to log failed deserialization attempts when they concern input
                // validation.
                if let Some((method_name, provider_error)) = reason.provider_error() {
                    // Ignore potential failure of logging, as returning the original error is more
                    // important
                    let _result = runtime::Handle::current()
                        .spawn_blocking(move || {
                            provider.log_failed_deserialization(&method_name, &provider_error)
                        })
                        .await
                        .map_err(|error| {
                            napi::Error::new(Status::GenericFailure, error.to_string())
                        })?;
                }

                let data = serde_json::from_str(&json_request).ok();
                let response = jsonrpc::ResponseData::<()>::Error {
                    error: jsonrpc::Error {
                        code: reason.error_code(),
                        message: reason.error_message(),
                        data,
                    },
                };

                return serde_json::to_string(&response)
                    .map_err(|error| {
                        napi::Error::new(
                            Status::InvalidArg,
                            format!("Invalid JSON `{json_request}` due to: {error}"),
                        )
                    })
                    .map(|json_response| Response {
                        json: json_response,
                        trace: None,
                    });
            }
        };

        if let Some(scenario_dir) = scenario_directory(&self.id) {
            let count = self
                .request_counter
                .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            let name = match &request {
                ProviderRequest::Single(r) => r.method_name().into(),
                ProviderRequest::Batch(reqs) => format!("batch_request_len_{}", reqs.len()),
            };
            let request_path = scenario_dir.join(format!("{count:05}_{name}.json"));
            std::fs::write(request_path, serde_json::to_string_pretty(&request)?)?;
        }

        let response = runtime::Handle::current()
            .spawn_blocking(move || provider.handle_request(request))
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        let trace = if let Err(edr_provider::ProviderError::TransactionFailed(failure)) = &response
        {
            if matches!(
                failure.reason,
                edr_provider::TransactionFailureReason::OutOfGas(_)
            ) {
                None
            } else {
                Some(Arc::new(failure.trace.clone()))
            }
        } else {
            None
        };

        let response = jsonrpc::ResponseData::from(response);

        serde_json::to_string(&response)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
            .map(|json_response| Response {
                json: json_response,
                trace,
            })
    }
}

fn scenario_directory(id: &Uuid) -> Option<PathBuf> {
    let scenario_dir = std::path::PathBuf::from(std::env::var(SCENARIO_DIR_ENV).ok()?);
    Some(scenario_dir.join(id.to_string()))
}

#[derive(Clone, Debug, Serialize)]
struct ScenarioConfig<'a> {
    provider_config: &'a edr_provider::ProviderConfig,
    logger_enabled: bool,
}

#[napi]
pub struct Response {
    json: String,
    /// When a transaction fails to execute, the provider returns a trace of the
    /// transaction.
    trace: Option<Arc<edr_evm::trace::Trace>>,
}

#[napi]
impl Response {
    #[napi(getter)]
    pub fn json(&self) -> String {
        self.json.clone()
    }

    #[napi(getter)]
    pub fn trace(&self) -> Option<RawTrace> {
        self.trace
            .as_ref()
            .map(|trace| RawTrace::new(trace.clone()))
    }
}
