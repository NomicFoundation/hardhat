use std::{fmt::Debug, ops::Deref, path::PathBuf, sync::Arc};

use napi::{
    bindgen_prelude::{BigInt, Buffer, ObjectFinalize},
    tokio::{runtime, sync::RwLock},
    Env, JsObject, Status,
};
use napi_derive::napi;

use edr_eth::{remote::RpcClient, spec::HardforkActivations, B256};
use edr_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{AccountTrie, StateError, TrieState},
    HashMap,
};

use crate::{
    account::{genesis_accounts, GenesisAccount},
    block::{Block, BlockOptions},
    cast::TryCast,
    config::SpecId,
    context::EdrContext,
    receipt::Receipt,
    state::State,
};

// An arbitrarily large amount of memory to signal to the javascript garbage collector that it needs to
// attempt to free the blockchain object's memory.
const BLOCKCHAIN_MEMORY_SIZE: i64 = 10_000;

/// The EDR blockchain
#[napi(custom_finalize)]
#[derive(Debug)]
pub struct Blockchain {
    inner: Arc<RwLock<dyn SyncBlockchain<BlockchainError, StateError>>>,
}

impl Blockchain {
    fn with_blockchain<BlockchainT>(env: &mut Env, blockchain: BlockchainT) -> napi::Result<Self>
    where
        BlockchainT: SyncBlockchain<BlockchainError, StateError>,
    {
        // Signal that memory was externally allocated
        env.adjust_external_memory(BLOCKCHAIN_MEMORY_SIZE)?;

        Ok(Self {
            inner: Arc::new(RwLock::new(blockchain)),
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
        chain_id: BigInt,
        spec_id: SpecId,
        genesis_block: BlockOptions,
        accounts: Vec<GenesisAccount>,
    ) -> napi::Result<Self> {
        let chain_id: u64 = chain_id.try_cast()?;
        let spec_id = edr_evm::SpecId::from(spec_id);
        let options = edr_eth::block::BlockOptions::try_from(genesis_block)?;

        let header = edr_eth::block::PartialHeader::new(spec_id, options, None);
        let genesis_block = edr_evm::LocalBlock::empty(header);

        let accounts = genesis_accounts(accounts)?;
        let genesis_state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));

        let blockchain = edr_evm::blockchain::LocalBlockchain::with_genesis_block(
            genesis_block,
            genesis_state,
            chain_id,
            spec_id,
        )
        .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        Self::with_blockchain(&mut env, blockchain)
    }

    #[napi(ts_return_type = "Promise<Blockchain>")]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::too_many_arguments)]
    pub fn fork(
        env: Env,
        context: &EdrContext,
        spec_id: SpecId,
        remote_url: String,
        fork_block_number: Option<BigInt>,
        cache_dir: Option<String>,
        accounts: Vec<GenesisAccount>,
        hardfork_activation_overrides: Vec<(BigInt, Vec<(BigInt, SpecId)>)>,
    ) -> napi::Result<JsObject> {
        let spec_id = edr_evm::SpecId::from(spec_id);
        let fork_block_number: Option<u64> = fork_block_number.map(BigInt::try_cast).transpose()?;
        let cache_dir = cache_dir.map_or_else(|| edr_defaults::CACHE_DIR.into(), PathBuf::from);
        let accounts = genesis_accounts(accounts)?;

        let state_root_generator = context.state_root_generator.clone();
        let hardfork_activation_overrides = hardfork_activation_overrides
            .into_iter()
            .map(|(chain_id, hardfork_activations)| {
                let chain_id: u64 = BigInt::try_cast(chain_id)?;

                hardfork_activations
                    .into_iter()
                    .map(|(block_number, spec_id)| {
                        let block_number: u64 = BigInt::try_cast(block_number)?;
                        let spec_id = edr_evm::SpecId::from(spec_id);

                        Ok((block_number, spec_id))
                    })
                    .collect::<napi::Result<Vec<_>>>()
                    .map(|activations| (chain_id, HardforkActivations::from(&activations[..])))
            })
            .collect::<napi::Result<HashMap<u64, HardforkActivations>>>()?;

        let runtime = runtime::Handle::current();

        let (deferred, promise) = env.create_deferred()?;
        runtime.clone().spawn(async move {
            let rpc_client = RpcClient::new(&remote_url, cache_dir);
            let result = edr_evm::blockchain::ForkedBlockchain::new(
                runtime,
                spec_id,
                rpc_client,
                fork_block_number,
                state_root_generator,
                accounts,
                hardfork_activation_overrides,
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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_hash(&self, hash: Buffer) -> napi::Result<Option<Block>> {
        let hash = TryCast::<B256>::try_cast(hash)?;

        self.read().await.block_by_hash(&hash).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(block.map(Block::from)),
        )
    }

    #[doc = "Retrieves the block with the provided number, if it exists."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_number(&self, number: BigInt) -> napi::Result<Option<Block>> {
        let number: u64 = BigInt::try_cast(number)?;

        self.read().await.block_by_number(number).await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(block.map(Block::from)),
        )
    }

    #[doc = "Retrieves the block that contains a transaction with the provided hash, if it exists."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_transaction_hash(
        &self,
        transaction_hash: Buffer,
    ) -> napi::Result<Option<Block>> {
        let transaction_hash = TryCast::<B256>::try_cast(transaction_hash)?;

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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn chain_id(&self) -> BigInt {
        let chain_id = self.read().await.chain_id().await;

        BigInt::from(chain_id)
    }

    // #[napi]
    // pub async fn insert_block(
    //     &mut self,
    //     block_number: BigInt,
    //     block_hash: Buffer,
    // ) -> napi::Result<()> {
    //     let block_number = BigInt::try_cast(block_number)?;
    //     let block_hash = TryCast::<B256>::try_cast(block_hash);

    //     self.db
    //         .insert_block(block_number, block_hash)
    //         .await
    //         .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    // }

    #[doc = "Retrieves the last block in the blockchain."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn last_block(&self) -> napi::Result<Block> {
        self.read().await.last_block().await.map_or_else(
            |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
            |block| Ok(Block::from(block)),
        )
    }

