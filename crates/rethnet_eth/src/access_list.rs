use ruint::aliases::U256;

use crate::Address;

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
#[derive(Debug, Default, Clone, PartialEq, Eq, Hash, rlp::RlpEncodable, rlp::RlpDecodable)]
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
    pub storage_keys: Vec<U256>,
}
