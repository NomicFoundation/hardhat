use napi::bindgen_prelude::Buffer;
use napi_derive::napi;
use rethnet_eth::{Address, B256};

#[napi(object)]
pub struct AccessListItem {
    /// 20-byte address buffer
    pub address: Buffer,
    pub storage_keys: Vec<Buffer>,
}

impl From<&rethnet_eth::access_list::AccessListItem> for AccessListItem {
    fn from(item: &rethnet_eth::access_list::AccessListItem) -> Self {
        Self {
            address: Buffer::from(item.address.as_bytes()),
            storage_keys: item
                .storage_keys
                .iter()
                .map(|key| Buffer::from(key.as_ref()))
                .collect(),
        }
    }
}

impl From<AccessListItem> for rethnet_eth::access_list::AccessListItem {
    fn from(value: AccessListItem) -> Self {
        let address = Address::from_slice(&value.address);

        let storage_keys = value
            .storage_keys
            .into_iter()
            .map(|key| B256::from_slice(&key))
            .collect::<Vec<_>>();

        rethnet_eth::access_list::AccessListItem {
            address,
            storage_keys,
        }
    }
}
