use revm::{
    db::StateRef,
    primitives::{AccountInfo, Bytecode},
};
use tokio::runtime::{Builder, Handle, Runtime};

use rethnet_eth::{
    remote::{BlockSpec, RpcClient},
    Address, B256, U256,
};

use super::StateError;

/// An revm database backed by a remote Ethereum node
pub struct RemoteState {
    client: RpcClient,
    runtime: Option<Runtime>,
    block_number: U256,
}

impl RemoteState {
    /// Construct a new RemoteDatabse given the URL of a remote Ethereum node and a
    /// block number from which data will be pulled.
    pub fn new(url: &str, block_number: U256) -> Self {
        Self {
            client: RpcClient::new(url),
            runtime: match Handle::try_current() {
                Ok(_) => None,
                Err(_) => Some(
                    Builder::new_multi_thread()
                        .enable_io()
                        .enable_time()
                        .build()
                        .expect("failed to construct async runtime"),
                ),
            },
            block_number,
        }
    }

    fn runtime(&self) -> Handle {
        if let Ok(handle) = Handle::try_current() {
            handle
        } else if self.runtime.is_some() {
            self.runtime.as_ref().unwrap().handle().clone()
        } else {
            panic!("no runtime available")
        }
    }

    /// Retrieve the state root of the given block
    pub fn state_root(&self, block_number: U256) -> Result<B256, StateError> {
        Ok(tokio::task::block_in_place(move || {
            self.runtime().block_on(
                self.client
                    .get_block_by_number(BlockSpec::Number(block_number), true),
            )
        })?
        .state_root)
    }
}

impl StateRef for RemoteState {
    type Error = StateError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(Some(tokio::task::block_in_place(move || {
            self.runtime()
                .block_on(
                    self.client
                        .get_account_info(&address, BlockSpec::Number(self.block_number)),
                )
                .map_err(StateError::Remote)
        })?))
    }

    /// unimplemented
    fn code_by_hash(&self, _code_hash: B256) -> Result<Bytecode, Self::Error> {
        unimplemented!();
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        tokio::task::block_in_place(move || {
            self.runtime()
                .block_on(self.client.get_storage_at(
                    &address,
                    index,
                    BlockSpec::Number(self.block_number),
                ))
                .map_err(StateError::Remote)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::str::FromStr;

    #[test_with::env(ALCHEMY_URL)]
    #[test]
    fn basic_success() {
        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_info: AccountInfo = RemoteState::new(&alchemy_url, U256::from(16643427))
            .basic(dai_address)
            .expect("should succeed")
            .unwrap();

        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
    }
}
