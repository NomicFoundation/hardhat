use anyhow::anyhow;
use napi::{
    bindgen_prelude::*,
    tokio::{
        self,
        sync::{
            mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
            oneshot,
        },
    },
};
use napi_derive::napi;
use rethnet_evm::{
    AccountInfo, Bytecode, Bytes, CreateScheme, Database, DatabaseDebug, ExecutionResult,
    LayeredDatabase, RethnetLayer, State, TransactTo, TxEnv, EVM, H160, H256, U256,
};

#[napi(constructor)]
pub struct Account {
    /// Account balance
    #[napi(readonly)]
    pub balance: BigInt,
    /// Account nonce
    #[napi(readonly)]
    pub nonce: BigInt,
    /// 256-bit code hash
    #[napi(readonly)]
    pub code_hash: Buffer,
}

#[napi(object)]
pub struct Transaction {
    /// 160-bit address
    pub from: Buffer,
    pub to: Option<Buffer>,
    pub input: Option<Buffer>,
    pub value: Option<BigInt>,
}

impl From<Transaction> for TxEnv {
    fn from(transaction: Transaction) -> Self {
        let caller = H160::from_slice(&transaction.from);

        let value = transaction.value.map_or(U256::default(), |value| {
            // this will truncate values to u64, but the previous code would
            // fail for small values because value.words had a length of 1
            U256::from(value.get_u64().1)
            // U256(
            //     value
            //         .words
            //         .try_into()
            //         .expect("Block number should contain 4 words."),
            // )
        });

        let data = transaction
            .input
            .map_or(Bytes::default(), |input| Bytes::copy_from_slice(&input));

        let transact_to: TransactTo = if let Some(to) = transaction.to {
            TransactTo::Call(H160::from_slice(&to))
        } else {
            TransactTo::Create(CreateScheme::Create)
        };

        Self {
            transact_to,
            caller,
            data,
            value,
            ..Default::default()
        }
    }
}

#[napi]
pub struct RethnetClient {
    request_sender: UnboundedSender<Request>,
}

#[napi]
impl RethnetClient {
    #[napi(constructor)]
    pub fn new() -> Self {
        let (request_sender, request_receiver) = unbounded_channel();

        tokio::spawn(Rethnet::run(request_receiver));

        Self { request_sender }
    }

    #[napi]
    pub async fn add_block(&self, block_number: BigInt, block_hash: Buffer) -> Result<()> {
        let block_number = U256(
            block_number
                .words
                .try_into()
                .expect("Block number should contain 4 words."),
        );

        let block_hash = H256::from_slice(&block_hash);

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AddBlock {
                block_number,
                block_hash,
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(())
    }

    #[napi]
    pub async fn call(&self, transaction: Transaction) -> Result<serde_json::Value> {
        let transaction = transaction.into();

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::Call {
                transaction,
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        let result = receiver.await.expect("Rethnet unexpectedly crashed");

        serde_json::to_value(result.1)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[napi]
    pub async fn get_account_by_address(&self, address: Buffer) -> Result<Account> {
        let address = H160::from_slice(&address);

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountByAddress { address, sender })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver
            .await
            .expect("Rethnet unexpectedly crashed")?
            .map_or_else(
                || {
                    Err(napi::Error::new(
                        Status::GenericFailure,
                        format!(
                            "Database does not contain account with address: {}.",
                            address,
                        ),
                    ))
                },
                |account_info| {
                    Ok(Account {
                        balance: BigInt {
                            sign_bit: false,
                            words: account_info.balance.0.to_vec(),
                        },
                        nonce: BigInt::from(account_info.nonce),
                        code_hash: Buffer::from(account_info.code_hash.as_bytes()),
                    })
                },
            )
    }

    #[napi]
    pub async fn set_account_balance(&self, address: Buffer, balance: BigInt) -> Result<()> {
        let address = H160::from_slice(&address);

        let balance = U256(
            balance
                .words
                .try_into()
                .expect("Block number should contain 4 words."),
        );

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountBalance {
                address,
                balance,
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(())
    }

    #[napi]
    pub async fn set_account_code(&self, address: Buffer, code: Buffer) -> Result<()> {
        let address = H160::from_slice(&address);

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountCode {
                address,
                bytes: Bytes::copy_from_slice(&code),
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(())
    }

    #[napi]
    pub async fn set_account_nonce(&self, address: Buffer, nonce: BigInt) -> Result<()> {
        let address = H160::from_slice(&address);
        let (sign, nonce, lossless) = nonce.get_u64();
        assert!(!sign && lossless, "Expected nonce to be a u64.");

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountNonce {
                address,
                nonce,
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(())
    }

    #[napi]
    pub async fn set_account_storage_slot(
        &self,
        address: Buffer,
        index: BigInt,
        value: BigInt,
    ) -> Result<()> {
        let address = H160::from_slice(&address);
        let index = U256(
            index
                .words
                .try_into()
                .expect("Block number should contain 4 words."),
        );
        let value = U256(
            value
                .words
                .try_into()
                .expect("Block number should contain 4 words."),
        );
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::SetAccountStorageSlot {
                address,
                index,
                value,
                sender,
            })
            .map_err(|_| anyhow!("Failed to send request"))?;

        receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(())
    }
}

enum Request {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<anyhow::Result<Option<AccountInfo>>>,
    },
    AddBlock {
        block_number: U256,
        block_hash: H256,
        sender: oneshot::Sender<()>,
    },
    Call {
        transaction: TxEnv,
        sender: oneshot::Sender<(ExecutionResult, State)>,
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

struct Rethnet {
    evm: EVM<LayeredDatabase<RethnetLayer>>,
    request_receiver: UnboundedReceiver<Request>,
}

impl Rethnet {
    pub fn new(request_receiver: UnboundedReceiver<Request>) -> Self {
        let mut evm = EVM::new();
        evm.database(LayeredDatabase::default());

        Self {
            evm,
            request_receiver,
        }
    }

    pub async fn run(request_receiver: UnboundedReceiver<Request>) -> anyhow::Result<()> {
        let mut rethnet = Rethnet::new(request_receiver);

        rethnet.event_loop().await
    }

    async fn event_loop(&mut self) -> anyhow::Result<()> {
        while let Some(request) = self.request_receiver.recv().await {
            let sent_response = match request {
                Request::AccountByAddress { address, sender } => {
                    sender.send(self.evm.db().unwrap().basic(address)).is_ok()
                }
                Request::AddBlock {
                    block_number,
                    block_hash,
                    sender,
                } => {
                    self.evm.db().unwrap().add_block(block_number, block_hash);
                    sender.send(()).is_ok()
                }
                Request::Call {
                    transaction,
                    sender,
                } => {
                    // add funds to callee
                    // I didn't use SetAccountBalance since that throws if the
                    // address doesn't exist
                    let last_layer = self.evm.db().unwrap().last_layer_mut();
                    last_layer.insert_account(transaction.caller, AccountInfo{
                      balance: U256::exp10(20),
                      ..Default::default()
                    });

                    self.evm.env.tx = transaction;
                    sender.send(self.evm.transact()).is_ok()
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
