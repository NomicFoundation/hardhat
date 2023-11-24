use std::{
    sync::Arc,
    thread::{self, JoinHandle},
};

use parking_lot::Mutex;
use tokio::sync::oneshot::{self, error::TryRecvError};

use crate::{data::ProviderData, IntervalConfig};

/// Type for interval mining on a separate thread.
pub struct IntervalMiner {
    inner: Option<Inner>,
}

/// Inner type for interval mining on a separate thread, required for
/// implementation of `Drop`.
struct Inner {
    cancellation_sender: oneshot::Sender<()>,
    handle: JoinHandle<()>,
}

impl IntervalMiner {
    pub fn new(config: IntervalConfig, data: Arc<Mutex<ProviderData>>) -> Self {
        let (cancellation_sender, mut cancellation_receiver) = oneshot::channel();
        let handle = thread::spawn(move || loop {
            let delay = config.generate_interval();
            thread::sleep(std::time::Duration::from_secs(delay));

            match cancellation_receiver.try_recv() {
                Ok(_) | Err(TryRecvError::Closed) => return,
                Err(TryRecvError::Empty) => {}
            }

            let mut data = data.lock();
            if let Err(error) = data.interval_mine() {
                log::error!("Unexpected error while performing interval mining: {error}");
                return;
            }
        });

        Self {
            inner: Some(Inner {
                cancellation_sender,
                handle,
            }),
        }
    }
}

impl Drop for IntervalMiner {
    fn drop(&mut self) {
        if let Some(Inner {
            cancellation_sender,
            handle,
        }) = self.inner.take()
        {
            cancellation_sender
                .send(())
                .expect("Failed to send cancellation signal");

            handle.join().expect("Failed to join interval miner thread");
        }
    }
}
