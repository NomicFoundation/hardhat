// Part of this code was adapted from ethers-rs and is distributed under their
// licenss:
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-MIT
// For the original context see: https://github.com/gakonst/ethers-rs/blob/3d9c3290d42b77c510e5b5d0b6f7a2f72913bfff/ethers-core/src/types/transaction/eip2930.rs

use alloy_rlp::{RlpDecodable, RlpDecodableWrapper, RlpEncodable, RlpEncodableWrapper};

use crate::{Address, B256, U256};

/// Access list
// NB: Need to use `RlpEncodableWrapper` else we get an extra [] in the output
// https://github.com/gakonst/ethers-rs/pull/353#discussion_r680683869
#[derive(Debug, Default, Clone, PartialEq, Eq, Hash, RlpDecodableWrapper, RlpEncodableWrapper)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct AccessList(pub Vec<AccessListItem>);

impl From<Vec<AccessListItem>> for AccessList {
    fn from(src: Vec<AccessListItem>) -> AccessList {
        AccessList(src)
    }
}

impl From<AccessList> for Vec<AccessListItem> {
    fn from(src: AccessList) -> Vec<AccessListItem> {
        src.0
    }
}

/// Access list item
#[derive(Clone, Debug, Default, PartialEq, Eq, Hash, RlpDecodable, RlpEncodable)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct AccessListItem {
    /// Accessed address
    pub address: Address,
    /// Accessed storage keys
    // In JSON, we have to accept null as well for storage key, but we don't want to to change the
    // type to Option<Vec<_>> as that's invalid in RLP.
    #[cfg_attr(
        feature = "serde",
        serde(deserialize_with = "crate::serde::optional_to_default")
    )]
    pub storage_keys: Vec<B256>,
}

impl From<AccessListItem> for (Address, Vec<U256>) {
    fn from(value: AccessListItem) -> Self {
        (
            value.address,
            value
                .storage_keys
                .into_iter()
                .map(|key| U256::from_be_bytes(key.0))
                .collect(),
        )
    }
}

impl From<AccessList> for Vec<(Address, Vec<U256>)> {
    fn from(value: AccessList) -> Self {
        value.0.into_iter().map(AccessListItem::into).collect()
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn access_list_item() {
        let item_json = json!( {
          "address": "0x1234567890123456789012345678901234567890",
          "storageKeys": null,
        });

        let item: AccessListItem = serde_json::from_value(item_json).unwrap();
    }
}
