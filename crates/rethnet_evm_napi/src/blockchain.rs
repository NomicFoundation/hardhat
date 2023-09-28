use std::{fmt::Debug, ops::Deref, path::PathBuf, sync::Arc};

use napi::{
    bindgen_prelude::{BigInt, Buffer, ObjectFinalize},
    tokio::{runtime, sync::RwLock},
    Env, JsObject, Status,
};
use napi_derive::napi;

use rethnet_eth::{remote::RpcClient, spec::HardforkActivations, B256, U256};
use rethnet_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{AccountTrie, StateError, TrieState},
    HashMap,
};

use crate::{
    account::{add_precompiles, genesis_accounts, GenesisAccount},
    block::Block,
    cast::TryCast,
    config::SpecId,
    context::RethnetContext,
    receipt::Receipt,
    state::State,
};

// An arbitrarily large amount of memory to signal to the javascript garbage collector that it needs to
// attempt to free the blockchain object's memory.
const BLOCKCHAIN_MEMORY_SIZE: i64 = 10_000;

/// The Rethnet blockchain
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
    #[napi(constructor)]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mut env: Env,
        chain_id: BigInt,
        spec_id: SpecId,
        gas_limit: BigInt,
        accounts: Vec<GenesisAccount>,
        timestamp: Option<BigInt>,
        prev_randao: Option<Buffer>,
        base_fee: Option<BigInt>,
    ) -> napi::Result<Self> {
        let chain_id: U256 = chain_id.try_cast()?;
        let spec_id = rethnet_evm::SpecId::from(spec_id);
        let gas_limit: U256 = BigInt::try_cast(gas_limit)?;
        let timestamp: Option<U256> = timestamp.map(TryCast::<U256>::try_cast).transpose()?;
        let prev_randao: Option<B256> = prev_randao.map(TryCast::<B256>::try_cast).transpose()?;
        let base_fee: Option<U256> = base_fee.map(TryCast::<U256>::try_cast).transpose()?;

        let mut accounts = genesis_accounts(accounts)?;
        add_precompiles(&mut accounts);

        let genesis_state = TrieState::with_accounts(AccountTrie::with_accounts(&accounts));
        let blockchain = rethnet_evm::blockchain::LocalBlockchain::new(
            genesis_state,
            chain_id,
            spec_id,
            gas_limit,
            timestamp,
            prev_randao,
            base_fee,
        )
        .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        Self::with_blockchain(&mut env, blockchain)
    }

    #[napi(ts_return_type = "Promise<Blockchain>")]
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::too_many_arguments)]
    pub fn fork(
        env: Env,
        context: &RethnetContext,
        spec_id: SpecId,
        remote_url: String,
        fork_block_number: Option<BigInt>,
        cache_dir: Option<String>,
        accounts: Vec<GenesisAccount>,
        hardfork_activation_overrides: Vec<(BigInt, Vec<(BigInt, SpecId)>)>,
    ) -> napi::Result<JsObject> {
        let spec_id = rethnet_evm::SpecId::from(spec_id);
        let fork_block_number: Option<U256> = fork_block_number.map_or(Ok(None), |number| {
            BigInt::try_cast(number).map(Option::Some)
        })?;
        let cache_dir = cache_dir.map_or_else(|| rethnet_defaults::CACHE_DIR.into(), PathBuf::from);
        let accounts = genesis_accounts(accounts)?;

        let state_root_generator = context.state_root_generator.clone();
        let hardfork_activation_overrides = hardfork_activation_overrides
            .into_iter()
            .map(|(chain_id, hardfork_activations)| {
                let chain_id: U256 = BigInt::try_cast(chain_id)?;

                hardfork_activations
                    .into_iter()
                    .map(|(block_number, spec_id)| {
                        let block_number: U256 = BigInt::try_cast(block_number)?;
                        let spec_id = rethnet_evm::SpecId::from(spec_id);

                        Ok((block_number, spec_id))
                    })
                    .collect::<napi::Result<Vec<_>>>()
                    .map(|activations| (chain_id, HardforkActivations::from(activations)))
            })
            .collect::<napi::Result<HashMap<U256, HardforkActivations>>>()?;

        let runtime = runtime::Handle::current();

        let (deferred, promise) = env.create_deferred()?;
        runtime.clone().spawn(async move {
            let rpc_client = RpcClient::new(&remote_url, cache_dir);
            let result = rethnet_evm::blockchain::ForkedBlockchain::new(
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

        BigInt {
            sign_bit: false,
            words: block_number.into_limbs().to_vec(),
        }
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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
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
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn spec_at_block_number(&self, block_number: BigInt) -> napi::Result<SpecId> {
        let block_number: U256 = BigInt::try_cast(block_number)?;

        self.read()
            .await
            .spec_at_block_number(&block_number)
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
        let block_number: U256 = BigInt::try_cast(block_number)?;

        self.read()
            .await
            .state_at_block_number(&block_number)
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
