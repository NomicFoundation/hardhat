use std::sync::Arc;

use async_rwlock::{RwLock, RwLockUpgradableReadGuard};
use rethnet_eth::{
    block::{BlockAndCallers, DetailedBlock},
    receipt::BlockReceipt,
    remote::{self, BlockSpec, RpcClient, RpcClientError},
    transaction::SignedTransaction,
    B256, U256,
};

use super::storage::SparseBlockchainStorage;

#[derive(Debug)]
pub struct RemoteBlockchain {
    client: RpcClient,
    cache: RwLock<SparseBlockchainStorage>,
}

impl RemoteBlockchain {
    /// Constructs a new instance with the provided RPC client.
    pub fn new(client: RpcClient) -> Self {
        Self {
            client,
            cache: RwLock::new(SparseBlockchainStorage::default()),
        }
    }

    /// Retrieves the block with the provided hash, if it exists.
    pub async fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, RpcClientError> {
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
    pub async fn block_by_number(
        &self,
        number: &U256,
    ) -> Result<Arc<DetailedBlock>, RpcClientError> {
        let cache = self.cache.upgradable_read().await;

        if let Some(block) = cache.block_by_number(number).cloned() {
            Ok(block)
        } else {
            let block = self
                .client
                .get_block_by_number_with_transaction_data(BlockSpec::Number(*number))
                .await?;

            self.fetch_and_cache_block(cache, block).await
        }
    }

    /// Retrieves the block that contains a transaction with the provided hash, if it exists.
    pub async fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<DetailedBlock>>, RpcClientError> {
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
            // TODO: is this true?
            self.block_by_hash(&transaction.block_hash.expect("Not a pending transaction"))
                .await
        } else {
            Ok(None)
        }
    }

    /// Retrieves the receipt of the transaction with the provided hash, if it exists.
    pub async fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<BlockReceipt>>, RpcClientError> {
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

    /// Retrieves the total difficulty at the block with the provided hash.
    pub async fn total_difficulty_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<U256>, RpcClientError> {
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
    async fn fetch_and_cache_block(
        &self,
        cache: RwLockUpgradableReadGuard<'_, SparseBlockchainStorage>,
        block: remote::eth::Block<remote::eth::Transaction>,
    ) -> Result<Arc<DetailedBlock>, RpcClientError> {
        let total_difficulty = block
            .total_difficulty
            .expect("Must be present as this is not a pending block");

        let BlockAndCallers {
            block,
            transaction_callers,
        } = block
            .try_into()
            .expect("Conversion must succeed, as we're not retrieving a pending block");

        let transaction_hashes: Vec<B256> = block
            .transactions
            .iter()
            .map(SignedTransaction::hash)
            .collect();

        let receipts = self
            .client
            .get_transaction_receipts(&transaction_hashes)
            .await?
            .expect("All receipts of a block should exist")
            .into_iter()
            .map(Arc::new)
            .collect();

        let block = DetailedBlock::new(block, transaction_callers, receipts);

        let is_cacheable = self
            .client
            .is_cacheable_block_number(&block.header.number)
            .await?;

        if is_cacheable {
            let mut remote_cache = RwLockUpgradableReadGuard::upgrade(cache).await;

            // SAFETY: the block with this number didn't exist yet, so it must be unique
            Ok(unsafe { remote_cache.insert_block_unchecked(block, total_difficulty) }.clone())
        } else {
            Ok(Arc::new(block))
        }
    }
}

#[cfg(all(test, feature = "test-remote"))]
mod tests {

    use rethnet_eth::remote::RpcClient;
    use rethnet_test_utils::env::get_alchemy_url;

    use super::*;

    #[tokio::test]
    async fn no_cache_for_unsafe_block_number() {
        let tempdir = tempfile::tempdir().expect("can create tempdir");

        let rpc_client = RpcClient::new(&get_alchemy_url(), tempdir.path().to_path_buf());

        // Latest block number is always unsafe to cache
        let block_number = rpc_client.block_number().await.unwrap();

        let remote = RemoteBlockchain::new(rpc_client);

        let _ = remote.block_by_number(&block_number).await.unwrap();
        assert!(remote
            .cache
            .read()
            .await
            .block_by_number(&block_number)
            .is_none());
    }
}