    #[doc = "Retrieves the number of the last block in the blockchain."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn last_block_number(&self) -> BigInt {
        let block_number = self.read().await.last_block_number().await;

        BigInt::from(block_number)
    }

    #[doc = "Retrieves the receipt of the transaction with the provided hash, if it exists."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: Buffer,
    ) -> napi::Result<Option<Receipt>> {
        let transaction_hash = TryCast::<B256>::try_cast(transaction_hash)?;

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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn reserve_blocks(&self, additional: BigInt, interval: BigInt) -> napi::Result<()> {
        let additional: u64 = BigInt::try_cast(additional)?;
        let interval: u64 = BigInt::try_cast(interval)?;

        self.write()
            .await
            .reserve_blocks(additional, interval)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Reverts to the block with the provided number, deleting all later blocks."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn revert_to_block(&self, block_number: BigInt) -> napi::Result<()> {
        let block_number: u64 = BigInt::try_cast(block_number)?;

        self.write()
            .await
            .revert_to_block(block_number)
            .await
            .map_err(|e| napi::Error::new(Status::GenericFailure, e.to_string()))
    }

    #[doc = "Retrieves the hardfork specficiation of the block at the provided number."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn spec_at_block_number(&self, block_number: BigInt) -> napi::Result<SpecId> {
        let block_number: u64 = BigInt::try_cast(block_number)?;

        self.read()
            .await
            .spec_at_block_number(block_number)
            .await
            .map_or_else(
                |error| Err(napi::Error::new(Status::GenericFailure, error.to_string())),
                |spec_id| Ok(SpecId::from(spec_id)),
            )
    }

    #[doc = "Retrieves the hardfork specification used for new blocks."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn spec_id(&self) -> SpecId {
        SpecId::from(self.read().await.spec_id())
    }

    #[doc = "Retrieves the state at the block with the provided number."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn state_at_block_number(&self, block_number: BigInt) -> napi::Result<State> {
        let block_number: u64 = BigInt::try_cast(block_number)?;

        self.read()
            .await
            .state_at_block_number(block_number)
            .await
            .map_or_else(
                |e| Err(napi::Error::new(Status::GenericFailure, e.to_string())),
                |state| Ok(State::from(state)),
            )
    }

    #[doc = "Retrieves the total difficulty at the block with the provided hash."]
    #[napi]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn total_difficulty_by_hash(&self, hash: Buffer) -> napi::Result<Option<BigInt>> {
        let hash = TryCast::<B256>::try_cast(hash)?;

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
