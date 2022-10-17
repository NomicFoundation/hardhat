mod client;

use anyhow::anyhow;
use bytes::Bytes;
use primitive_types::{H160, H256, U256};
use revm::{AccountInfo, Bytecode, Database, DatabaseCommit, ExecutionResult, TxEnv, EVM};
use tokio::sync::{mpsc::UnboundedReceiver, oneshot};

use crate::{DatabaseDebug, State};

pub use self::client::Client;

#[derive(Debug)]
pub enum Request {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<anyhow::Result<Option<AccountInfo>>>,
    },
    Checkpoint {
        sender: oneshot::Sender<anyhow::Result<()>>,
    },
    DryRun {
        transaction: TxEnv,
        sender: oneshot::Sender<(ExecutionResult, State)>,
    },
    Run {
        transaction: TxEnv,
        sender: oneshot::Sender<ExecutionResult>,
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

pub struct Rethnet<D>
where
    D: Database<Error = anyhow::Error> + DatabaseCommit + DatabaseDebug<Error = anyhow::Error>,
{
    evm: EVM<D>,
    request_receiver: UnboundedReceiver<Request>,
}

impl<D> Rethnet<D>
where
    D: Database<Error = anyhow::Error> + DatabaseCommit + DatabaseDebug<Error = anyhow::Error>,
{
    pub fn new(request_receiver: UnboundedReceiver<Request>, db: D) -> Self {
        let mut evm = EVM::new();
        evm.database(db);

        Self {
            evm,
            request_receiver,
        }
    }

    pub async fn run(request_receiver: UnboundedReceiver<Request>, db: D) -> anyhow::Result<()> {
        let mut rethnet = Rethnet::new(request_receiver, db);

        rethnet.event_loop().await
    }

    async fn event_loop(&mut self) -> anyhow::Result<()> {
        while let Some(request) = self.request_receiver.recv().await {
            let sent_response = match request {
                Request::AccountByAddress { address, sender } => {
                    sender.send(self.evm.db().unwrap().basic(address)).is_ok()
                }
                Request::Checkpoint { sender } => {
                    sender.send(self.evm.db().unwrap().checkpoint()).is_ok()
                }
                Request::DryRun {
                    transaction,
                    sender,
                } => {
                    self.evm.env.tx = transaction;
                    sender.send(self.evm.transact()).is_ok()
                }
                Request::Run {
                    transaction,
                    sender,
                } => {
                    self.evm.env.tx = transaction;
                    sender.send(self.evm.transact_commit()).is_ok()
                }
                Request::InsertAccount {
                    address,
                    account_info,
                    sender,
                } => sender
                    .send(self.evm.db().unwrap().insert_account(address, account_info))
                    .is_ok(),
                Request::InsertBlock {
                    block_number,
                    block_hash,
                    sender,
                } => sender
                    .send(
                        self.evm
                            .db()
                            .unwrap()
                            .insert_block(block_number, block_hash),
                    )
                    .is_ok(),
                Request::Revert { sender } => sender.send(self.evm.db().unwrap().revert()).is_ok(),
                Request::SetAccountBalance {
                    address,
                    balance,
                    sender,
                } => sender
                    .send(self.evm.db().unwrap().set_account_balance(address, balance))
                    .is_ok(),
                Request::SetAccountCode {
                    address,
                    bytes,
                    sender,
                } => sender
                    .send(
                        self.evm
                            .db()
                            .unwrap()
                            .set_account_code(address, Bytecode::new_raw(bytes)),
                    )
                    .is_ok(),
                Request::SetAccountNonce {
                    address,
                    nonce,
                    sender,
                } => sender
                    .send(self.evm.db().unwrap().set_account_nonce(address, nonce))
                    .is_ok(),
                Request::SetAccountStorageSlot {
                    address,
                    index,
                    value,
                    sender,
                } => sender
                    .send(
                        self.evm
                            .db()
                            .unwrap()
                            .set_account_storage_slot(address, index, value),
                    )
                    .is_ok(),
            };

            if !sent_response {
                return Err(anyhow!("Failed to send response"));
            }
        }
        Ok(())
    }
}
