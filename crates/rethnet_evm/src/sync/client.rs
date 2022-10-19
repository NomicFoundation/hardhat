use std::future::Future;

use bytes::Bytes;
use primitive_types::{H160, H256, U256};
use revm::{AccountInfo, BlockEnv, CfgEnv, Database, DatabaseCommit, ExecutionResult, TxEnv};
use tokio::{
    runtime::{Builder, Runtime},
    sync::{
        mpsc::{unbounded_channel, UnboundedSender},
        oneshot,
    },
    task::JoinHandle,
};

use crate::{DatabaseDebug, State};

use super::{DatabaseMutRequest, DatabaseRequest, DebugRequest, Request, Rethnet};

pub struct Client {
    request_sender: UnboundedSender<Request>,
    rethnet_handle: Option<JoinHandle<anyhow::Result<()>>>,
    runtime: Runtime,
}

impl Client {
    fn new<F>(request_sender: UnboundedSender<Request>, future: F) -> anyhow::Result<Self>
    where
        F: Future<Output = anyhow::Result<()>> + Send + 'static,
    {
        let runtime = Builder::new_multi_thread().build()?;
        let rethnet_handle = Some(runtime.spawn(future));

        Ok(Self {
            request_sender,
            rethnet_handle,
            runtime,
        })
    }
    /// Constructs [`Rethnet`] with the provided database and runs it asynchronously.
    pub fn with_db<D>(db: D) -> anyhow::Result<Self>
    where
        D: Database<Error = anyhow::Error> + Send + 'static,
    {
        let (request_sender, request_receiver) = unbounded_channel();

        Self::new(request_sender, async {
            Rethnet::new(request_receiver, db).run().await
        })
    }

    /// Constructs [`Rethnet`] with the provided database and runs it asynchronously.
    pub fn with_db_debug<D>(db: D) -> anyhow::Result<Self>
    where
        D: Database<Error = anyhow::Error> + DatabaseDebug<Error = anyhow::Error> + Send + 'static,
    {
        let (request_sender, request_receiver) = unbounded_channel();

        Self::new(request_sender, async {
            Rethnet::new(request_receiver, db).run_debug().await
        })
    }

    /// Constructs [`Rethnet`] with the provided database and runs it asynchronously.
    pub fn with_db_mut<D>(db: D) -> anyhow::Result<Self>
    where
        D: Database<Error = anyhow::Error> + DatabaseCommit + Send + 'static,
    {
        let (request_sender, request_receiver) = unbounded_channel();

        Self::new(request_sender, async {
            Rethnet::new(request_receiver, db).run_mut().await
        })
    }

    /// Constructs [`Rethnet`] with the provided database and runs it asynchronously.
    pub fn with_db_mut_debug<D>(db: D) -> anyhow::Result<Self>
    where
        D: Database<Error = anyhow::Error>
            + DatabaseCommit
            + DatabaseDebug<Error = anyhow::Error>
            + Send
            + 'static,
    {
        let (request_sender, request_receiver) = unbounded_channel();

        Self::new(request_sender, async {
            Rethnet::new(request_receiver, db).run_mut_debug().await
        })
    }

    /// Runs a transaction with committing the state.
    pub async fn dry_run(
        &self,
        transaction: TxEnv,
        block: BlockEnv,
        cfg: CfgEnv,
    ) -> (ExecutionResult, State) {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Database(DatabaseRequest::DryRun {
                transaction,
                block,
                cfg,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Runs a transaction, committing the state in the process.
    pub async fn run(&self, transaction: TxEnv) -> ExecutionResult {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::DatabaseMut(DatabaseMutRequest::Run {
                transaction,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Guarantees that a transaction will succeed.
    pub async fn guarantee_transaction(&self, transaction: TxEnv) -> anyhow::Result<()> {
        let total_gas = U256::from(transaction.gas_limit)
            * (transaction.gas_price + transaction.gas_priority_fee.unwrap_or_else(U256::zero))
            + transaction.value;

        let caller = transaction.caller;

        let account_info =
            if let Some(account_info) = self.get_account_by_address(caller).await.unwrap_or(None) {
                account_info
            } else {
                let account_info = AccountInfo::default();
                self.insert_account(caller, account_info.clone()).await?;
                account_info
            };

        if account_info.balance < total_gas {
            self.set_account_balance(caller, total_gas).await?;
        }

        Ok(())
    }

    /// Creates a state checkpoint that can be reverted to using [`revert`].
    pub async fn checkpoint(&self) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::Checkpoint { sender }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    pub async fn revert(&self) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::Revert { sender }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Retrieves the account corresponding to the address, if it exists.
    pub async fn get_account_by_address(
        &self,
        address: H160,
    ) -> anyhow::Result<Option<AccountInfo>> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Database(DatabaseRequest::AccountByAddress {
                address,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Inserts the specified account into the state.
    pub async fn insert_account(
        &self,
        address: H160,
        account_info: AccountInfo,
    ) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::InsertAccount {
                address,
                account_info,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Inserts the specified block number and hash into the state.
    pub async fn insert_block(&self, block_number: U256, block_hash: H256) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::InsertBlock {
                block_number,
                block_hash,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account balance at the specified address to the provided value.
    pub async fn set_account_balance(&self, address: H160, balance: U256) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::SetAccountBalance {
                address,
                balance,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account code at the specified address to the provided value.
    pub async fn set_account_code(&self, address: H160, code: Bytes) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::SetAccountCode {
                address,
                bytes: code,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account nonce at the specified address to the provided value.
    pub async fn set_account_nonce(&self, address: H160, nonce: u64) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::SetAccountNonce {
                address,
                nonce,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the storage slot at the specified address and index to the provided value.
    pub async fn set_account_storage_slot(
        &self,
        address: H160,
        index: U256,
        value: U256,
    ) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Debug(DebugRequest::SetAccountStorageSlot {
                address,
                index,
                value,
                sender,
            }))
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }
}

impl Drop for Client {
    fn drop(&mut self) {
        if let Some(handle) = self.rethnet_handle.take() {
            self.request_sender
                .send(Request::Terminate)
                .expect("Failed to send request");

            self.runtime
                .block_on(handle)
                .unwrap()
                .expect("Rethnet closed unexpectedly");
        }
    }
}
