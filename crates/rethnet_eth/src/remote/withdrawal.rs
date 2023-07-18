use revm_primitives::{
    ruint::{
        self,
        aliases::{U128, U160},
    },
    Address, U256,
};

/// Ethereum withdrawal
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct Withdrawal {
    /// The index of withdrawal
    pub index: U128,
    /// The index of the validator that generated the withdrawal
    pub validator_index: U128,
    /// The recipient address for withdrawal value
    pub address: Address,
    /// The value contained in withdrawal
    pub amount: U256,
}

impl rlp::Decodable for Withdrawal {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
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
