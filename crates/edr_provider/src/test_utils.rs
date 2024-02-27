use std::{convert::Infallible, time::SystemTime};

use anyhow::anyhow;
use edr_eth::{
    block::{BlobGas, BlockOptions},
    remote::{PreEip1898BlockSpec, RpcClient},
    signature::secret_key_from_str,
    spec::chain_hardfork_activations,
    trie::KECCAK_NULL_RLP,
    withdrawal::Withdrawal,
    Address, HashMap, SpecId, U256,
};
use edr_evm::{alloy_primitives::U160, Block, MineOrdering, RemoteBlock};

use super::*;
use crate::{config::MiningConfig, requests::hardhat::rpc_types::ForkConfig};

pub const TEST_SECRET_KEY: &str =
    "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Address 0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826
pub const TEST_SECRET_KEY_SIGN_TYPED_DATA_V4: &str =
    "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4";

pub const FORK_BLOCK_NUMBER: u64 = 18_725_000;

/// Constructs a test config with a single account with 1 ether
pub fn create_test_config() -> ProviderConfig {
    create_test_config_with_fork(None)
}

pub fn one_ether() -> U256 {
    U256::from(10).pow(U256::from(18))
}

pub fn create_test_config_with_fork(fork: Option<ForkConfig>) -> ProviderConfig {
    ProviderConfig {
        accounts: vec![
            AccountConfig {
                secret_key: secret_key_from_str(TEST_SECRET_KEY)
                    .expect("should construct secret key from string"),
                balance: one_ether(),
            },
            AccountConfig {
                secret_key: secret_key_from_str(TEST_SECRET_KEY_SIGN_TYPED_DATA_V4)
                    .expect("should construct secret key from string"),
                balance: one_ether(),
            },
        ],
        allow_blocks_with_same_timestamp: false,
        allow_unlimited_contract_size: false,
        bail_on_call_failure: false,
        bail_on_transaction_failure: false,
        block_gas_limit: 30_000_000,
        chain_id: 123,
        chains: HashMap::new(),
        coinbase: Address::from(U160::from(1)),
        fork,
        genesis_accounts: HashMap::new(),
        hardfork: SpecId::LATEST,
        initial_base_fee_per_gas: Some(U256::from(1000000000)),
        initial_blob_gas: Some(BlobGas {
            gas_used: 0,
            excess_gas: 0,
        }),
        initial_date: Some(SystemTime::now()),
        initial_parent_beacon_block_root: Some(KECCAK_NULL_RLP),
        min_gas_price: U256::ZERO,
        mining: MiningConfig::default(),
        network_id: 123,
        cache_dir: edr_defaults::CACHE_DIR.into(),
    }
}

/// Retrieves the pending base fee per gas from the provider data.
pub fn pending_base_fee(
    data: &mut ProviderData<Infallible>,
) -> Result<U256, ProviderError<Infallible>> {
    let block = data.mine_pending_block()?.block;

    let base_fee = block
        .header()
        .base_fee_per_gas
        .unwrap_or_else(|| U256::from(1));

    Ok(base_fee)
}

/// Runs a full remote block, asserting that the mined block matches the remote
/// block.
pub async fn run_full_block(url: String, block_number: u64, chain_id: u64) -> anyhow::Result<()> {
    let runtime = tokio::runtime::Handle::current();
    let default_config = create_test_config_with_fork(Some(ForkConfig {
        json_rpc_url: url.clone(),
        block_number: Some(block_number - 1),
        http_headers: None,
    }));

    let replay_block = {
        let rpc_client = RpcClient::new(&url, default_config.cache_dir.clone(), None)?;

        let block = rpc_client
            .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::Number(block_number))
            .await?;

        RemoteBlock::new(block, Arc::new(rpc_client), runtime.clone())?
    };

    let hardfork_activations =
        chain_hardfork_activations(chain_id).ok_or(anyhow!("Unsupported chain id"))?;

    let hardfork = hardfork_activations
        .hardfork_at_block_number(block_number)
        .ok_or(anyhow!("Unsupported block number"))?;

    let replay_header = replay_block.header();
    let block_gas_limit = replay_header.gas_limit;

    let config = ProviderConfig {
        block_gas_limit,
        chain_id,
        coinbase: replay_header.beneficiary,
        hardfork,
        initial_base_fee_per_gas: None,
        mining: MiningConfig {
            auto_mine: false,
            interval: None,
            mem_pool: MemPoolConfig {
                // Use first-in, first-out to replay the transaction in the exact same order
                order: MineOrdering::Fifo,
            },
        },
        network_id: 1,
        ..default_config
    };

    let logger = Box::<NoopLogger>::default();
    let noop_subscription = Box::new(|_| ());

    let mut provider_data = ProviderData::new(runtime, logger, noop_subscription, None, config)?;

    for transaction in replay_block.transactions() {
        provider_data.send_transaction(transaction.clone())?;
    }

    let mined_block = provider_data.mine_and_commit_block(BlockOptions {
        extra_data: Some(replay_header.extra_data.clone()),
        mix_hash: Some(replay_header.mix_hash),
        nonce: Some(replay_header.nonce),
        parent_beacon_block_root: replay_header.parent_beacon_block_root,
        state_root: Some(replay_header.state_root),
        timestamp: Some(replay_header.timestamp),
        withdrawals: replay_block.withdrawals().map(<[Withdrawal]>::to_vec),
        ..BlockOptions::default()
    })?;

    let mined_header = mined_block.block.header();
    assert_eq!(mined_header, replay_header);

    Ok(())
}
