use edr_eth::{Address, B256};
use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

use crate::cast::TryCast;

#[napi(object)]
pub struct AccessListItem {
    /// 20-byte address buffer
    pub address: Buffer,
    pub storage_keys: Vec<Buffer>,
}

impl From<&edr_eth::access_list::AccessListItem> for AccessListItem {
    fn from(item: &edr_eth::access_list::AccessListItem) -> Self {
        Self {
            address: Buffer::from(item.address.as_slice()),
            storage_keys: item
                .storage_keys
                .iter()
                .map(|key| Buffer::from(key.as_ref()))
                .collect(),
        }
    }
}

impl TryFrom<AccessListItem> for edr_eth::access_list::AccessListItem {
    type Error = napi::Error;

    fn try_from(value: AccessListItem) -> napi::Result<Self> {
        let address = Address::from_slice(&value.address);

        let storage_keys = value
            .storage_keys
            .into_iter()
            .map(TryCast::<B256>::try_cast)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(edr_eth::access_list::AccessListItem {
            address,
            storage_keys,
        })
    }
}
