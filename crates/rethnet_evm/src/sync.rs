mod client;

use anyhow::anyhow;
use bytes::Bytes;
use primitive_types::{H160, H256, U256};
use revm::{AccountInfo, Bytecode, Database, ExecutionResult, TxEnv, EVM};
use tokio::sync::{mpsc::UnboundedReceiver, oneshot};

use crate::{DatabaseDebug, LayeredDatabase, RethnetLayer, State};

pub use self::client::Client;

#[derive(Debug)]
pub enum Request {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<anyhow::Result<Option<AccountInfo>>>,
    },
    CreateCheckpoint {
        sender: oneshot::Sender<usize>,
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
        sender: oneshot::Sender<()>,
    },
    InsertBlock {
        block_number: U256,
        block_hash: H256,
        sender: oneshot::Sender<()>,
    },
    RevertToCheckpoint {
        checkpoint_id: usize,
        sender: oneshot::Sender<()>,
    },
    SetAccountBalance {
        address: H160,
        balance: U256,
        sender: oneshot::Sender<()>,
    },
    SetAccountCode {
        address: H160,
        bytes: Bytes,
        sender: oneshot::Sender<()>,
    },
    SetAccountNonce {
        address: H160,
        nonce: u64,
        sender: oneshot::Sender<()>,
    },
    SetAccountStorageSlot {
        address: H160,
        index: U256,
        value: U256,
        sender: oneshot::Sender<()>,
    },
}

pub struct Rethnet {
    evm: EVM<LayeredDatabase<RethnetLayer>>,
    request_receiver: UnboundedReceiver<Request>,
}

impl Rethnet {
    pub fn new(
        request_receiver: UnboundedReceiver<Request>,
        db: LayeredDatabase<RethnetLayer>,
    ) -> Self {
        let mut evm = EVM::new();
        evm.database(db);

        Self {
            evm,
            request_receiver,
        }
    }

    pub async fn run(
        request_receiver: UnboundedReceiver<Request>,
        db: LayeredDatabase<RethnetLayer>,
    ) -> anyhow::Result<()> {
        let mut rethnet = Rethnet::new(request_receiver, db);

        rethnet.event_loop().await
    }

    async fn event_loop(&mut self) -> anyhow::Result<()> {
        while let Some(request) = self.request_receiver.recv().await {
            let sent_response = match request {
                Request::AccountByAddress { address, sender } => {
                    sender.send(self.evm.db().unwrap().basic(address)).is_ok()
                }
                Request::CreateCheckpoint { sender } => sender
                    .send(self.evm.db().unwrap().add_layer_default().0 - 1)
                    .is_ok(),
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
                } => {
                    self.evm
                        .db()
                        .unwrap()
                        .insert_account(&address, account_info);
                    sender.send(()).is_ok()
                }
                Request::InsertBlock {
                    block_number,
                    block_hash,
                    sender,
                } => {
                    self.evm
                        .db()
                        .unwrap()
                        .insert_block(block_number, block_hash);
                    sender.send(()).is_ok()
                }
                Request::RevertToCheckpoint {
                    checkpoint_id,
                    sender,
                } => {
                    self.evm.db().unwrap().revert_to_layer(checkpoint_id);
                    sender.send(()).is_ok()
                }
                Request::SetAccountBalance {
                    address,
                    balance,
                    sender,
                } => {
                    self.evm.db().unwrap().account_info_mut(&address).balance = balance;
                    sender.send(()).is_ok()
                }
                Request::SetAccountCode {
                    address,
                    bytes,
                    sender,
                } => {
                    self.evm.db().unwrap().account_info_mut(&address).code =
                        Some(Bytecode::new_raw(bytes));
                    sender.send(()).is_ok()
                }
                Request::SetAccountNonce {
                    address,
                    nonce,
                    sender,
                } => {
                    self.evm.db().unwrap().account_info_mut(&address).nonce = nonce;
                    sender.send(()).is_ok()
                }
                Request::SetAccountStorageSlot {
                    address,
                    index,
                    value,
                    sender,
                } => {
                    self.evm
                        .db()
                        .unwrap()
                        .set_storage_slot_at_layer(address, index, value);

                    sender.send(()).is_ok()
                }
            };

            if !sent_response {
                return Err(anyhow!("Failed to send response"));
            }
        }
        Ok(())
    }
}
