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
use rethnet_evm::{AccountInfo, DatabaseRef, EmptyDB, EVM, H160};

#[napi]
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

impl From<AccountInfo> for Account {
    fn from(account_info: AccountInfo) -> Self {
        println!("account: {:?}", account_info);
        Account {
            balance: BigInt {
                sign_bit: false,
                words: account_info.balance.0.to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code_hash: Buffer::from(account_info.code_hash.as_bytes()),
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
    pub async fn get_account_by_address(&mut self, address: Buffer) -> Result<Account> {
        let address = H160::from_slice(&address);

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountByAddress { address, sender })
            .map_err(|_| anyhow!("Failed to send request"))?;

        let account_info = receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(account_info.into())
    }
}

enum Request {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<AccountInfo>,
    },
}

struct Rethnet {
    evm: EVM<EmptyDB>,
    request_receiver: UnboundedReceiver<Request>,
}

impl Rethnet {
    pub fn new(request_receiver: UnboundedReceiver<Request>) -> Self {
        let mut evm = EVM::new();
        evm.database(EmptyDB::default());

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
            match request {
                Request::AccountByAddress { address, sender } => {
                    sender.send(self.get_account_by_address(address).await)
                }
            }
            .map_err(|_| anyhow!("Failed to send response"))?;
        }
        Ok(())
    }

    async fn get_account_by_address(&mut self, address: H160) -> AccountInfo {
        self.evm.db().unwrap().basic(address)
    }
}
