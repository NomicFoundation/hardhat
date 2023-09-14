use std::{
    fmt::Debug,
    sync::{
        mpsc::{channel, Sender},
        Arc,
    },
};

use async_trait::async_trait;
use napi::Status;
use rethnet_eth::{B256, U256};
use rethnet_evm::{
    blockchain::{Blockchain, BlockchainError, BlockchainMut},
    db::BlockHashRef,
    state::StateError,
    SyncBlock,
};

use crate::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

pub struct GetBlockHashCall {
    pub block_number: U256,
    pub sender: Sender<napi::Result<B256>>,
}

pub struct JsBlockchain {
    pub(super) get_block_hash_fn: ThreadsafeFunction<GetBlockHashCall>,
}

impl BlockHashRef for JsBlockchain {
    type Error = BlockchainError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn block_hash(&self, block_number: U256) -> Result<B256, Self::Error> {
        let (sender, receiver) = channel();

        let status = self.get_block_hash_fn.call(
            GetBlockHashCall {
                block_number,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .map_err(|e| panic!("Error occurred: {e}"))
    }
}

#[allow(clippy::unimplemented)]
#[async_trait]
impl Blockchain for JsBlockchain {
    type BlockchainError = BlockchainError;

    type StateError = StateError;

    async fn block_by_hash(
        &self,
        _hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        unimplemented!("Unsupported API")
    }

    async fn block_by_number(
        &self,
        _number: &U256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        unimplemented!("Unsupported API")
    }

    async fn block_by_transaction_hash(
        &self,
        _transaction_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        unimplemented!("Unsupported API")
    }

    async fn block_supports_spec(
        &self,
        _number: &U256,
        _spec_id: rethnet_evm::SpecId,
    ) -> Result<bool, Self::BlockchainError> {
        unimplemented!("Unsupported API")
    }

    async fn chain_id(&self) -> U256 {
        unimplemented!("Unsupported API")
    }

    async fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::BlockchainError>>, Self::BlockchainError> {
        unimplemented!("Unsupported API")
    }

    async fn last_block_number(&self) -> U256 {
        unimplemented!("Unsupported API")
    }

    async fn receipt_by_transaction_hash(
        &self,
        _transaction_hash: &B256,
    ) -> Result<Option<Arc<rethnet_eth::receipt::BlockReceipt>>, Self::BlockchainError> {
        unimplemented!("Unsupported API")
    }

    async fn total_difficulty_by_hash(
        &self,
        _hash: &B256,
    ) -> Result<Option<U256>, Self::BlockchainError> {
        unimplemented!("Unsupported API")
    }
}

#[allow(clippy::unimplemented)]
#[async_trait]
impl BlockchainMut for JsBlockchain {
    type Error = BlockchainError;

    async fn insert_block(
        &mut self,
        _block: rethnet_evm::LocalBlock,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::Error>>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    async fn reserve_blocks(
        &mut self,
        _additional: usize,
        _interval: U256,
    ) -> Result<(), Self::Error> {
        unimplemented!("Unsupported API")
    }

    async fn revert_to_block(&mut self, _block_number: &U256) -> Result<(), Self::Error> {
        unimplemented!("Unsupported API")
    }
}

impl Debug for JsBlockchain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsBlockchain").finish()
    }
}
