mod cached;

use std::sync::Arc;

pub use cached::CachedRemoteState;
use edr_eth::{
    remote::{BlockSpec, PreEip1898BlockSpec, RpcClient, RpcClientError},
    Address, B256, U256,
};
use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};
use tokio::runtime;

use super::StateError;

/// A state backed by a remote Ethereum node
#[derive(Debug)]
pub struct RemoteState {
    client: Arc<RpcClient>,
    runtime: runtime::Handle,
    block_number: u64,
}

impl RemoteState {
    /// Construct a new instance using an RPC client for a remote Ethereum node
    /// and a block number from which data will be pulled.
    pub fn new(runtime: runtime::Handle, client: Arc<RpcClient>, block_number: u64) -> Self {
        Self {
            client,
            runtime,
            block_number,
        }
    }

    /// Retrieves the current block number
    pub fn block_number(&self) -> u64 {
        self.block_number
    }

    /// Whether the current state is cacheable based on the block number.
    pub fn is_cacheable(&self) -> Result<bool, StateError> {
        Ok(tokio::task::block_in_place(move || {
            self.runtime
                .block_on(self.client.is_cacheable_block_number(self.block_number))
        })?)
    }

    /// Sets the block number used for calls to the remote Ethereum node.
    pub fn set_block_number(&mut self, block_number: u64) {
        self.block_number = block_number;
    }

    /// Retrieve the state root of the given block, if it exists.
    pub fn state_root(&self, block_number: u64) -> Result<Option<B256>, RpcClientError> {
        Ok(tokio::task::block_in_place(move || {
            self.runtime.block_on(
                self.client
                    .get_block_by_number(PreEip1898BlockSpec::Number(block_number)),
            )
        })?
        .map(|block| block.state_root))
    }
}

impl StateRef for RemoteState {
    type Error = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(Some(tokio::task::block_in_place(move || {
            self.runtime
                .block_on(
                    self.client
                        .get_account_info(&address, Some(BlockSpec::Number(self.block_number))),
                )
                .map_err(StateError::Remote)
        })?))
    }

    fn code_by_hash(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        Err(StateError::InvalidCodeHash(code_hash))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument)]
    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        Ok(tokio::task::block_in_place(move || {
            self.runtime
                .block_on(self.client.get_storage_at(
                    &address,
                    index,
                    Some(BlockSpec::Number(self.block_number)),
                ))
                .map_err(StateError::Remote)
        })?
        .unwrap_or(U256::ZERO))
    }
}

#[cfg(all(test, feature = "test-remote"))]
mod tests {
    use std::str::FromStr;

    use tokio::runtime;

    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn basic_success() {
        let tempdir = tempfile::tempdir().expect("can create tempdir");

        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        let rpc_client = RpcClient::new(&alchemy_url, tempdir.path().to_path_buf(), None);

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let runtime = runtime::Handle::current();

        let account_info: AccountInfo = RemoteState::new(runtime, Arc::new(rpc_client), 16643427)
            .basic(dai_address)
            .expect("should succeed")
            .unwrap();

        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
    }
}
