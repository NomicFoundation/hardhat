#![cfg(feature = "test-utils")]

use std::{convert::Infallible, sync::Arc};

use edr_eth::{
    remote::{eth, PreEip1898BlockSpec},
    B256, U64,
};
use edr_provider::{
    test_utils::create_test_config,
    time::{MockTime, TimeSinceEpoch},
    MethodInvocation, NoopLogger, Provider, ProviderRequest, U64OrUsize,
};
use tokio::runtime;

struct TimestampFixture {
    provider: Provider<Infallible, Arc<MockTime>>,
    mock_timer: Arc<MockTime>,
}

impl TimestampFixture {
    fn new(allow_blocks_with_same_timestamp: bool) -> anyhow::Result<Self> {
        let logger = Box::<NoopLogger>::default();
        let subscription_callback_noop = Box::new(|_| ());

        let mut config = create_test_config();
        config.allow_blocks_with_same_timestamp = allow_blocks_with_same_timestamp;

        let mock_timer = Arc::new(MockTime::now());

        let provider = Provider::new(
            runtime::Handle::current(),
            logger,
            subscription_callback_noop,
            config.clone(),
            mock_timer.clone(),
        )?;

        Ok(Self {
            provider,
            mock_timer,
        })
    }

    fn increase_time(&self, seconds: u64) -> anyhow::Result<()> {
        self.provider.handle_request(ProviderRequest::Single(
            MethodInvocation::EvmIncreaseTime(U64OrUsize::U64(U64::from(seconds))),
        ))?;

        Ok(())
    }

    fn mine_block(&self) -> anyhow::Result<()> {
        self.provider
            .handle_request(ProviderRequest::Single(MethodInvocation::EvmMine(None)))?;

        Ok(())
    }

    fn mine_block_with_timestamp(&self, timestamp: u64) -> anyhow::Result<()> {
        self.provider
            .handle_request(ProviderRequest::Single(MethodInvocation::EvmMine(Some(
                U64OrUsize::U64(U64::from(timestamp)),
            ))))?;

        Ok(())
    }

    fn latest_block_timestamp(&self) -> anyhow::Result<u64> {
        let result = self.provider.handle_request(ProviderRequest::Single(
            MethodInvocation::GetBlockByNumber(PreEip1898BlockSpec::latest(), false),
        ))?;

        let block: eth::Block<B256> = serde_json::from_value(result.result)?;
        Ok(block.timestamp)
    }

    fn set_next_block_timestamp(&self, timestamp: u64) -> anyhow::Result<()> {
        self.provider.handle_request(ProviderRequest::Single(
            MethodInvocation::EvmSetNextBlockTimestamp(U64OrUsize::U64(U64::from(timestamp))),
        ))?;

        Ok(())
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_current_timestamp() -> anyhow::Result<()> {
    const INCREMENT: u64 = 15;

    let fixture = TimestampFixture::new(false)?;
    let now = fixture.mock_timer.since_epoch();

    fixture.mock_timer.add_seconds(INCREMENT);

    fixture.mine_block()?;
    assert_eq!(fixture.latest_block_timestamp()?, now + INCREMENT);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_incremented_timestamp_if_same_as_previous() -> anyhow::Result<()> {
    let fixture = TimestampFixture::new(false)?;
    let first_block_timestamp = fixture.latest_block_timestamp()?;

    fixture.mine_block()?;

    let second_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(second_block_timestamp, first_block_timestamp + 1);

    fixture.mine_block()?;

    let third_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(third_block_timestamp, second_block_timestamp + 1);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_set_next_block_timestamp() -> anyhow::Result<()> {
    const INCREMENT: u64 = 3;

    let fixture = TimestampFixture::new(false)?;

    let timestamp = fixture.mock_timer.since_epoch() + 30;
    fixture.set_next_block_timestamp(timestamp)?;

    fixture.mine_block()?;

    let first_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(first_block_timestamp, timestamp);

    // Mines normally after a block with `evm_setNextBlockTimestamp`
    fixture.mock_timer.add_seconds(INCREMENT);
    fixture.mine_block()?;

    let second_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(second_block_timestamp, first_block_timestamp + INCREMENT);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_set_next_block_timestamp_ignores_increase_time() -> anyhow::Result<()>
{
    const DELTA: u64 = 30;

    let fixture = TimestampFixture::new(false)?;
    let timestamp = fixture.mock_timer.since_epoch() + 20;

    fixture.increase_time(DELTA)?;
    fixture.set_next_block_timestamp(timestamp)?;
    fixture.mine_block()?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, timestamp);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_parameter_ignores_set_next_block_timestamp() -> anyhow::Result<()> {
    let fixture = TimestampFixture::new(false)?;

    let timestamp = fixture.mock_timer.since_epoch() + 30;
    fixture.set_next_block_timestamp(timestamp)?;

    let timestamp = timestamp + 30;
    fixture.mine_block_with_timestamp(timestamp)?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, timestamp);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_increase_time() -> anyhow::Result<()> {
    const DELTA: u64 = 30;

    let fixture = TimestampFixture::new(false)?;
    let now = fixture.mock_timer.since_epoch();

    fixture.increase_time(DELTA)?;
    fixture.mine_block()?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, now + DELTA);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_increase_time_called_twice() -> anyhow::Result<()> {
    const DELTA: u64 = 30;

    let fixture = TimestampFixture::new(false)?;
    let now = fixture.mock_timer.since_epoch();

    fixture.increase_time(DELTA)?;
    fixture.increase_time(DELTA)?;
    fixture.mine_block()?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, now + 2 * DELTA);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_increase_time_includes_elapsed_time() -> anyhow::Result<()> {
    const DELTA: u64 = 30;
    const INCREMENT: u64 = 3;

    let fixture = TimestampFixture::new(false)?;
    let now = fixture.mock_timer.since_epoch();

    fixture.increase_time(DELTA)?;
    fixture.mock_timer.add_seconds(INCREMENT);
    fixture.mine_block()?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, now + DELTA + INCREMENT);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_increase_time_includes_time_offset() -> anyhow::Result<()> {
    const DELTA: u64 = 30;
    const INCREMENT: u64 = 3;

    let fixture = TimestampFixture::new(false)?;
    let timestamp = fixture.mock_timer.since_epoch() + 20;

    fixture.increase_time(DELTA)?;
    fixture.set_next_block_timestamp(timestamp)?;
    fixture.mine_block()?;

    fixture.mock_timer.add_seconds(INCREMENT);
    fixture.mine_block()?;

    let latest_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(latest_block_timestamp, timestamp + INCREMENT);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_allow_same_timestamp() -> anyhow::Result<()> {
    let fixture = TimestampFixture::new(true)?;
    let now = fixture.mock_timer.since_epoch();

    for _ in 0..10 {
        fixture.mine_block()?;

        let latest_block_timestamp = fixture.latest_block_timestamp()?;
        assert_eq!(latest_block_timestamp, now);
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn block_timestamp_with_allow_same_timestamp_includes_elapsed_time() -> anyhow::Result<()> {
    const INCREMENT: u64 = 1;

    let fixture = TimestampFixture::new(true)?;

    fixture.mine_block()?;

    let first_block_timestamp = fixture.latest_block_timestamp()?;

    fixture.mock_timer.add_seconds(INCREMENT);
    fixture.mine_block()?;

    let second_block_timestamp = fixture.latest_block_timestamp()?;
    assert_eq!(second_block_timestamp, first_block_timestamp + INCREMENT);

    Ok(())
}
