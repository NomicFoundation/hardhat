#![cfg(feature = "test-remote")]

use std::{str::FromStr, sync::Arc};

use edr_defaults::CACHE_DIR;
use edr_eth::{remote::RpcClient, Address, U256};
use edr_evm::{
    state::{AccountModifierFn, ForkState, StateDebug},
    RandomHashGenerator,
};
use edr_test_utils::env::get_alchemy_url;
use parking_lot::Mutex;
use tokio::runtime;

#[tokio::test(flavor = "multi_thread")]
async fn issue_4984() -> anyhow::Result<()> {
    const TEST_CONTRACT_ADDRESS: &str = "0x530B7F66914c1E345DF1683eae4536fc7b80660f";
    const DEPLOYMENT_BLOCK_NUMBER: u64 = 5464258;

    let contract_address = Address::from_str(TEST_CONTRACT_ADDRESS).unwrap();

    let rpc_client = RpcClient::new(
        &get_alchemy_url().replace("mainnet", "sepolia"),
        CACHE_DIR.into(),
        None,
    )?;

    let mut state_root_generator = RandomHashGenerator::with_seed("test");
    let state_root = state_root_generator.generate_next();

    let mut state = ForkState::new(
        runtime::Handle::current(),
        Arc::new(rpc_client),
        Arc::new(Mutex::new(state_root_generator)),
        DEPLOYMENT_BLOCK_NUMBER,
        state_root,
    );

    state.modify_account(
        contract_address,
        AccountModifierFn::new(Box::new(|balance, _nonce, _code| {
            *balance += U256::from(1);
        })),
    )?;

    Ok(())
}
