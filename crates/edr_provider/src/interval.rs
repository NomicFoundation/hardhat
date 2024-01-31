use core::fmt::Debug;
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::{runtime, sync::oneshot, task::JoinHandle};

use crate::{data::ProviderData, IntervalConfig, ProviderError};

/// Type for interval mining on a separate thread.
pub struct IntervalMiner<LoggerErrorT: Debug> {
    inner: Option<Inner<LoggerErrorT>>,
    runtime: runtime::Handle,
}

/// Inner type for interval mining on a separate thread, required for
/// implementation of `Drop`.
struct Inner<LoggerErrorT: Debug> {
    cancellation_sender: oneshot::Sender<()>,
    background_task: JoinHandle<Result<(), ProviderError<LoggerErrorT>>>,
}

impl<LoggerErrorT: Debug + Send + Sync + 'static> IntervalMiner<LoggerErrorT> {
    pub fn new(
        runtime: runtime::Handle,
        config: IntervalConfig,
        data: Arc<Mutex<ProviderData<LoggerErrorT>>>,
    ) -> Self {
        let (cancellation_sender, mut cancellation_receiver) = oneshot::channel();
        let background_task = runtime.spawn(async move {
            loop {
                let delay = config.generate_interval();

                tokio::select! {
                    _ = &mut cancellation_receiver => return Ok(()),
                    _ = tokio::time::sleep(std::time::Duration::from_millis(delay)) => {
                        let data = data.clone();

                        runtime::Handle::current().spawn_blocking(move ||{
                            let mut data = data.lock();
                            if let Err(error) = data.interval_mine() {
                                log::error!("Unexpected error while performing interval mining: {error}");
                                return Err(error);
                            }

                            Ok(())
                        }).await.expect("Failed to join interval mining task")
                    },
                }?;
            }
        });

        Self {
            inner: Some(Inner {
                cancellation_sender,
                background_task,
            }),
            runtime,
        }
    }
}

impl<LoggerErrorT: Debug> Drop for IntervalMiner<LoggerErrorT> {
    fn drop(&mut self) {
        if let Some(Inner {
            cancellation_sender,
            background_task: task,
        }) = self.inner.take()
        {
            cancellation_sender
                .send(())
                .expect("Failed to send cancellation signal");

            let _result = self
                .runtime
                .block_on(task)
                .expect("Failed to join interval mininig task");
        }
    }
}
