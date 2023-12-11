mod config;

use std::sync::Arc;

use edr_eth::remote::jsonrpc;
use napi::{tokio::runtime, Env, JsObject, Status};
use napi_derive::napi;

use self::config::ProviderConfig;

/// A JSON-RPC provider for Ethereum.
#[napi]
pub struct Provider {
    provider: Arc<edr_provider::Provider>,
}

#[napi]
impl Provider {
    #[doc = "Constructs a new provider with the provided configuration."]
    #[napi(ts_return_type = "Promise<Provider>")]
    pub fn with_config(env: Env, config: ProviderConfig) -> napi::Result<JsObject> {
        let config = edr_provider::ProviderConfig::try_from(config)?;
        let runtime = runtime::Handle::current();

        let (deferred, promise) = env.create_deferred()?;
        runtime.clone().spawn(async move {
            let result = edr_provider::Provider::new(runtime, config)
                .await
                .map_or_else(
                    |error| Err(napi::Error::new(Status::GenericFailure, error.to_string())),
                    |provider| {
                        Ok(Provider {
                            provider: Arc::new(provider),
                        })
                    },
                );

            deferred.resolve(|_env| result);
        });

        Ok(promise)
    }

    #[doc = "Handles a JSON-RPC request and returns a JSON-RPC response."]
    #[napi]
    pub async fn handle_request(&self, json_request: String) -> napi::Result<String> {
        let request = serde_json::from_str(&json_request).map_err(|error| {
            napi::Error::new(
                Status::InvalidArg,
                format!("Invalid JSON `{json_request}` due to: {error}"),
            )
        })?;

        let provider = self.provider.clone();
        let response = runtime::Handle::current()
            .spawn_blocking(move || provider.handle_request(request))
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        let response = jsonrpc::ResponseData::from(response);

        serde_json::to_string(&response)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }
}
