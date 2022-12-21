use std::{fmt::Debug, io, marker::PhantomData};

use rethnet_eth::{B256, U256};
use revm::blockchain::Blockchain;
use tokio::{
    runtime::{Builder, Runtime},
    sync::{
        mpsc::{unbounded_channel, UnboundedSender},
        oneshot,
    },
    task::{self, JoinHandle},
};

use super::request::Request;

/// Trait that meets all requirements for a synchronous database that can be used by [`AsyncBlockchain`].
pub trait SyncBlockchain<E>: Blockchain<Error = E> + Send + Sync + 'static
where
    E: Debug + Send,
{
}

impl<B, E> SyncBlockchain<E> for B
where
    B: Blockchain<Error = E> + Send + Sync + 'static,
    E: Debug + Send,
{
}

/// A helper class for converting a synchronous blockchain into an asynchronous blockchain.
///
/// Requires the inner blockchain to implement [`Blockchain`].
pub struct AsyncBlockchain<B, E>
where
    B: SyncBlockchain<E>,
    E: Debug + Send,
{
    runtime: Runtime,
    request_sender: UnboundedSender<Request<E>>,
    blockchain_handle: Option<JoinHandle<()>>,
    phantom: PhantomData<B>,
}

impl<B, E> AsyncBlockchain<B, E>
where
    B: SyncBlockchain<E>,
    E: Debug + Send + 'static,
{
    /// Constructs an [`AsyncBlockchain`] instance with the provided database.
    pub fn new(mut blockchain: B) -> io::Result<Self> {
        let runtime = Builder::new_multi_thread().build()?;

        let (sender, mut receiver) = unbounded_channel::<Request<E>>();

        let blockchain_handle = runtime.spawn(async move {
            while let Some(request) = receiver.recv().await {
                if !request.handle(&mut blockchain) {
                    break;
                }
            }
        });

        Ok(Self {
            runtime,
            request_sender: sender,
            blockchain_handle: Some(blockchain_handle),
            phantom: PhantomData,
        })
    }

    /// Retrieves the runtime of the [`AsyncBlockchain`].
    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }

    /// Retrieves the hash of the block corresponding to the specified number.
    pub async fn block_hash_by_number(&self, number: U256) -> Result<B256, E> {
        let (sender, receiver) = oneshot::channel();

        self.request_sender
            .send(Request::BlockHashByNumber { number, sender })
            .expect("Failed to send request");

        receiver.await.unwrap()
    }

    // /// Inserts the specified block number and hash into the state.
    // pub async fn insert_block(&self, block_number: U256, block_hash: B256) -> Result<(), E> {
    //     let (sender, receiver) = oneshot::channel();

    //     self.request_sender
    //         .send(Request::InsertBlock {
    //             block_number,
    //             block_hash,
    //             sender,
    //         })
    //         .expect("Failed to send request");

    //     receiver.await.unwrap()
    // }
}

impl<D, E> Drop for AsyncBlockchain<D, E>
where
    D: SyncBlockchain<E>,
    E: Debug + Send,
{
    fn drop(&mut self) {
        if let Some(handle) = self.blockchain_handle.take() {
            self.request_sender
                .send(Request::Terminate)
                .expect("Failed to send request");

            self.runtime.block_on(handle).unwrap();
        }
    }
}

impl<'b, B, E> Blockchain for &'b AsyncBlockchain<B, E>
where
    B: SyncBlockchain<E>,
    E: Debug + Send + 'static,
{
    type Error = E;

    fn block_hash(&mut self, number: U256) -> Result<B256, Self::Error> {
        task::block_in_place(move || self.runtime.block_on(self.block_hash_by_number(number)))
    }
}
