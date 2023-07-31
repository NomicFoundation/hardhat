mod js_blockchain;

use std::{fmt::Debug, ops::Deref, sync::Arc};

use napi::{
    bindgen_prelude::{BigInt, Buffer, ObjectFinalize},
    tokio::sync::RwLock,
    Env, JsFunction, JsObject, NapiRaw, Status,
};
use napi_derive::napi;

use rethnet_eth::{B256, U256};
use rethnet_evm::blockchain::{BlockchainError, SyncBlockchain};

use crate::{
    block::Block,
    cast::TryCast,
    config::SpecId,
    context::RethnetContext,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction},
};

use self::js_blockchain::{GetBlockHashCall, JsBlockchain};

// An arbitrarily large amount of memory to signal to the javascript garbage collector that it needs to
// attempt to free the blockchain object's memory.
const BLOCKCHAIN_MEMORY_SIZE: i64 = 10_000;

/// The Rethnet blockchain
#[napi(custom_finalize)]
#[derive(Debug)]
pub struct Blockchain {
    inner: Arc<RwLock<dyn SyncBlockchain<BlockchainError>>>,
}

impl Blockchain {
    fn with_blockchain<B>(env: &mut Env, blockchain: B) -> napi::Result<Self>
    where
        B: SyncBlockchain<BlockchainError>,
    {
        // Signal that memory was externally allocated
        env.adjust_external_memory(BLOCKCHAIN_MEMORY_SIZE)?;

        Ok(Self {
            inner: Arc::new(RwLock::new(blockchain)),
        })
    }
}

impl Deref for Blockchain {
    type Target = Arc<RwLock<dyn SyncBlockchain<BlockchainError>>>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl Blockchain {
    /// Constructs a new blockchain that queries the blockhash using a callback.
    #[napi(constructor)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(
        mut env: Env,
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

        Self::with_blockchain(&mut env, JsBlockchain { get_block_hash_fn })
    }

    /// Constructs a new blockchain from a genesis block.
    #[napi(factory)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_genesis_block(mut env: Env, genesis_block: &Block) -> napi::Result<Self> {
        let blockchain =
            rethnet_evm::blockchain::LocalBlockchain::with_genesis_block((*genesis_block).clone())
                .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        Self::with_blockchain(&mut env, blockchain)
    }

    #[napi(ts_return_type = "Promise<BlockBuilder>")]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn fork(
        env: Env,
        context: &RethnetContext,
        spec_id: SpecId,
        remote_url: String,
        fork_block_number: Option<BigInt>,
    ) -> napi::Result<JsObject> {
        let spec_id = rethnet_evm::SpecId::from(spec_id);
        let fork_block_number: Option<U256> = fork_block_number.map_or(Ok(None), |number| {
            BigInt::try_cast(number).map(Option::Some)
        })?;

        let runtime = context.runtime().clone();

        let (deferred, promise) = env.create_deferred()?;
        context.runtime().spawn(async move {
            let result = rethnet_evm::blockchain::ForkedBlockchain::new(
                runtime,
                spec_id,
                &remote_url,
                fork_block_number,
            )
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()));

            deferred.resolve(|mut env| {
                result.map(|blockchain| Self::with_blockchain(&mut env, blockchain))
            });
        });

        Ok(promise)
    }

    #[doc = "Retrieves the block with the provided hash, if it exists."]
    #[napi]
    pub async fn block_by_hash(&self, hash: Buffer) -> napi::Result<Option<Block>> {
        let hash = B256::from_slice(&hash);

        self.read().await.block_by_hash(&hash).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(block.map(Block::from)),
        )
    }

    #[doc = "Retrieves the block with the provided number, if it exists."]
    #[napi]
    pub async fn block_by_number(&self, number: BigInt) -> napi::Result<Option<Block>> {
        let number: U256 = BigInt::try_cast(number)?;

        self.read().await.block_by_number(&number).map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(block.map(Block::from)),
        )
    }

    #[doc = "Retrieves the block that contains a transaction with the provided hash, if it exists."]
    #[napi]
    pub async fn block_by_transaction_hash(
        &self,
        transaction_hash: Buffer,
    ) -> napi::Result<Option<Block>> {
        let transaction_hash = B256::from_slice(&transaction_hash);

        self.read()
            .await
            .block_by_transaction_hash(&transaction_hash)
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |block| Ok(block.map(Block::from)),
            )
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

    #[doc = "Retrieves the last block in the blockchain."]
    #[napi]
    pub async fn last_block(&self) -> napi::Result<Block> {
        self.read().await.last_block().map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(Block::from(block)),
        )
    }

    #[doc = "Retrieves the number of the last block in the blockchain."]
    #[napi]
    pub async fn last_block_number(&self) -> BigInt {
        let block_number = self.read().await.last_block_number();

        BigInt {
            sign_bit: false,
            words: block_number.into_limbs().to_vec(),
        }
    }

    #[doc = "Retrieves the total difficulty at the block with the provided hash."]
    #[napi]
    pub async fn total_difficulty_by_hash(&self, hash: Buffer) -> napi::Result<Option<BigInt>> {
        let hash = B256::from_slice(&hash);

        self.read()
            .await
            .total_difficulty_by_hash(&hash)
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |value| {
                    Ok(value.map(|value| BigInt {
                        sign_bit: false,
                        words: value.into_limbs().to_vec(),
                    }))
                },
            )
    }
}

impl ObjectFinalize for Blockchain {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn finalize(self, mut env: Env) -> napi::Result<()> {
        // Signal that the externally allocated memory has been freed
        env.adjust_external_memory(-BLOCKCHAIN_MEMORY_SIZE)?;

        Ok(())
    }
}
