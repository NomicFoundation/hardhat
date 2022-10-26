//! Synchronisation types for the Rethnet EVM.

mod client;
pub(self) mod request;

use anyhow::bail;

use revm::{CfgEnv, Database, DatabaseCommit, EVM};
use tokio::sync::mpsc::UnboundedReceiver;

use crate::DatabaseDebug;

pub use self::client::Client;
use self::request::Request;

/// The asynchronous Rethnet runtime.
///
/// Depending on the traits of the database passed to [`new`], [`Rethnet`] will support
/// running with`Request::Debug` and `Request::DatabaseMut`.
pub struct Rethnet<D> {
    evm: EVM<D>,
    request_receiver: UnboundedReceiver<Request>,
}

impl<D> Rethnet<D> {
    /// Creates a new [`Rethnet`] instance.
    pub fn new(request_receiver: UnboundedReceiver<Request>, cfg: CfgEnv, db: D) -> Self {
        let mut evm = EVM::new();
        evm.env.cfg = cfg;
        evm.database(db);

        Self {
            evm,
            request_receiver,
        }
    }

    /// Runs [`Rethnet`] immutably.
    pub async fn run(mut self) -> anyhow::Result<()>
    where
        D: Database<Error = anyhow::Error>,
    {
        while let Some(request) = self.request_receiver.recv().await {
            match request {
                Request::Debug(_) => {
                    bail!("Rethnet client does not support `DatabaseDebug`.")
                }
                Request::Database(request) => request.handle_event(&mut self.evm)?,
                Request::DatabaseMut(_) => {
                    bail!("Rethnet client does not support `DatabaseCommit`.")
                }
                Request::Terminate => return Ok(()),
            }
        }

        Ok(())
    }

    /// Runs [`Rethnet`] immutably with debug capability.
    pub async fn run_debug(mut self) -> anyhow::Result<()>
    where
        D: Database<Error = anyhow::Error> + DatabaseDebug<Error = anyhow::Error>,
    {
        while let Some(request) = self.request_receiver.recv().await {
            match request {
                Request::Debug(request) => request.handle_event(&mut self.evm)?,
                Request::Database(request) => request.handle_event(&mut self.evm)?,
                Request::DatabaseMut(_) => {
                    bail!("Rethnet client does not support `DatabaseCommit`.")
                }
                Request::Terminate => return Ok(()),
            }
        }

        Ok(())
    }

    /// Runs [`Rethnet`] mutably.
    pub async fn run_mut(mut self) -> anyhow::Result<()>
    where
        D: Database<Error = anyhow::Error> + DatabaseCommit,
    {
        while let Some(request) = self.request_receiver.recv().await {
            match request {
                Request::Debug(_) => {
                    bail!("Rethnet client does not support `DatabaseDebug`.")
                }
                Request::Database(request) => request.handle_event(&mut self.evm)?,
                Request::DatabaseMut(request) => request.handle_event(&mut self.evm)?,
                Request::Terminate => return Ok(()),
            }
        }

        Ok(())
    }

    /// Runs [`Rethnet`] mutably with debug capability.
    pub async fn run_mut_debug(mut self) -> anyhow::Result<()>
    where
        D: Database<Error = anyhow::Error> + DatabaseCommit + DatabaseDebug<Error = anyhow::Error>,
    {
        while let Some(request) = self.request_receiver.recv().await {
            match request {
                Request::Debug(request) => request.handle_event(&mut self.evm)?,
                Request::Database(request) => request.handle_event(&mut self.evm)?,
                Request::DatabaseMut(request) => request.handle_event(&mut self.evm)?,
                Request::Terminate => return Ok(()),
            }
        }

        Ok(())
    }
}
