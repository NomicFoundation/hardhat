use bytes::Bytes;
use hashbrown::HashMap;
use primitive_types::{H160, H256, U256};
use revm::{AccountInfo, Database, DatabaseCommit, ExecutionResult, TxEnv};
use tokio::sync::{
    mpsc::{unbounded_channel, UnboundedSender},
    oneshot,
};

use crate::{DatabaseDebug, LayeredDatabase, RethnetLayer, State};

use super::{Request, Rethnet};

pub struct Client {
    request_sender: UnboundedSender<Request>,
}

impl Client {
    /// Constructs a `Rethnet` client with the provided database.
    pub fn with_db<D>(db: D) -> Self
    where
        D: Database<Error = anyhow::Error>
            + DatabaseCommit
            + DatabaseDebug<Error = anyhow::Error>
            + Send
            + 'static,
    {
        let (request_sender, request_receiver) = unbounded_channel();

        tokio::spawn(Rethnet::run(request_receiver, db));

        Self { request_sender }
    }

    /// Constructs a `Rethnet` client with the provided genesis accounts.
    pub fn with_genesis_accounts(genesis_accounts: HashMap<H160, AccountInfo>) -> Self {
        let mut db =
            LayeredDatabase::with_layer(RethnetLayer::with_genesis_accounts(genesis_accounts));
        db.add_layer_default();

        Self::with_db(db)
    }

    /// Runs a transaction with committing the state.
    pub async fn dry_run(&self, transaction: TxEnv) -> (ExecutionResult, State) {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::DryRun {
                transaction,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Runs a transaction, committing the state in the process.
    pub async fn run(&self, transaction: TxEnv) -> ExecutionResult {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Run {
                transaction,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Guarantees that a transaction will succeed.
    pub async fn guarantee_transaction(&self, transaction: TxEnv) -> anyhow::Result<()> {
        let total_gas =
            U256::from(transaction.gas_limit) * transaction.gas_price + transaction.value;

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
            .send(Request::Checkpoint { sender })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    pub async fn revert(&self) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Revert { sender })
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
            .send(Request::AccountByAddress { address, sender })
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
            .send(Request::InsertAccount {
                address,
                account_info,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Inserts the specified block number and hash into the state.
    pub async fn insert_block(&self, block_number: U256, block_hash: H256) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::InsertBlock {
                block_number,
                block_hash,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account balance at the specified address to the provided value.
    pub async fn set_account_balance(&self, address: H160, balance: U256) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountBalance {
                address,
                balance,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account code at the specified address to the provided value.
    pub async fn set_account_code(&self, address: H160, code: Bytes) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountCode {
                address,
                bytes: code,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }

    /// Sets the account nonce at the specified address to the provided value.
    pub async fn set_account_nonce(&self, address: H160, nonce: u64) -> anyhow::Result<()> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountNonce {
                address,
                nonce,
                sender,
            })
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
            .send(Request::SetAccountStorageSlot {
                address,
                index,
                value,
                sender,
            })
            .expect("Failed to send request");

        receiver.await.expect("Rethnet unexpectedly crashed")
    }
}
