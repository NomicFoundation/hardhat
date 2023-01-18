mod js_blockchain;

use std::sync::Arc;

use napi::{bindgen_prelude::Buffer, Env, JsFunction, NapiRaw, Status};
use napi_derive::napi;
use rethnet_eth::B256;
use rethnet_evm::blockchain::{AsyncBlockchain, SyncBlockchain};

use crate::{
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction},
};

use self::js_blockchain::{GetBlockHashCall, JsBlockchain};

#[napi]
pub struct Blockchain {
    inner: Arc<AsyncBlockchain<napi::Error>>,
}

impl Blockchain {
    pub fn as_inner(&self) -> &Arc<AsyncBlockchain<napi::Error>> {
        &self.inner
    }
}

#[napi]
impl Blockchain {
    #[napi(constructor)]
    pub fn new(
        env: Env,
        #[napi(ts_arg_type = "(blockNumber: bigint) => Promise<Buffer>")]
        get_block_hash_fn: JsFunction,
    ) -> napi::Result<Self> {
        let get_block_hash_fn = ThreadsafeFunction::create(
            env.raw(),
            unsafe { get_block_hash_fn.raw() },
            0,
            |ctx: ThreadSafeCallContext<GetBlockHashCall>| {
                let sender = ctx.value.sender.clone();

                let block_number = ctx
                    .env
                    .create_bigint_from_words(false, ctx.value.block_number.as_limbs().to_vec())?;

                let promise = ctx.callback.call(None, &[block_number.into_unknown()?])?;
                let result = await_promise::<Buffer, B256>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Self::with_blockchain(JsBlockchain { get_block_hash_fn })
    }

    fn with_blockchain<B>(blockchain: B) -> napi::Result<Self>
    where
        B: SyncBlockchain<napi::Error>,
    {
        let blockchain: Box<dyn SyncBlockchain<napi::Error>> = Box::new(blockchain);
        let blockchain = AsyncBlockchain::new(blockchain)
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))?;

        Ok(Self {
            inner: Arc::new(blockchain),
        })
    }

    // #[napi]
    // pub async fn insert_block(
    //     &mut self,
    //     block_number: BigInt,
    //     block_hash: Buffer,
    // ) -> napi::Result<()> {
    //     let block_number = BigInt::try_cast(block_number)?;
    //     let block_hash = B256::from_slice(&block_hash);

    //     self.db
    //         .insert_block(block_number, block_hash)
    //         .await
    //         .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    // }
}
