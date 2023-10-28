use std::ops::Deref;

use super::block::BlockLog;

/// A log that's returned through a filter query.
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct FilterLog {
    #[cfg_attr(feature = "serde", serde(flatten))]
    inner: BlockLog,
    /// Whether this log was reverted due to a chain reorganisation
    pub removed: bool,
}

impl Deref for FilterLog {
    type Target = BlockLog;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use revm_primitives::{Address, Bytes, B256};

    use crate::log::{FullBlockLog, Log, ReceiptLog};

    use super::*;

    #[test]
    fn test_filter_log_serde() {
        let log = FilterLog {
            inner: BlockLog::Full(FullBlockLog {
                inner: ReceiptLog {
                    inner: Log {
                        address: Address::from_str("0000000000000000000000000000000000000011")
                            .unwrap(),
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
                block_number: 0xa74fde,
                log_index: 0x653b,
                transaction_index: 0x1f,
            }),
            removed: false,
        };

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: FilterLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }
}
