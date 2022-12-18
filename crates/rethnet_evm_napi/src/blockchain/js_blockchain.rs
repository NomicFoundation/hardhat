use std::sync::mpsc::{channel, Sender};

use anyhow::anyhow;
use napi::Status;
use rethnet_eth::{B256, U256};
use rethnet_evm::Blockchain;

use crate::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

pub struct GetBlockHashCall {
    pub block_number: U256,
    pub sender: Sender<napi::Result<B256>>,
}

pub struct JsBlockchain {
    pub(super) get_block_hash_fn: ThreadsafeFunction<GetBlockHashCall>,
}

impl Blockchain for JsBlockchain {
    type Error = anyhow::Error;

    fn block_hash(&mut self, block_number: U256) -> Result<B256, Self::Error> {
        let (sender, receiver) = channel();

        let status = self.get_block_hash_fn.call(
            GetBlockHashCall {
                block_number,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }
}
