use std::ops::Deref;

use revm_primitives::B256;

use super::Log;

/// A log that's part of a transaction receipt.
#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct ReceiptLog {
    /// Execution log
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub inner: Log,
    /// transaction hash
    pub transaction_hash: B256,
}

impl Deref for ReceiptLog {
    type Target = Log;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl rlp::Encodable for ReceiptLog {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.append(&self.inner);
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use revm_primitives::{Address, Bytes};

    use crate::log::Log;

    use super::*;

    #[test]
    fn test_receipt_log_serde() {
        let log = ReceiptLog {
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
        };

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: ReceiptLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);
    }
}
