use edr_eth::{Address, SpecId, B256, U256};
use rpc_hardhat::Metadata;

use crate::{data::ProviderData, requests::eth::client_version, ProviderError};

pub fn handle_get_automine_request(data: &ProviderData) -> Result<bool, ProviderError> {
    Ok(data.is_auto_mining())
}

pub fn handle_metadata_request(data: &ProviderData) -> Result<Metadata, ProviderError> {
    Ok(Metadata {
        client_version: client_version(),
        chain_id: data.chain_id(),
        instance_id: *data.instance_id(),
        latest_block_number: data.last_block_number(),
        latest_block_hash: *data.last_block()?.hash(),
        forked_network: data.fork_metadata().cloned(),
    })
}

pub fn handle_set_coinbase_request(
    data: &mut ProviderData,
    coinbase: Address,
) -> Result<bool, ProviderError> {
    data.set_coinbase(coinbase);

    Ok(true)
}

pub fn handle_set_min_gas_price(
    data: &mut ProviderData,
    min_gas_price: U256,
) -> Result<bool, ProviderError> {
    data.set_min_gas_price(min_gas_price)?;

    Ok(true)
}

pub fn handle_set_next_block_base_fee_per_gas_request(
    data: &mut ProviderData,
    base_fee_per_gas: U256,
) -> Result<bool, ProviderError> {
    let spec_id = data.spec_id();
    if spec_id < SpecId::LONDON {
        return Err(ProviderError::UnmetHardfork {
            actual: spec_id,
            minimum: SpecId::LONDON,
        });
    }

    data.set_next_block_base_fee_per_gas(base_fee_per_gas);

    Ok(true)
}

pub fn handle_set_prev_randao_request(
    data: &mut ProviderData,
    prev_randao: B256,
) -> Result<bool, ProviderError> {
    let spec_id = data.spec_id();
    if spec_id < SpecId::MERGE {
        return Err(ProviderError::UnmetHardfork {
            actual: spec_id,
            minimum: SpecId::MERGE,
        });
    }

    data.set_next_prev_randao(prev_randao);

    Ok(true)
}
