use std::{
    fmt::Debug,
    sync::mpsc::{channel, Sender},
};

use napi::Status;
use rethnet_eth::{B256, U256};
use rethnet_evm::BlockHashRef;

use crate::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

pub struct GetBlockHashCall {
    pub block_number: U256,
    pub sender: Sender<napi::Result<B256>>,
}

pub struct JsBlockchain {
    pub(super) get_block_hash_fn: ThreadsafeFunction<GetBlockHashCall>,
}

impl BlockHashRef for JsBlockchain {
    type Error = napi::Error;

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

        receiver.recv().unwrap()
    }
}

impl Debug for JsBlockchain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsBlockchain").finish()
    }
}
