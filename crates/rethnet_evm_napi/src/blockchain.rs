use std::{fmt::Debug, ops::Deref, path::PathBuf, sync::Arc};

use napi::{
    bindgen_prelude::{BigInt, Buffer, ObjectFinalize},
    tokio::{runtime, sync::RwLock},
    Env, JsObject, Status,
};
use napi_derive::napi;

use rethnet_eth::{B256, U256};
use rethnet_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{AccountTrie, StateError, TrieState},
    RandomHashGenerator,
};

use crate::{
    account::{genesis_accounts, GenesisAccount},
    block::{Block, BlockOptions},
    cast::TryCast,
    config::SpecId,
    context::RethnetContext,
    receipt::Receipt,
    state::StateManager,
};

// An arbitrarily large amount of memory to signal to the javascript garbage collector that it needs to
// attempt to free the blockchain object's memory.
const BLOCKCHAIN_MEMORY_SIZE: i64 = 10_000;

/// The Rethnet blockchain
#[napi(custom_finalize)]
#[derive(Debug)]
pub struct Blockchain {
    inner: Arc<RwLock<dyn SyncBlockchain<BlockchainError, StateError>>>,
    runtime: runtime::Handle,
}

impl Blockchain {
    fn with_blockchain<BlockchainT>(
        env: &mut Env,
        blockchain: BlockchainT,
        runtime: runtime::Handle,
    ) -> napi::Result<Self>
    where
        BlockchainT: SyncBlockchain<BlockchainError, StateError>,
    {
        // Signal that memory was externally allocated
        env.adjust_external_memory(BLOCKCHAIN_MEMORY_SIZE)?;

        Ok(Self {
            inner: Arc::new(RwLock::new(blockchain)),
            runtime,
        })
    }
}

