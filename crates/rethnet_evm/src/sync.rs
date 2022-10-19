mod client;

use anyhow::bail;
use bytes::Bytes;
use primitive_types::{H160, H256, U256};
use revm::{
    AccountInfo, BlockEnv, Bytecode, CfgEnv, Database, DatabaseCommit, ExecutionResult, TxEnv, EVM,
};
use tokio::sync::{mpsc::UnboundedReceiver, oneshot};

use crate::{inspector::RethnetInspector, DatabaseDebug, State};

pub use self::client::Client;

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum Request {
    Debug(DebugRequest),
    Database(DatabaseRequest),
    DatabaseMut(DatabaseMutRequest),
    Terminate,
}

impl DebugRequest {
    async fn handle_event<D>(self, evm: &mut EVM<D>) -> anyhow::Result<()>
    where
        D: DatabaseDebug<Error = anyhow::Error>,
    {
        let sent_response = match self {
            DebugRequest::Checkpoint { sender } => {
                sender.send(evm.db().unwrap().checkpoint()).is_ok()
            }
            DebugRequest::InsertAccount {
                address,
                account_info,
                sender,
            } => sender
                .send(evm.db().unwrap().insert_account(address, account_info))
                .is_ok(),
            DebugRequest::InsertBlock {
                block_number,
                block_hash,
                sender,
            } => sender
                .send(evm.db().unwrap().insert_block(block_number, block_hash))
                .is_ok(),
            DebugRequest::Revert { sender } => sender.send(evm.db().unwrap().revert()).is_ok(),
            DebugRequest::SetAccountBalance {
                address,
                balance,
                sender,
            } => sender
                .send(evm.db().unwrap().set_account_balance(address, balance))
                .is_ok(),
            DebugRequest::SetAccountCode {
                address,
                bytes,
                sender,
            } => sender
                .send(
                    evm.db()
                        .unwrap()
                        .set_account_code(address, Bytecode::new_raw(bytes)),
                )
                .is_ok(),
            DebugRequest::SetAccountNonce {
                address,
                nonce,
                sender,
            } => sender
                .send(evm.db().unwrap().set_account_nonce(address, nonce))
                .is_ok(),
            DebugRequest::SetAccountStorageSlot {
                address,
                index,
                value,
                sender,
            } => sender
                .send(
                    evm.db()
                        .unwrap()
                        .set_account_storage_slot(address, index, value),
                )
                .is_ok(),
        };

        if !sent_response {
            bail!("Failed to send response");
        }

        Ok(())
    }
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum DatabaseRequest {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<anyhow::Result<Option<AccountInfo>>>,
    },
    DryRun {
        transaction: TxEnv,
        block: BlockEnv,
        cfg: CfgEnv,
        sender: oneshot::Sender<(ExecutionResult, State)>,
    },
}

impl DatabaseRequest {
    async fn handle_event<D>(self, evm: &mut EVM<D>) -> anyhow::Result<()>
    where
        D: Database<Error = anyhow::Error>,
    {
        let sent_response = match self {
            DatabaseRequest::AccountByAddress { address, sender } => {
                sender.send(evm.db().unwrap().basic(address)).is_ok()
            }
            DatabaseRequest::DryRun {
                transaction,
                block,
                cfg,
                sender,
            } => {
                evm.env.tx = transaction;
                evm.env.block = block;
                evm.env.cfg = cfg;
                sender
                    .send(evm.inspect(RethnetInspector::default()))
                    .is_ok()
            }
        };

        if !sent_response {
            bail!("Failed to send response");
        }

        Ok(())
    }
}

#[derive(Debug)]
pub enum DatabaseMutRequest {
    Run {
        transaction: TxEnv,
        sender: oneshot::Sender<ExecutionResult>,
    },
}

impl DatabaseMutRequest {
    async fn handle_event<D>(self, evm: &mut EVM<D>) -> anyhow::Result<()>
    where
        D: Database + DatabaseCommit,
    {
        let sent_response = match self {
            DatabaseMutRequest::Run {
                transaction,
                sender,
            } => {
                evm.env.tx = transaction;
                sender.send(evm.transact_commit()).is_ok()
            }
        };

        if !sent_response {
            bail!("Failed to send response");
        }

        Ok(())
    }
}

#[derive(Debug)]
pub enum DebugRequest {
    Checkpoint {
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    InsertAccount {
        address: H160,
        account_info: AccountInfo,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    InsertBlock {
        block_number: U256,
        block_hash: H256,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    Revert {
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    SetAccountBalance {
        address: H160,
        balance: U256,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    SetAccountCode {
        address: H160,
        bytes: Bytes,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    SetAccountNonce {
        address: H160,
        nonce: u64,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    SetAccountStorageSlot {
        address: H160,
        index: U256,
        value: U256,
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
}

pub struct Rethnet<D> {
    evm: EVM<D>,
    request_receiver: UnboundedReceiver<Request>,
}

impl<D> Rethnet<D> {
    pub fn new(request_receiver: UnboundedReceiver<Request>, db: D) -> Self {
        let mut evm = EVM::new();
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
                Request::Database(request) => request.handle_event(&mut self.evm).await?,
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
                Request::Debug(request) => request.handle_event(&mut self.evm).await?,
                Request::Database(request) => request.handle_event(&mut self.evm).await?,
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
                Request::Database(request) => request.handle_event(&mut self.evm).await?,
                Request::DatabaseMut(request) => request.handle_event(&mut self.evm).await?,
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
                Request::Debug(request) => request.handle_event(&mut self.evm).await?,
                Request::Database(request) => request.handle_event(&mut self.evm).await?,
                Request::DatabaseMut(request) => request.handle_event(&mut self.evm).await?,
                Request::Terminate => return Ok(()),
            }
        }

        Ok(())
    }
}
