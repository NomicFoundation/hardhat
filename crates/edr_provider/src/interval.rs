use core::fmt::Debug;
use std::sync::Arc;

use tokio::{
    runtime,
    sync::{oneshot, Mutex},
    task::JoinHandle,
    time::Instant,
};

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
            let mut now = Instant::now();
            loop {
                let delay = config.generate_interval();
                let deadline = now + std::time::Duration::from_millis(delay);

                tokio::select! {
                    _ = &mut cancellation_receiver => return Ok(()),
                    _ = tokio::time::sleep_until(deadline) => {
                        tokio::select! {
                            // Check whether the interval miner needs to be destroyed
                            _ = &mut cancellation_receiver => return Ok(()),
                            mut data = data.lock() => {
                                now = Instant::now();

                                if let Err(error) = data.interval_mine() {
                                    log::error!("Unexpected error while performing interval mining: {error}");
                                    return Err(error);
                                }

                                Result::<(), ProviderError<LoggerErrorT>>::Ok(())
                            }
                        }
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

            let _result = tokio::task::block_in_place(move || self.runtime.block_on(task))
                .expect("Failed to join interval mininig task");
        }
    }
}
