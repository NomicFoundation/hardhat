use edr_eth::{Address, SpecId, U256};

use crate::{data::ProviderData, ProviderError};

pub fn handle_set_coinbase_request(
    data: &mut ProviderData,
    coinbase: Address,
) -> Result<bool, ProviderError> {
    data.set_coinbase(coinbase);

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
