use std::sync::Arc;

use async_rwlock::RwLock;
use async_trait::async_trait;
use rethnet_eth::{
    remote::{BlockSpec, Eip1898BlockSpec},
    Address, U256,
};
use rethnet_evm::{
    blockchain::{BlockchainError, SyncBlockchain},
    state::{StateError, SyncState},
};
use tracing::{event, Level};

use crate::api::EthApi;

pub struct Node {
    blockchain: Box<dyn SyncBlockchain<BlockchainError>>,
    state: Box<dyn SyncState<StateError>>,
}

impl Node {
    async fn execute_in_block_context<T>(&self, function: FnOnce() -> T) -> Result<T, NodeError> {
        let previous_state_root = self.state.state_root()?;

        self.state.set_block_context(state_root, block_number)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    #[error(transparent)]
    Blockchain(#[from] BlockchainError),
    #[error(transparent)]
    State(#[from] StateError),
}

#[async_trait]
impl EthApi for Node {
    type Error = NodeError;

    async fn balance(
        &self,
        address: Address,
        block: Option<BlockSpec>,
    ) -> Result<U256, Self::Error> {
        event!(Level::INFO, "eth_getBalance({address:?}, {block:?})");
        match set_block_context(&self.inner, block).await {
            Ok(previous_state_root) => {
                let account_info = get_account_info(&state, address).await;
                match restore_block_context(&state, previous_state_root).await {
                    Ok(()) => match account_info {
                        Ok(account_info) => ResponseData::Success {
                            result: account_info.balance,
                        },
                        Err(e) => e,
                    },
                    Err(e) => e,
                }
            }
            Err(e) => e,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ResolveBlockError {
    #[error(transparent)]
    Blockchain(BlockchainError),
}

async fn resolve_block_spec(
    blockchain: &dyn Blockchain<Error = BlockchainError>,
    block_spec: BlockSpec,
) -> Result<Eip1898BlockSpec, ResolveBlockError> {
    match block_spec {
        BlockSpec::Number(number) => Ok(Eip1898BlockSpec::Number { block_number: () } * number),
        BlockSpec::Tag(tag) => match tag {
            BlockTag::Earliest => Ok(U256::ZERO),
            BlockTag::Safe | BlockTag::Finalized => {
                confirm_post_merge_hardfork(blockchain).await?;
                Ok(blockchain.last_block_number().await)
            }
            BlockTag::Latest | BlockTag::Pending => Ok(blockchain.last_block_number().await),
        },
        BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
            block_hash,
            require_canonical,
        }) => {
            _block_number_from_hash(blockchain, block_hash, require_canonical.unwrap_or(false))
                .await
        }
        BlockSpec::Eip1898(Eip1898BlockSpec::Number { block_number }) => Ok(*block_number),
    }
}
