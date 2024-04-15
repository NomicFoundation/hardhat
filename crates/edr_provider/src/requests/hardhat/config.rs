use core::fmt::Debug;

use edr_eth::{Address, B256, U256};

use crate::{
    data::ProviderData,
    requests::{eth::client_version, hardhat::rpc_types::Metadata},
    time::TimeSinceEpoch,
    ProviderError,
};

pub fn handle_get_automine_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &ProviderData<LoggerErrorT, TimerT>,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    Ok(data.is_auto_mining())
}

pub fn handle_metadata_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &ProviderData<LoggerErrorT, TimerT>,
) -> Result<Metadata, ProviderError<LoggerErrorT>> {
    Ok(Metadata {
        client_version: client_version(),
        chain_id: data.chain_id(),
        instance_id: *data.instance_id(),
        latest_block_number: data.last_block_number(),
        latest_block_hash: *data.last_block()?.hash(),
        forked_network: data.fork_metadata().cloned(),
    })
}

pub fn handle_set_coinbase_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    coinbase: Address,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_coinbase(coinbase);

    Ok(true)
}

pub fn handle_set_min_gas_price<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    min_gas_price: U256,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_min_gas_price(min_gas_price)?;

    Ok(true)
}

pub fn handle_set_next_block_base_fee_per_gas_request<
    LoggerErrorT: Debug,
    TimerT: Clone + TimeSinceEpoch,
>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    base_fee_per_gas: U256,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_next_block_base_fee_per_gas(base_fee_per_gas)?;

    Ok(true)
}

pub fn handle_set_prev_randao_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    prev_randao: B256,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.set_next_prev_randao(prev_randao)?;

    Ok(true)
}
