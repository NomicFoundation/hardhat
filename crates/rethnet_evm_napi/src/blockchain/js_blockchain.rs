use std::{
    fmt::Debug,
    sync::mpsc::{channel, Sender},
};

use napi::Status;
use rethnet_eth::{B256, U256};
use rethnet_evm::{
    blockchain::{Blockchain, BlockchainError, BlockchainMut},
    db::BlockHashRef,
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
impl Blockchain for JsBlockchain {
    type Error = BlockchainError;

    fn block_by_hash(
        &self,
        _hash: &B256,
    ) -> Result<Option<std::sync::Arc<rethnet_eth::block::DetailedBlock>>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn block_by_number(
        &self,
        _number: &U256,
    ) -> Result<Option<std::sync::Arc<rethnet_eth::block::DetailedBlock>>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn block_by_transaction_hash(
        &self,
        _transaction_hash: &B256,
    ) -> Result<Option<std::sync::Arc<rethnet_eth::block::DetailedBlock>>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn block_supports_spec(
        &self,
        _number: &U256,
        _spec_id: rethnet_evm::SpecId,
    ) -> Result<bool, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn chain_id(&self) -> U256 {
        unimplemented!("Unsupported API")
    }

    fn last_block(&self) -> Result<std::sync::Arc<rethnet_eth::block::DetailedBlock>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn last_block_number(&self) -> U256 {
        unimplemented!("Unsupported API")
    }

    fn receipt_by_transaction_hash(
        &self,
        _transaction_hash: &B256,
    ) -> Result<Option<std::sync::Arc<rethnet_eth::receipt::BlockReceipt>>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn total_difficulty_by_hash(&self, _hash: &B256) -> Result<Option<U256>, Self::Error> {
        unimplemented!("Unsupported API")
    }
}

#[allow(clippy::unimplemented)]
impl BlockchainMut for JsBlockchain {
    type Error = BlockchainError;

    fn insert_block(
        &mut self,
        _block: rethnet_eth::block::DetailedBlock,
    ) -> Result<std::sync::Arc<rethnet_eth::block::DetailedBlock>, Self::Error> {
        unimplemented!("Unsupported API")
    }

    fn revert_to_block(&mut self, _block_number: &U256) -> Result<(), Self::Error> {
        unimplemented!("Unsupported API")
    }
}

impl Debug for JsBlockchain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsBlockchain").finish()
    }
}
