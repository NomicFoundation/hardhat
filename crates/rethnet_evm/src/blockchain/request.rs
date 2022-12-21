use std::fmt::Debug;

use rethnet_eth::{B256, U256};
use revm::blockchain::Blockchain;
use tokio::sync::oneshot;

/// The request type used internally by a [`SyncDatabase`].
#[derive(Debug)]
pub enum Request<E>
where
    E: Debug,
{
    BlockHashByNumber {
        number: U256,
        sender: oneshot::Sender<Result<B256, E>>,
    },
    // InsertBlock {
    //     block_number: U256,
    //     block_hash: B256,
    //     sender: oneshot::Sender<Result<(), E>>,
    // },
    Terminate,
}

impl<E> Request<E>
where
    E: Debug,
{
    pub fn handle<D>(self, db: &mut D) -> bool
    where
        D: Blockchain<Error = E>,
    {
        match self {
            Request::BlockHashByNumber { number, sender } => {
                sender.send(db.block_hash(number)).unwrap()
            }
            // Request::InsertBlock {
            //     block_number,
            //     block_hash,
            //     sender,
            // } => sender
            //     .send(db.insert_block(block_number, block_hash))
            //     .unwrap(),
            Request::Terminate => return false,
        }

        true
    }
}
