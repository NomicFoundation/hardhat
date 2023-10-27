mod block;
mod filter;
mod receipt;

use ethbloom::Bloom;
use revm_primitives::{
    ruint::{self, aliases::U160},
    Address, Bytes, B256, U256,
};

pub use self::{
    block::{BlockLog, FullBlockLog},
    filter::FilterLog,
    receipt::ReceiptLog,
};

/// Execution log
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Log {
    /// Address
    pub address: Address,
    /// Topics
    pub topics: Vec<B256>,
    /// Data
    #[cfg_attr(feature = "serde", serde(with = "crate::serde::bytes"))]
    pub data: Bytes,
}

impl Log {
    /// Adds the log to a bloom hash.
    pub fn add_to_bloom(&self, bloom: &mut Bloom) {
        bloom.accrue(ethbloom::Input::Raw(self.address.as_bytes()));

        self.topics
            .iter()
            .for_each(|topic| bloom.accrue(ethbloom::Input::Raw(topic.as_bytes())));
    }
}

impl From<revm_primitives::Log> for Log {
    fn from(log: revm_primitives::Log) -> Self {
        let revm_primitives::Log {
            address,
            topics,
            data,
        } = log;
        Log {
            address,
            topics,
            data,
        }
    }
}

impl From<Log> for revm_primitives::Log {
    fn from(log: Log) -> Self {
        let Log {
            address,
            topics,
            data,
        } = log;
        revm_primitives::Log {
            address,
            topics,
            data,
        }
    }
}

impl rlp::Encodable for Log {
    fn rlp_append(&self, stream: &mut rlp::RlpStream) {
        let topics = self
            .topics
            .iter()
            .map(|topic| ruint::aliases::B256::from_be_bytes(topic.0))
            .collect::<Vec<ruint::aliases::B256>>();

        stream.begin_list(3);
        stream.append(&self.address.as_bytes());
        stream.append_list(&topics);
        stream.append(&self.data.as_ref());
    }
}

impl rlp::Decodable for Log {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        let result = Log {
            address: {
                let address = rlp.val_at::<U160>(0)?.to_be_bytes();
                Address::from(address)
            },
            topics: {
                let topics = rlp.list_at::<U256>(1)?;
                topics
                    .into_iter()
                    .map(|topic| B256::from(topic.to_be_bytes()))
                    .collect()
            },
            data: rlp.val_at::<Vec<u8>>(2)?.into(),
        };
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;

    #[test]
    fn test_log_serde() {
        let log = Log {
            address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
            topics: vec![
                B256::from_str("000000000000000000000000000000000000000000000000000000000000dead")
                    .unwrap(),
                B256::from_str("000000000000000000000000000000000000000000000000000000000000beef")
                    .unwrap(),
            ],
            data: Bytes::from(hex::decode("0100ff").unwrap()),
        };

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: Log = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }
}
