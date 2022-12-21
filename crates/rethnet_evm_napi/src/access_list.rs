use std::str::FromStr;

use napi::Status;
use napi_derive::napi;
use rethnet_eth::{Address, U256};

#[napi(object)]
pub struct AccessListItem {
    pub address: String,
    pub storage_keys: Vec<String>,
}

impl TryFrom<AccessListItem> for rethnet_eth::access_list::AccessListItem {
    type Error = napi::Error;

    fn try_from(value: AccessListItem) -> Result<Self, Self::Error> {
        let address = Address::from_str(&value.address)
            .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        let storage_keys = value
            .storage_keys
            .into_iter()
            .map(|key| {
                U256::from_str(&key)
                    .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))
            })
            .collect::<napi::Result<Vec<U256>>>()?;

        Ok(rethnet_eth::access_list::AccessListItem {
            address,
            storage_keys,
        })
    }
}
