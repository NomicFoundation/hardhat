use napi::{bindgen_prelude::Buffer, Status};
use napi_derive::napi;
use rethnet_eth::{Address, U256};

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
                .map(|key| Buffer::from(key.as_le_bytes().as_ref()))
                .collect(),
        }
    }
}

impl TryFrom<AccessListItem> for rethnet_eth::access_list::AccessListItem {
    type Error = napi::Error;

    fn try_from(value: AccessListItem) -> Result<Self, Self::Error> {
        let address = Address::from_slice(&value.address);

        let storage_keys = value
            .storage_keys
            .into_iter()
            .map(|key| {
                U256::try_from_le_slice(&key).ok_or_else(|| {
                    napi::Error::new(Status::InvalidArg, "Expected a buffer containing 32 bytes")
                })
            })
            .collect::<napi::Result<Vec<U256>>>()?;

        Ok(rethnet_eth::access_list::AccessListItem {
            address,
            storage_keys,
        })
    }
}
