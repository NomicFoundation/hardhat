use std::ops::Deref;

use revm_primitives::{B256, U256};

use super::receipt::ReceiptLog;

///
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(untagged))]
pub enum BlockLog {
    /// A full log.
    Full(FullBlockLog),
    /// A partial log, which can only occur for pending blocks.
    Partial(ReceiptLog),
}

/// log object used in TransactionReceipt
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct FullBlockLog {
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub(crate) inner: ReceiptLog,
    /// block hash
    pub block_hash: B256,
    /// block number
    #[serde(serialize_with = "crate::serde::u256::serialize")]
    pub block_number: U256,
    /// Index of the log within the block
    #[serde(with = "crate::serde::u64")]
    pub log_index: u64,
    /// Index of the transaction within the block
    #[serde(with = "crate::serde::u64")]
    pub transaction_index: u64,
}

impl Deref for FullBlockLog {
    type Target = ReceiptLog;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl rlp::Encodable for BlockLog {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.append(match self {
            BlockLog::Partial(log) => log,
            BlockLog::Full(log) => &*log,
        });
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use bytes::Bytes;
    use revm_primitives::Address;

    use crate::log::Log;

    use super::*;

    #[test]
    fn test_full_block_log_serde() {
        let log = FullBlockLog {
            inner: ReceiptLog {
                inner: Log {
                    address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
                    topics: vec![
                        B256::from_str(
                            "000000000000000000000000000000000000000000000000000000000000dead",
                        )
                        .unwrap(),
                        B256::from_str(
                            "000000000000000000000000000000000000000000000000000000000000beef",
                        )
                        .unwrap(),
                    ],
                    data: Bytes::from(hex::decode("0100ff").unwrap()),
                },
                transaction_hash: B256::from_str(
                    "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
                )
                .expect("failed to parse hash from string"),
            },
            block_hash: B256::from_str(
                "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8",
            )
            .unwrap(),
            block_number: U256::from_str_radix("a74fde", 16).expect("couldn't parse data"),
            log_index: u64::from_str_radix("653b", 16).expect("couldn't parse data"),
            transaction_index: u64::from_str_radix("1f", 16).expect("couldn't parse data"),
        };

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: FullBlockLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }

    #[test]
    fn test_block_log_full_serde() {
        let log = BlockLog::Full(FullBlockLog {
            inner: ReceiptLog {
                inner: Log {
                    address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
                    topics: vec![
                        B256::from_str(
                            "000000000000000000000000000000000000000000000000000000000000dead",
                        )
                        .unwrap(),
                        B256::from_str(
                            "000000000000000000000000000000000000000000000000000000000000beef",
                        )
                        .unwrap(),
                    ],
                    data: Bytes::from(hex::decode("0100ff").unwrap()),
                },
                transaction_hash: B256::from_str(
                    "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
                )
                .expect("failed to parse hash from string"),
            },
            block_hash: B256::from_str(
                "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8",
            )
            .unwrap(),
            block_number: U256::from_str_radix("a74fde", 16).expect("couldn't parse data"),
            log_index: u64::from_str_radix("653b", 16).expect("couldn't parse data"),
            transaction_index: u64::from_str_radix("1f", 16).expect("couldn't parse data"),
        });

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: BlockLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }

    #[test]
    fn test_block_log_partial_serde() {
        let log = BlockLog::Partial(ReceiptLog {
            inner: Log {
                address: Address::from_str("0000000000000000000000000000000000000011").unwrap(),
                topics: vec![
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000dead",
                    )
                    .unwrap(),
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000beef",
                    )
                    .unwrap(),
                ],
                data: Bytes::from(hex::decode("0100ff").unwrap()),
            },
            transaction_hash: B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
            )
            .expect("failed to parse hash from string"),
        });

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: BlockLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }
}
