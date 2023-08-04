use ethbloom::Bloom;
use revm_primitives::U256;

use crate::log::Log;

#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct EIP658Receipt {
    pub status_code: u8,
    pub gas_used: U256,
    pub logs_bloom: Bloom,
    pub logs: Vec<Log>,
}

impl rlp::Encodable for EIP658Receipt {
    fn rlp_append(&self, stream: &mut rlp::RlpStream) {
        stream.begin_list(4);
        stream.append(&self.status_code);
        stream.append(&self.gas_used);
        stream.append(&self.logs_bloom);
        stream.append_list(&self.logs);
    }
}

impl rlp::Decodable for EIP658Receipt {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        let result = EIP658Receipt {
            status_code: rlp.val_at(0)?,
            gas_used: rlp.val_at(1)?,
            logs_bloom: rlp.val_at(2)?,
            logs: rlp.list_at(3)?,
        };
        Ok(result)
    }
}
