use tokio::runtime::{Builder, Runtime};

use rethnet_eth::remote::{RpcClient, RpcClientError};
use rethnet_eth::{Address, B256, U256};

use revm::{db::DatabaseRef, AccountInfo, Bytecode};

pub struct RemoteDatabase {
    client: RpcClient,
    runtime: Runtime,
}

#[derive(thiserror::Error, Debug)]
pub enum RemoteDatabaseError {
    #[error("The requested method does not have an implementation")]
    UnimplementedMethod(),

    #[error(transparent)]
    RpcError(#[from] RpcClientError),

    /// Some other error from an underlying dependency
    #[error(transparent)]
    OtherError(#[from] std::io::Error),
}

impl RemoteDatabase {
    pub fn _new(url: &str) -> Self {
        Self {
            client: RpcClient::new(url),
            runtime: Builder::new_multi_thread()
                .enable_io()
                .enable_time()
                .build()
                .expect("failed to construct async runtime"),
        }
    }
}

impl DatabaseRef for RemoteDatabase {
    type Error = RemoteDatabaseError;

    fn basic(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(Some(
            self.runtime
                .block_on(self.client.get_account_info(&address, None))
                .map_err(RemoteDatabaseError::RpcError)?,
        ))
    }

    /// unimplemented
    fn code_by_hash(&self, _code_hash: B256) -> Result<Bytecode, Self::Error> {
        Err(Self::Error::UnimplementedMethod())
    }

    fn storage(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.runtime
            .block_on(self.client.get_storage_at(&address, index, None))
            .map_err(RemoteDatabaseError::RpcError)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::str::FromStr;

    #[test]
    fn basic_success() {
        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_info: AccountInfo = RemoteDatabase::_new(&alchemy_url)
            .basic(dai_address)
            .expect("should succeed")
            .unwrap();

        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
    }
}
