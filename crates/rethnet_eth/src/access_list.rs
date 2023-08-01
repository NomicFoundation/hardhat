// Part of this code was adapted from ethers-rs and is distributed under their licenss:
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-MIT
// For the original context see: https://github.com/gakonst/ethers-rs/blob/3d9c3290d42b77c510e5b5d0b6f7a2f72913bfff/ethers-core/src/types/transaction/eip2930.rs

use revm_primitives::{
    ruint::{self, aliases::U160},
    B256,
};

use crate::{Address, U256};

/// Access list
// NB: Need to use `RlpEncodableWrapper` else we get an extra [] in the output
// https://github.com/gakonst/ethers-rs/pull/353#discussion_r680683869
#[derive(
    Debug, Default, Clone, PartialEq, Eq, Hash, rlp::RlpEncodableWrapper, rlp::RlpDecodableWrapper,
)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodableWrapper, open_fastrlp::RlpDecodableWrapper)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct AccessList(pub Vec<AccessListItem>);

impl From<Vec<AccessListItem>> for AccessList {
    fn from(src: Vec<AccessListItem>) -> AccessList {
        AccessList(src)
    }
}

/// Access list item
#[derive(Debug, Default, Clone, PartialEq, Eq, Hash)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct AccessListItem {
    /// Accessed address
    pub address: Address,
    /// Accessed storage keys
    pub storage_keys: Vec<B256>,
}

impl rlp::Encodable for AccessListItem {
    fn rlp_append(&self, stream: &mut rlp::RlpStream) {
        stream.begin_list(2);
        stream.append(&ruint::aliases::B160::from_be_bytes(self.address.0));

        let storage_keys = self
            .storage_keys
            .iter()
            .map(|key| ruint::aliases::B256::from_be_bytes(key.0))
            .collect::<Vec<_>>();

        stream.append_list(&storage_keys);
    }
}

impl rlp::Decodable for AccessListItem {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
        let result = AccessListItem {
            address: Address::from(rlp.val_at::<U160>(0)?.to_be_bytes()),
            storage_keys: {
                let storage_keys = rlp.list_at::<U256>(1)?;
                storage_keys
                    .into_iter()
                    .map(|key| B256::from(key.to_be_bytes()))
                    .collect()
            },
        };
        Ok(result)
    }
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
