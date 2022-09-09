mod db;

use anyhow::anyhow;
use db::HardhatDatabase;
use napi::{
    bindgen_prelude::*,
    threadsafe_function::{ErrorStrategy, ThreadSafeCallContext, ThreadsafeFunction},
    tokio::{
        self,
        sync::{
            mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
            oneshot,
        },
    },
};
use napi_derive::napi;
use rethnet_evm::{AccountInfo, Database, EVM, H160};

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

// #[napi]
// impl Account {
//     fn try_from_with_env(env: Env, account_info: AccountInfo) -> anyhow::Result<Self> {
//         env.adjust_external_memory(mem::size_of_val(&account_info.code_hash) as i64)?;

//         Ok()
//     }
// }

// #[napi]
// pub struct AccountByAddressQuery {
//     #[napi(readonly)]
//     pub address: Uint8Array,
//     pub response: Account,
// }

#[napi]
pub struct RethnetClient {
    request_sender: UnboundedSender<Request>,
}

#[napi]
impl RethnetClient {
    #[napi(constructor)]
    pub fn new(
        #[napi(ts_arg_type = "(address: Buffer) => void")] get_account_by_address_fn: JsFunction,
    ) -> Result<Self> {
        let get_account_by_address_fn: ThreadsafeFunction<H160, ErrorStrategy::Fatal> =
            get_account_by_address_fn.create_threadsafe_function(
                0,
                |ctx: ThreadSafeCallContext<H160>| {
                    ctx.env
                        .create_buffer_copy(ctx.value.as_bytes())
                        .map(|buffer| vec![buffer.into_raw()])
                },
            )?;
        let (request_sender, request_receiver) = unbounded_channel();

        tokio::spawn(Rethnet::run(request_receiver, get_account_by_address_fn));

        Ok(Self { request_sender })
    }

    #[napi]
    pub async fn get_account_by_address(&mut self, address: Buffer) -> Result<Account> {
        let address = H160::from_slice(&address);

        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::AccountByAddress { address, sender })
            .map_err(|_| anyhow!("Failed to send request"))?;

        let account_info = receiver.await.expect("Rethnet unexpectedly crashed");
        Ok(Account {
            balance: BigInt {
                sign_bit: false,
                words: account_info.balance.0.to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code_hash: Buffer::from(account_info.code_hash.as_bytes()),
        })
    }
}

enum Request {
    AccountByAddress {
        address: H160,
        sender: oneshot::Sender<AccountInfo>,
    },
}

struct Rethnet {
    evm: EVM<HardhatDatabase>,
    request_receiver: UnboundedReceiver<Request>,
}

impl Rethnet {
    pub fn new(request_receiver: UnboundedReceiver<Request>, db: HardhatDatabase) -> Self {
        let mut evm = EVM::new();
        evm.database(db);

        Self {
            evm,
            request_receiver,
        }
    }

    pub async fn run(
        request_receiver: UnboundedReceiver<Request>,
        get_account_by_address_fn: ThreadsafeFunction<H160, ErrorStrategy::Fatal>,
    ) -> anyhow::Result<()> {
        let db = HardhatDatabase::new(get_account_by_address_fn);
        let mut rethnet = Rethnet::new(request_receiver, db);

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