impl Deref for Blockchain {
    type Target = Arc<RwLock<dyn SyncBlockchain<BlockchainError, StateError>>>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[napi]
impl Blockchain {
    /// Constructs a new blockchain from a genesis block.
    #[napi(factory)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_genesis_block(
        mut env: Env,
        context: &RethnetContext,
        chain_id: BigInt,
        spec_id: SpecId,
        genesis_block: BlockOptions,
        accounts: Vec<GenesisAccount>,
    ) -> napi::Result<Self> {
        let chain_id: U256 = chain_id.try_cast()?;
        let spec_id = rethnet_evm::SpecId::from(spec_id);
        let options = rethnet_eth::block::BlockOptions::try_from(genesis_block)?;

        let header = rethnet_eth::block::PartialHeader::new(spec_id, options, None);
        let genesis_block = rethnet_evm::LocalBlock::empty(header, spec_id);

        let accounts = genesis_accounts(accounts)?;
        let genesis_state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));

        let blockchain = rethnet_evm::blockchain::LocalBlockchain::with_genesis_block(
            genesis_block,
            genesis_state,
            chain_id,
            spec_id,
        )
        .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        Self::with_blockchain(&mut env, blockchain, context.runtime().clone())
    }

    #[napi(ts_return_type = "Promise<Blockchain>")]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn fork(
        env: Env,
        context: &RethnetContext,
        spec_id: SpecId,
        remote_url: String,
        fork_block_number: Option<BigInt>,
        cache_dir: Option<String>,
        accounts: Vec<GenesisAccount>,
    ) -> napi::Result<JsObject> {
        let spec_id = rethnet_evm::SpecId::from(spec_id);
        let fork_block_number: Option<U256> = fork_block_number.map_or(Ok(None), |number| {
            BigInt::try_cast(number).map(Option::Some)
        })?;
        let cache_dir = cache_dir.map_or_else(|| rethnet_defaults::CACHE_DIR.into(), PathBuf::from);
        let accounts = genesis_accounts(accounts)?;

        let runtime = context.runtime().clone();

        let (deferred, promise) = env.create_deferred()?;
        context.runtime().spawn(async move {
            let result = rethnet_evm::blockchain::ForkedBlockchain::new(
                runtime.clone(),
                spec_id,
                &remote_url,
                cache_dir,
                fork_block_number,
                // TODO: Make this configurable
                Arc::new(parking_lot::Mutex::new(RandomHashGenerator::with_seed(
                    "seed",
                ))),
                accounts,
            )
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()));

            deferred.resolve(|mut env| {
                result.map(|blockchain| Self::with_blockchain(&mut env, blockchain, runtime))
            });
        });

        Ok(promise)
    }

    #[doc = "Retrieves the block with the provided hash, if it exists."]
    #[napi]
    pub async fn block_by_hash(&self, hash: Buffer) -> napi::Result<Option<Block>> {
        let hash = B256::from_slice(&hash);

        self.read().await.block_by_hash(&hash).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(block.map(Block::from)),
        )
    }

    #[doc = "Retrieves the block with the provided number, if it exists."]
    #[napi]
    pub async fn block_by_number(&self, number: BigInt) -> napi::Result<Option<Block>> {
        let number: U256 = BigInt::try_cast(number)?;

        self.read()
            .await
            .block_by_number(&number)
            .await
            .map_or_else(
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
            .await
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |block| Ok(block.map(Block::from)),
            )
    }

    #[doc = "Retrieves the instance's chain ID."]
    #[napi]
    pub async fn chain_id(&self) -> BigInt {
        let chain_id = self.read().await.chain_id().await;

        BigInt {
            sign_bit: false,
            words: chain_id.into_limbs().to_vec(),
        }
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
        self.read().await.last_block().await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(Block::from(block)),
        )
    }

    #[doc = "Retrieves the number of the last block in the blockchain."]
    #[napi]
    pub async fn last_block_number(&self) -> BigInt {
        let block_number = self.read().await.last_block_number().await;

        BigInt {
            sign_bit: false,
            words: block_number.into_limbs().to_vec(),
        }
    }

    #[doc = "Retrieves the receipt of the transaction with the provided hash, if it exists."]
    #[napi]
    pub async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: Buffer,
    ) -> napi::Result<Option<Receipt>> {
        let transaction_hash = B256::from_slice(&transaction_hash);

        self.read()
            .await
            .receipt_by_transaction_hash(&transaction_hash)
            .await
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |receipt| Ok(receipt.map(Into::into)),
            )
    }

    #[doc = "Reserves the provided number of blocks, starting from the next block number."]
    #[napi]
    pub async fn reserve_blocks(&self, additional: BigInt, interval: BigInt) -> napi::Result<()> {
        let additional: u64 = BigInt::try_cast(additional)?;
        let interval: U256 = BigInt::try_cast(interval)?;

        let additional = usize::try_from(additional).map_err(|_error| {
            napi::Error::new(Status::InvalidArg, "Additional storage exceeds capacity.")
        })?;

        self.write()
            .await
            .reserve_blocks(additional, interval)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Reverts to the block with the provided number, deleting all later blocks."]
    #[napi]
    pub async fn revert_to_block(&self, block_number: BigInt) -> napi::Result<()> {
        let block_number: U256 = BigInt::try_cast(block_number)?;

        self.write()
            .await
            .revert_to_block(&block_number)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Retrieves the hardfork specficiation of the block at the provided number."]
    #[napi]
    pub async fn spec_at_block_number(&self, number: BigInt) -> napi::Result<SpecId> {
        let number: U256 = BigInt::try_cast(number)?;

        self.read()
            .await
            .spec_at_block_number(&number)
            .await
            .map_or_else(
                |error| Err(napi::Error::new(Status::GenericFailure, error.to_string())),
                |spec_id| Ok(SpecId::from(spec_id)),
            )
    }

    #[doc = "Retrieves the hardfork specification used for new blocks."]
    #[napi]
    pub async fn spec_id(&self) -> SpecId {
        SpecId::from(self.read().await.spec_id())
    }

    #[doc = "Retrieves the state at the block with the provided number."]
    #[napi]
    pub async fn state_at_block(&self, block_number: BigInt) -> napi::Result<StateManager> {
        let block_number: U256 = BigInt::try_cast(block_number)?;

        self.read()
            .await
            .state_at_block(&block_number)
            .await
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |state| Ok(StateManager::from((state, self.runtime.clone()))),
            )
    }

    #[doc = "Retrieves the total difficulty at the block with the provided hash."]
    #[napi]
    pub async fn total_difficulty_by_hash(&self, hash: Buffer) -> napi::Result<Option<BigInt>> {
        let hash = B256::from_slice(&hash);

        self.read()
            .await
            .total_difficulty_by_hash(&hash)
            .await
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
