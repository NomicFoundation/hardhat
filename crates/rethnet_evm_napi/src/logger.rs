use once_cell::sync::OnceCell;
use tracing_subscriber::{prelude::*, EnvFilter, Registry};

struct Logger {
    #[cfg(feature = "tracing")]
    _guard: tracing_flame::FlushGuard<std::io::BufWriter<std::fs::File>>,
}

unsafe impl Sync for Logger {}

static LOGGER: OnceCell<Logger> = OnceCell::new();

pub fn enable_logging() {
    let _logger = LOGGER.get_or_init(|| {
        let fmt_layer = tracing_subscriber::fmt::layer()
            .with_file(true)
            .with_line_number(true)
            .with_thread_ids(true)
            .with_target(false)
            .with_level(true)
            .with_filter(EnvFilter::from_default_env());

        #[cfg(feature = "tracing")]
        let (flame_layer, _guard) = tracing_flame::FlameLayer::with_file("tracing.folded").unwrap();

        let subscriber = Registry::default().with(fmt_layer);

        #[cfg(feature = "tracing")]
        let subscriber = subscriber.with(flame_layer);

        tracing::subscriber::set_global_default(subscriber)
            .expect("Could not set global default tracing subscriber");

        Logger {
            #[cfg(feature = "tracing")]
            _guard,
        }
    });
}
