mod config;

use std::sync::Arc;

use edr_eth::{remote::jsonrpc, Bytes};
use edr_provider::InspectorCallbacks;
use napi::{tokio::runtime, Env, JsFunction, JsObject, NapiRaw, Status};
use napi_derive::napi;

use self::config::ProviderConfig;
use crate::threadsafe_function::{
    ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode,
};

/// A JSON-RPC provider for Ethereum.
#[napi]
pub struct Provider {
    provider: Arc<edr_provider::Provider>,
}

#[napi]
impl Provider {
    #[doc = "Constructs a new provider with the provided configuration."]
    #[napi(ts_return_type = "Promise<Provider>")]
    pub fn with_config(
        env: Env,
        config: ProviderConfig,
        #[napi(ts_arg_type = "(message: Buffer) => void")] console_log_callback: JsFunction,
    ) -> napi::Result<JsObject> {
        let config = edr_provider::ProviderConfig::try_from(config)?;
        let runtime = runtime::Handle::current();

        let callbacks = Box::new(InspectorCallback::new(&env, console_log_callback)?);

        let (deferred, promise) = env.create_deferred()?;
        runtime.clone().spawn(async move {
            let result = edr_provider::Provider::new(&runtime, callbacks, &config)
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

#[derive(Debug)]
struct InspectorCallback {
    console_log_callback: ThreadsafeFunction<Bytes>,
}

impl InspectorCallback {
    fn new(env: &Env, console_log_callback_js: JsFunction) -> napi::Result<Self> {
        let console_log_callback = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { console_log_callback_js.raw() },
            0,
            |ctx: ThreadSafeCallContext<Bytes>| {
                let call_input = ctx
                    .env
                    .create_buffer_with_data(ctx.value.to_vec())?
                    .into_raw();
                ctx.callback.call(None, &[call_input])?;
                Ok(())
            },
        )?;

        Ok(Self {
            console_log_callback,
        })
    }
}

impl InspectorCallbacks for InspectorCallback {
    fn console(&self, call_input: Bytes) {
        // This is blocking because it's important that the console log messages are
        // passed on in the order they're received.
        self.console_log_callback
            .call(call_input, ThreadsafeFunctionCallMode::Blocking);
    }
}
