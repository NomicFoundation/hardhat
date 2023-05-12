#![allow(missing_docs)]

use bytes::Bytes;
use ethbloom::Bloom;
use revm_primitives::{Address, B256, U256};
use ruint::aliases::U160;

#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Log {
    pub address: Address,
    pub topics: Vec<B256>,
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
        stream.append(&ruint::aliases::B160::from_be_bytes(self.address.0));
        stream.append_list(&topics);
        stream.append(&self.data.as_ref());
    }
}

impl rlp::Decodable for Log {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
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
