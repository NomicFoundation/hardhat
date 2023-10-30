mod node_data;
mod node_error;

use std::mem;

use edr_eth::{
    remote::{
        filter::{FilteredEvents, LogOutput},
        BlockSpec,
    },
    serde::ZeroXPrefixedBytes,
    signature::Signature,
    Address, Bytes, U256, U64,
};
use edr_evm::{
    blockchain::BlockchainError,
    state::{AccountModifierFn, StateError},
    AccountInfo, Block, Bytecode, MineBlockResult, KECCAK_EMPTY,
};
use k256::SecretKey;
use tokio::sync::Mutex;

pub use self::node_error::NodeError;
use crate::{filter::Filter, node::node_data::NodeData, Config};

pub struct Node {
    data: Mutex<NodeData>,
}

impl Node {
    pub async fn new(config: &Config) -> Result<Self, NodeError> {
        let node_data = NodeData::new(config).await?;
        Ok(Self {
            data: Mutex::new(node_data),
        })
    }

    async fn lock_data(&self) -> tokio::sync::MutexGuard<'_, NodeData> {
        self.data.lock().await
    }

    async fn execute_in_block_context<T>(
        &self,
        block_spec: Option<&BlockSpec>,
        function: impl FnOnce(&mut NodeData) -> T,
    ) -> Result<T, NodeError> {
        let mut data = self.lock_data().await;

        let block = if let Some(block_spec) = block_spec {
            data.block_by_block_spec(block_spec).await?
        } else {
            data.blockchain.last_block().await?
        };

        let block_header = block.header();

        let mut contextual_state = if let Some(irregular_state) = data
            .irregular_state
            .state_by_block_number(block_header.number)
            .cloned()
        {
            irregular_state
        } else {
            data.blockchain
                .state_at_block_number(block_header.number)
                .await?
        };

        mem::swap(&mut data.state, &mut contextual_state);

        // Execute function in the requested block context.
        let result = function(&mut data);

        // Reset previous state.
        mem::swap(&mut data.state, &mut contextual_state);

        Ok(result)
    }

    pub async fn accounts(&self) -> Vec<Address> {
        let node_data = self.lock_data().await;
        node_data.local_accounts.keys().copied().collect()
    }

    pub async fn balance(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node_data| {
            Ok(node_data
                .state
                .basic(address)?
                .map_or(U256::ZERO, |account| account.balance))
        })
        .await?
    }

    pub async fn block_number(&self) -> u64 {
        let node_data = self.lock_data().await;
        node_data.blockchain.last_block_number().await
    }

    pub async fn chain_id(&self) -> U64 {
        let node_data = self.lock_data().await;
        U64::from(node_data.evm_config.chain_id)
    }

    pub async fn coinbase(&self) -> Address {
        let node_data = self.lock_data().await;
        node_data.beneficiary
    }

    pub async fn get_code(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<ZeroXPrefixedBytes, NodeError> {
        self.execute_in_block_context::<Result<ZeroXPrefixedBytes, NodeError>>(
            block_spec,
            move |node_data| {
                let account_info = node_data.get_account_info(address)?;
                let bytecode = account_info
                    .code
                    .map_or_else::<Result<Bytes, NodeError>, _, _>(
                        || {
                            Ok(node_data
                                .state
                                .code_by_hash(account_info.code_hash)?
                                .bytecode)
                        },
                        |code| Ok(code.bytecode),
                    )?;
                Ok(ZeroXPrefixedBytes::from(bytecode))
            },
        )
        .await?
    }

    pub async fn get_filter_changes(&self, filter_id: &U256) -> Option<FilteredEvents> {
        let mut node_data = self.lock_data().await;

        node_data
            .filters
            .get_mut(filter_id)
            .map(Filter::take_events)
    }

    pub async fn get_filter_logs(
        &self,
        filter_id: &U256,
    ) -> Result<Option<Vec<LogOutput>>, NodeError> {
        let mut node_data = self.lock_data().await;

        node_data
            .filters
            .get_mut(filter_id)
            .map(|filter| {
                if let Some(events) = filter.take_log_events() {
                    Ok(events)
                } else {
                    Err(NodeError::NotLogSubscription {
                        filter_id: *filter_id,
                    })
                }
            })
            .transpose()
    }

    pub async fn get_storage_at(
        &self,
        address: Address,
        position: U256,
        block_spec: Option<&BlockSpec>,
    ) -> Result<U256, NodeError> {
        self.execute_in_block_context::<Result<U256, NodeError>>(block_spec, move |node_data| {
            Ok(node_data.state.storage(address, position)?)
        })
        .await?
    }

    pub async fn get_transaction_count(
        &self,
        address: Address,
        block_spec: Option<&BlockSpec>,
    ) -> Result<u64, NodeError> {
        self.execute_in_block_context::<Result<u64, NodeError>>(block_spec, move |node_data| {
            Ok(node_data.get_account_info(address)?.nonce)
        })
        .await?
    }

    pub async fn impersonate_account(&self, address: Address) {
        let mut node_data = self.lock_data().await;

        node_data.impersonated_accounts.insert(address);
    }

    pub async fn increase_block_time(&self, increment: u64) -> u64 {
        let mut node_data = self.lock_data().await;

        node_data.block_time_offset_seconds += increment;
        node_data.block_time_offset_seconds
    }

    pub async fn local_accounts(&self) -> Vec<LocalAccountInfo> {
        let node_data = self.lock_data().await;

        node_data
            .local_accounts
            .iter()
            .map(|(address, secret_key)| LocalAccountInfo {
                address: *address,
                secret_key: secret_key.clone(),
            })
            .collect()
    }

    pub async fn mine_block(
        &self,
        timestamp: Option<u64>,
    ) -> Result<MineBlockResult<BlockchainError, StateError>, NodeError> {
        let mut node_data = self.lock_data().await;
        let result = node_data.mine_block(timestamp).await?;
        Ok(result)
    }

    pub async fn network_id(&self) -> String {
        let node_data = self.lock_data().await;
        node_data.network_id.to_string()
    }

    pub async fn new_pending_transaction_filter(&self) -> U256 {
        let mut node_data = self.lock_data().await;

        let filter_id = node_data.next_filter_id();
        node_data.filters.insert(
            filter_id,
            Filter::new(
                FilteredEvents::NewPendingTransactions(Vec::new()),
                /* is_subscription */ false,
            ),
        );
        filter_id
    }

    pub async fn remove_filter(&self, filter_id: &U256) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.remove_filter::</* IS_SUBSCRIPTION */ false>(filter_id).await
    }

    pub async fn remove_subscription(&self, filter_id: &U256) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.remove_filter::</* IS_SUBSCRIPTION */ true>(filter_id).await
    }

    pub async fn set_balance(&self, address: Address, balance: U256) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data.state.modify_account(
            address,
            AccountModifierFn::new(Box::new(move |account_balance, _, _| {
                *account_balance = balance;
            })),
            &|| {
                Ok(AccountInfo {
                    balance,
                    nonce: 0,
                    code: None,
                    code_hash: KECCAK_EMPTY,
                })
            },
        )?;

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_code(&self, address: Address, code: Bytes) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        let default_code = code.clone();
        node_data.state.modify_account(
            address,
            AccountModifierFn::new(Box::new(move |_, _, account_code| {
                *account_code = Some(Bytecode::new_raw(code.clone()));
            })),
            &|| {
                Ok(AccountInfo {
                    balance: U256::ZERO,
                    nonce: 0,
                    code: Some(Bytecode::new_raw(default_code.clone())),
                    code_hash: KECCAK_EMPTY,
                })
            },
        )?;

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    /// Set the next block timestamp.
    pub async fn set_next_block_timestamp(&self, timestamp: u64) -> Result<u64, NodeError> {
        use std::cmp::Ordering;

        let mut node_data = self.lock_data().await;

        let latest_block = node_data.blockchain.last_block().await?;
        let latest_block_header = latest_block.header();

        match timestamp.cmp(&latest_block_header.timestamp) {
            Ordering::Less => Err(NodeError::TimestampLowerThanPrevious {
                proposed: timestamp,
                previous: latest_block_header.timestamp,
            }),
            Ordering::Equal => Err(NodeError::TimestampEqualsPrevious {
                proposed: timestamp,
            }),
            Ordering::Greater => {
                node_data.next_block_timestamp = Some(timestamp);
                Ok(timestamp)
            }
        }
    }

    pub async fn set_nonce(&self, address: Address, nonce: u64) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data.state.modify_account(
            address,
            AccountModifierFn::new(Box::new(move |_, account_nonce, _| *account_nonce = nonce)),
            &|| {
                Ok(AccountInfo {
                    balance: U256::ZERO,
                    nonce,
                    code: None,
                    code_hash: KECCAK_EMPTY,
                })
            },
        )?;

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn set_account_storage_slot(
        &self,
        address: Address,
        index: U256,
        value: U256,
    ) -> Result<(), NodeError> {
        let mut node_data = self.lock_data().await;

        node_data
            .state
            .set_account_storage_slot(address, index, value)?;

        let block_number = node_data.blockchain.last_block_number().await;
        let state = node_data.state.clone();
        node_data.irregular_state.insert_state(block_number, state);

        Ok(())
    }

    pub async fn sign(
        &self,
        address: &Address,
        message: ZeroXPrefixedBytes,
    ) -> Result<Signature, NodeError> {
        let node_data = self.lock_data().await;
        match node_data.local_accounts.get(address) {
            Some(secret_key) => Ok(Signature::new(&Bytes::from(message)[..], secret_key)?),
            None => Err(NodeError::UnknownAddress { address: *address }),
        }
    }

    pub async fn stop_impersonating_account(&self, address: Address) -> bool {
        let mut node_data = self.lock_data().await;

        node_data.impersonated_accounts.remove(&address)
    }

    pub async fn last_block_number(&self) -> u64 {
        let node_data = self.lock_data().await;
        node_data.blockchain.last_block_number().await
    }
}

