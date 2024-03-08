#![cfg(feature = "test-remote")]

use std::sync::Arc;

use edr_defaults::CACHE_DIR;
use edr_eth::{
    remote::{
        client::{
            header::{self, HeaderValue},
            HeaderMap,
        },
        RpcClient,
    },
    HashMap, SpecId,
};
use edr_evm::{
    blockchain::{Blockchain, ForkedBlockchain},
    state::IrregularState,
    RandomHashGenerator,
};
use parking_lot::Mutex;
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn test_optimism() -> anyhow::Result<()> {
    const OPTIMISM_URL: &str = "https://optimism.drpc.org";
    const BLOCK_NUMBER_WITH_TRANSACTIONS: u64 = 117_156_000;

    let mut headers = HeaderMap::new();
    headers.append(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );

    let rpc_client = RpcClient::new(OPTIMISM_URL, CACHE_DIR.into(), Some(headers))?;
    let mut irregular_state = IrregularState::default();
    let state_root_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("test")));
    let hardfork_activation_overrides = HashMap::new();

    let blockchain = ForkedBlockchain::new(
        runtime::Handle::current(),
        None,
        SpecId::LATEST,
        rpc_client,
        None,
        &mut irregular_state,
        state_root_generator,
        &hardfork_activation_overrides,
    )
    .await?;

    let block_with_transactions = blockchain
        .block_by_number(BLOCK_NUMBER_WITH_TRANSACTIONS)?
        .expect("Block must exist");

    let _receipts = block_with_transactions.transaction_receipts()?;

    Ok(())
}
