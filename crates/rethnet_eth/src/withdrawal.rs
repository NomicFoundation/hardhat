//! Ethereum withdrawal type

use revm_primitives::{
    ruint::{self, aliases::U160},
    Address, U256,
};

/// Ethereum withdrawal
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct Withdrawal {
    /// The index of withdrawal
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub index: u64,
    /// The index of the validator that generated the withdrawal
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub validator_index: u64,
    /// The recipient address for withdrawal value
    pub address: Address,
    /// The value contained in withdrawal
    pub amount: U256,
}

impl rlp::Decodable for Withdrawal {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        Ok(Self {
            index: rlp.val_at(0)?,
            validator_index: rlp.val_at(1)?,
            address: {
                let address = rlp.val_at::<U160>(2)?.to_be_bytes();
                Address::from(address)
            },
            amount: rlp.val_at(3)?,
        })
    }
}

impl rlp::Encodable for Withdrawal {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(4);
        s.append(&self.index);
        s.append(&self.validator_index);
        s.append(&ruint::aliases::B160::from_be_bytes(self.address.0));
        s.append(&self.amount);
    }
}