/// An account in this node.
pub struct LocalAccountInfo {
    pub address: Address,
    pub secret_key: SecretKey,
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use edr_eth::U64;
    use tempfile::TempDir;

    use super::*;
    use crate::{create_test_config, Config};

    struct NodeTestFixture {
        // We need to keep the tempdir alive for the duration of the test
        _cache_dir: TempDir,
        config: Config,
        node: Node,
    }

    impl NodeTestFixture {
        pub(crate) async fn new() -> Result<Self> {
            let cache_dir = TempDir::new().expect("should create temp dir");
            let config = create_test_config(cache_dir.path().to_path_buf());
            let node = Node::new(&config).await?;

            Ok(Self {
                _cache_dir: cache_dir,
                config,
                node,
            })
        }
    }

    #[tokio::test]
    async fn chain_id() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let chain_id = fixture.node.chain_id().await;
        assert_eq!(chain_id, U64::from(fixture.config.chain_id));

        Ok(())
    }

    #[tokio::test]
    async fn last_block_number() -> Result<()> {
        let fixture = NodeTestFixture::new().await?;

        let last_block_number = fixture.node.last_block_number().await;
        assert_eq!(last_block_number, 0);

        fixture.node.lock_data().await.mine_block(None).await?;
        let last_block_number = fixture.node.last_block_number().await;
        assert_eq!(last_block_number, 1);

        Ok(())
    }
}
