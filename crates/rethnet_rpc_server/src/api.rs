use async_trait::async_trait;
use rethnet_eth::{remote::BlockSpec, Address, U256};

#[async_trait]
pub trait EthApi {
    /// Error type
    type Error;

    async fn balance(
        &self,
        address: Address,
        block: Option<BlockSpec>,
    ) -> Result<U256, Self::Error>;
}
