use std::{io, sync::Arc};

use napi::{
    tokio::runtime::{Builder, Runtime},
    Status,
};
use napi_derive::napi;
use tracing_subscriber::{prelude::*, EnvFilter, Registry};

#[napi]
#[derive(Debug)]
pub struct RethnetContext {
    inner: Arc<Context>,
}

impl RethnetContext {
    /// Provides immutable access to the inner implementation.
    pub(crate) fn as_inner(&self) -> &Arc<Context> {
        &self.inner
    }
}

#[napi]
impl RethnetContext {
    /// Creates a new [`RethnetContext`] instance. Should only be called once!
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        let context =
            Context::new().map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self {
            inner: Arc::new(context),
        })
    }
}

#[derive(Debug)]
pub struct Context {
    runtime: Arc<Runtime>,
    #[cfg(feature = "tracing")]
    _tracing_write_guard: tracing_flame::FlushGuard<std::io::BufWriter<std::fs::File>>,
}

impl Context {
    /// Creates a new [`Context`] instance. Should only be called once!
    pub fn new() -> io::Result<Self> {
        let fmt_layer = tracing_subscriber::fmt::layer()
            .with_file(true)
            .with_line_number(true)
            .with_thread_ids(true)
            .with_target(false)
            .with_level(true)
            .with_filter(EnvFilter::from_default_env());

        #[cfg(feature = "tracing")]
        let (flame_layer, guard) = tracing_flame::FlameLayer::with_file("tracing.folded").unwrap();

        let subscriber = Registry::default().with(fmt_layer);

        #[cfg(feature = "tracing")]
        let subscriber = subscriber.with(flame_layer);

        tracing::subscriber::set_global_default(subscriber)
            .expect("Could not set global default tracing subscriber");

        let runtime = Builder::new_multi_thread().build()?;

        Ok(Self {
            runtime: Arc::new(runtime),
            #[cfg(feature = "tracing")]
            _tracing_write_guard: guard,
        })
    }

    /// Retrieves the context's runtime.
    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }
}
