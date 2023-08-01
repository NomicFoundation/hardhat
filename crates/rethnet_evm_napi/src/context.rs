use std::{io, ops::Deref, sync::Arc};

use napi::{
    bindgen_prelude::Buffer,
    tokio::runtime::{Builder, Runtime},
    Status,
};
use napi_derive::napi;
use parking_lot::Mutex;
use rethnet_eth::B256;
use rethnet_evm::RandomHashGenerator;
use tracing_subscriber::{prelude::*, EnvFilter, Registry};

#[napi]
#[derive(Debug)]
pub struct RethnetContext {
    inner: Arc<Context>,
}

impl Deref for RethnetContext {
    type Target = Arc<Context>;

    fn deref(&self) -> &Self::Target {
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

    /// Overwrites the next value generated with the provided seed.
    #[napi]
    pub fn set_hash_generator_seed(&self, seed: Buffer) {
        let seed = B256::from_slice(&seed);

        self.inner.hash_generator.lock().set_next(seed);
    }
}

#[derive(Debug)]
pub struct Context {
    runtime: Arc<Runtime>,
    hash_generator: Arc<Mutex<RandomHashGenerator>>,
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

        let subscriber = Registry::default().with(fmt_layer);

        #[cfg(feature = "tracing")]
        let (flame_layer, guard) = {
            let (flame_layer, guard) =
                tracing_flame::FlameLayer::with_file("tracing.folded").unwrap();

            let flame_layer = flame_layer.with_empty_samples(false);
            (flame_layer, guard)
        };

        #[cfg(feature = "tracing")]
        let subscriber = subscriber.with(flame_layer);

        tracing::subscriber::set_global_default(subscriber)
            .expect("Could not set global default tracing subscriber");

        let runtime = Builder::new_multi_thread()
            .enable_io()
            .enable_time()
            .build()?;

        let hash_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("seed")));

        Ok(Self {
            runtime: Arc::new(runtime),
            hash_generator,
            #[cfg(feature = "tracing")]
            _tracing_write_guard: guard,
        })
    }

    /// Retrieves the context's hash generator.
    pub fn hash_generator(&self) -> &Arc<Mutex<RandomHashGenerator>> {
        &self.hash_generator
    }

    /// Retrieves the context's runtime.
    pub fn runtime(&self) -> &Arc<Runtime> {
        &self.runtime
    }
}
