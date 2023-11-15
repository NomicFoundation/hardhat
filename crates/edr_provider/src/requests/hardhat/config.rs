use edr_eth::Address;

use crate::{data::ProviderData, ProviderError};

pub fn handle_set_coinbase_request(
    data: &mut ProviderData,
    coinbase: Address,
) -> Result<bool, ProviderError> {
    data.set_coinbase(coinbase);

    Ok(true)
}
