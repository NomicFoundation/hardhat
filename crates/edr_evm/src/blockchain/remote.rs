use std::sync::Arc;

use async_rwlock::{RwLock, RwLockUpgradableReadGuard};
use edr_eth::{
    log::FilterLog,
    receipt::BlockReceipt,
    remote::{self, filter::OneOrMore, BlockSpec, PreEip1898BlockSpec, RpcClient},
    Address, B256, U256,
};
use revm::primitives::HashSet;
use tokio::runtime;

use super::storage::SparseBlockchainStorage;
use crate::{blockchain::ForkedBlockchainError, Block, RemoteBlock};

#[derive(Debug)]
pub struct RemoteBlockchain<BlockT: Block + Clone, const FORCE_CACHING: bool> {
    client: Arc<RpcClient>,
    cache: RwLock<SparseBlockchainStorage<BlockT>>,
    runtime: runtime::Handle,
}

impl<BlockT: Block + Clone + From<RemoteBlock>, const FORCE_CACHING: bool>
    RemoteBlockchain<BlockT, FORCE_CACHING>
{
    /// Constructs a new instance with the provided RPC client.
    pub fn new(client: Arc<RpcClient>, runtime: runtime::Handle) -> Self {
        Self {
            client,
            cache: RwLock::new(SparseBlockchainStorage::default()),
            runtime,
        }
    }

    /// Retrieves the block with the provided hash, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<BlockT>, ForkedBlockchainError> {
        let cache = self.cache.upgradable_read().await;

        if let Some(block) = cache.block_by_hash(hash).cloned() {
            return Ok(Some(block));
        }

        if let Some(block) = self
            .client
            .get_block_by_hash_with_transaction_data(hash)
            .await?
        {
            self.fetch_and_cache_block(cache, block)
                .await
                .map(Option::Some)
        } else {
            Ok(None)
        }
    }

    /// Retrieves the block with the provided number, if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_number(&self, number: u64) -> Result<BlockT, ForkedBlockchainError> {
        let cache = self.cache.upgradable_read().await;

        if let Some(block) = cache.block_by_number(number).cloned() {
            Ok(block)
        } else {
            let block = self
                .client
                .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::Number(number))
                .await?;

            self.fetch_and_cache_block(cache, block).await
        }
    }

    /// Retrieves the block that contains a transaction with the provided hash,
    /// if it exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<BlockT>, ForkedBlockchainError> {
        // This block ensure that the read lock is dropped
        {
            if let Some(block) = self
                .cache
                .read()
                .await
                .block_by_transaction_hash(transaction_hash)
                .cloned()
            {
                return Ok(Some(block));
            }
        }

        if let Some(transaction) = self
            .client
            .get_transaction_by_hash(transaction_hash)
            .await?
        {
            self.block_by_hash(&transaction.block_hash.expect("Not a pending transaction"))
                .await
        } else {
            Ok(None)
        }
    }

    /// Retrieves the instance's RPC client.
    pub fn client(&self) -> &Arc<RpcClient> {
        &self.client
    }

    pub async fn logs(
        &self,
        from_block: BlockSpec,
        to_block: BlockSpec,
        addresses: &HashSet<Address>,
        normalized_topics: &[Option<Vec<B256>>],
    ) -> Result<Vec<FilterLog>, ForkedBlockchainError> {
        self.client
            .get_logs_by_range(
                from_block,
                to_block,
                if addresses.len() > 1 {
                    Some(OneOrMore::Many(addresses.iter().copied().collect()))
                } else {
                    addresses
                        .iter()
                        .next()
                        .map(|address| OneOrMore::One(*address))
                },
                if normalized_topics.is_empty() {
                    None
                } else {
                    Some(
                        normalized_topics
                            .iter()
                            .map(|topics| {
                                topics.as_ref().and_then(|topics| {
                                    if topics.len() > 1 {
                                        Some(OneOrMore::Many(topics.clone()))
                                    } else {
                                        topics.first().map(|topic| OneOrMore::One(*topic))
                                    }
                                })
                            })
                            .collect(),
                    )
                },
            )
            .await
            .map_err(ForkedBlockchainError::RpcClient)
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it
    /// exists.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, ForkedBlockchainError> {
        let cache = self.cache.upgradable_read().await;

        if let Some(receipt) = cache.receipt_by_transaction_hash(transaction_hash) {
            Ok(Some(receipt.clone()))
        } else if let Some(receipt) = self
            .client
            .get_transaction_receipt(transaction_hash)
            .await?
        {
            Ok(Some({
                let mut cache = RwLockUpgradableReadGuard::upgrade(cache).await;
                // SAFETY: the receipt with this hash didn't exist yet, so it must be unique
                unsafe { cache.insert_receipt_unchecked(receipt) }.clone()
            }))
        } else {
            Ok(None)
        }
    }

    /// Retrieves the blockchain's runtime.
    pub fn runtime(&self) -> &runtime::Handle {
        &self.runtime
    }

    /// Retrieves the total difficulty at the block with the provided hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub async fn total_difficulty_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<U256>, ForkedBlockchainError> {
        let cache = self.cache.upgradable_read().await;

        if let Some(difficulty) = cache.total_difficulty_by_hash(hash).cloned() {
            Ok(Some(difficulty))
        } else if let Some(block) = self
            .client
            .get_block_by_hash_with_transaction_data(hash)
            .await?
        {
            let total_difficulty = block
                .total_difficulty
                .expect("Must be present as this is not a pending transaction");

            self.fetch_and_cache_block(cache, block).await?;

            Ok(Some(total_difficulty))
        } else {
            Ok(None)
        }
    }

    /// Fetches detailed block information and caches the block.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    async fn fetch_and_cache_block(
        &self,
        cache: RwLockUpgradableReadGuard<'_, SparseBlockchainStorage<BlockT>>,
        block: remote::eth::Block<remote::eth::Transaction>,
    ) -> Result<BlockT, ForkedBlockchainError> {
        let total_difficulty = block
            .total_difficulty
            .expect("Must be present as this is not a pending block");

        let block = RemoteBlock::new(block, self.client.clone(), self.runtime.clone())?;

        let is_cacheable = FORCE_CACHING
            || self
                .client
                .is_cacheable_block_number(block.header().number)
                .await?;

        let block = BlockT::from(block);

        if is_cacheable {
            let mut remote_cache = RwLockUpgradableReadGuard::upgrade(cache).await;

            // SAFETY: the block with this number didn't exist yet, so it must be unique
            Ok(unsafe { remote_cache.insert_block_unchecked(block, total_difficulty) }.clone())
        } else {
            Ok(block)
        }
    }
}

#[cfg(all(test, feature = "test-remote"))]
mod tests {

    use edr_eth::remote::RpcClient;
    use edr_test_utils::env::get_alchemy_url;

    use super::*;

    #[tokio::test]
    async fn no_cache_for_unsafe_block_number() {
        let tempdir = tempfile::tempdir().expect("can create tempdir");

        let rpc_client = RpcClient::new(&get_alchemy_url(), tempdir.path().to_path_buf());

        // Latest block number is always unsafe to cache
        let block_number = rpc_client.block_number().await.unwrap();

        let remote = RemoteBlockchain::<RemoteBlock, false>::new(
            Arc::new(rpc_client),
            runtime::Handle::current(),
        );

        let _ = remote.block_by_number(block_number).await.unwrap();
        assert!(remote
            .cache
            .read()
            .await
            .block_by_number(block_number)
            .is_none());
    }
}
