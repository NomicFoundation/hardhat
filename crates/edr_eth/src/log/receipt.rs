use std::ops::Deref;

use alloy_rlp::BufMut;

use crate::{log::Log, B256};

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

impl alloy_rlp::Encodable for ReceiptLog {
    fn encode(&self, out: &mut dyn BufMut) {
        self.inner.encode(out);
    }

    fn length(&self) -> usize {
        self.inner.length()
    }
}

#[cfg(all(test, feature = "serde"))]
mod tests {
    use std::str::FromStr;

    use super::*;
    use crate::{log::Log, Address, Bytes};

    #[test]
    fn test_receipt_log_serde() -> anyhow::Result<()> {
        let log = ReceiptLog {
            inner: Log::new_unchecked(
                Address::from_str("0000000000000000000000000000000000000011")?,
                vec![
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000dead",
                    )?,
                    B256::from_str(
                        "000000000000000000000000000000000000000000000000000000000000beef",
                    )?,
                ],
                Bytes::from(hex::decode("0100ff")?),
            ),
            transaction_hash: B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
            )?,
        };

        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: ReceiptLog = serde_json::from_str(&serialized).unwrap();

        assert_eq!(log, deserialized);

        Ok(())
    }
}
