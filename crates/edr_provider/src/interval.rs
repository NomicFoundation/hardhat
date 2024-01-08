use std::sync::Arc;

use parking_lot::Mutex;
use tokio::{runtime, sync::oneshot, task::JoinHandle};

use crate::{data::ProviderData, IntervalConfig, ProviderError};

/// Type for interval mining on a separate thread.
pub struct IntervalMiner {
    inner: Option<Inner>,
    runtime: runtime::Handle,
}

/// Inner type for interval mining on a separate thread, required for
/// implementation of `Drop`.
struct Inner {
    cancellation_sender: oneshot::Sender<()>,
    background_task: JoinHandle<Result<(), ProviderError>>,
}

impl IntervalMiner {
    pub fn new(
        runtime: runtime::Handle,
        config: IntervalConfig,
        data: Arc<Mutex<ProviderData>>,
    ) -> Self {
        let (cancellation_sender, mut cancellation_receiver) = oneshot::channel();
        let background_task = runtime.spawn(async move {
            loop {
                let delay = config.generate_interval();

                tokio::select! {
                    _ = &mut cancellation_receiver => return Ok(()),
                    _ = tokio::time::sleep(std::time::Duration::from_secs(delay)) => {
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

impl Drop for IntervalMiner {
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
