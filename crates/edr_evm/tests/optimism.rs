#![cfg(feature = "test-remote")]

use std::sync::Arc;

use edr_defaults::CACHE_DIR;
use edr_eth::{remote::RpcClient, HashMap, SpecId};
use edr_evm::{
    blockchain::{Blockchain, ForkedBlockchain},
    state::IrregularState,
    RandomHashGenerator,
};
use edr_test_utils::env::get_alchemy_url;
use parking_lot::Mutex;
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn unknown_transaction_types() -> anyhow::Result<()> {
    const BLOCK_NUMBER_WITH_TRANSACTIONS: u64 = 117_156_000;

    let url = get_alchemy_url().replace("eth-", "opt-");
    let rpc_client = RpcClient::new(&url, CACHE_DIR.into(), None)?;
    let mut irregular_state = IrregularState::default();
    let state_root_generator = Arc::new(Mutex::new(RandomHashGenerator::with_seed("test")));
    let hardfork_activation_overrides = HashMap::new();

    let blockchain = ForkedBlockchain::new(
        runtime::Handle::current(),
        None,
        SpecId::LATEST,
        Arc::new(rpc_client),
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
