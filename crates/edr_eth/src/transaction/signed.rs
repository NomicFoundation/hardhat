mod eip155;
mod eip1559;
mod eip2930;
mod eip4844;
mod legacy;

use alloy_rlp::{Buf, BufMut, Decodable};

pub use self::{
    eip155::Eip155SignedTransaction, eip1559::Eip1559SignedTransaction,
    eip2930::Eip2930SignedTransaction, eip4844::Eip4844SignedTransaction,
    legacy::LegacySignedTransaction,
};
use super::kind::TransactionKind;
use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    utils::enveloped,
    Address, Bytes, B256, U256,
};

#[derive(Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum SignedTransaction {
    /// Legacy transaction type
    PreEip155Legacy(LegacySignedTransaction),
    /// EIP-155 transaction
    PostEip155Legacy(Eip155SignedTransaction),
    /// EIP-2930 transaction
    Eip2930(Eip2930SignedTransaction),
    /// EIP-1559 transaction
    Eip1559(Eip1559SignedTransaction),
    /// EIP-4844 transaction
    Eip4844(Eip4844SignedTransaction),
}

impl SignedTransaction {
    /// Returns the gas price of the transaction.
    pub fn gas_price(&self) -> U256 {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.gas_price,
            SignedTransaction::PostEip155Legacy(tx) => tx.gas_price,
            SignedTransaction::Eip2930(tx) => tx.gas_price,
            SignedTransaction::Eip1559(tx) => tx.max_fee_per_gas,
            SignedTransaction::Eip4844(tx) => tx.max_fee_per_gas,
        }
    }

    /// Returns the gas limit of the transaction.
    pub fn gas_limit(&self) -> u64 {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.gas_limit,
            SignedTransaction::PostEip155Legacy(tx) => tx.gas_limit,
            SignedTransaction::Eip2930(tx) => tx.gas_limit,
            SignedTransaction::Eip1559(tx) => tx.gas_limit,
            SignedTransaction::Eip4844(tx) => tx.gas_limit,
        }
    }

    /// Returns the value of the transaction.
    pub fn value(&self) -> U256 {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.value,
            SignedTransaction::PostEip155Legacy(tx) => tx.value,
            SignedTransaction::Eip2930(tx) => tx.value,
            SignedTransaction::Eip1559(tx) => tx.value,
            SignedTransaction::Eip4844(tx) => tx.value,
        }
    }

    /// Returns the input data of the transaction.
    pub fn data(&self) -> &Bytes {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => &tx.input,
            SignedTransaction::PostEip155Legacy(tx) => &tx.input,
            SignedTransaction::Eip2930(tx) => &tx.input,
            SignedTransaction::Eip1559(tx) => &tx.input,
            SignedTransaction::Eip4844(tx) => &tx.input,
        }
    }

    /// Returns the access list of the transaction, if any.
    pub fn access_list(&self) -> Option<&AccessList> {
        match self {
            SignedTransaction::PreEip155Legacy(_) | SignedTransaction::PostEip155Legacy(_) => None,
            SignedTransaction::Eip2930(tx) => Some(&tx.access_list),
            SignedTransaction::Eip1559(tx) => Some(&tx.access_list),
            SignedTransaction::Eip4844(tx) => Some(&tx.access_list),
        }
    }

    /// Max cost of the transaction
    pub fn max_cost(&self) -> U256 {
        U256::from(self.gas_limit()).saturating_mul(self.gas_price())
    }

    /// Retrieves the max fee per gas of the transaction, if any.
    pub fn max_fee_per_gas(&self) -> Option<U256> {
        match self {
            SignedTransaction::PreEip155Legacy(_)
            | SignedTransaction::PostEip155Legacy(_)
            | SignedTransaction::Eip2930(_) => None,
            SignedTransaction::Eip1559(tx) => Some(tx.max_fee_per_gas),
            SignedTransaction::Eip4844(tx) => Some(tx.max_fee_per_gas),
        }
    }

    /// Retrieves the max priority fee per gas of the transaction, if any.
    pub fn max_priority_fee_per_gas(&self) -> Option<U256> {
        match self {
            SignedTransaction::PreEip155Legacy(_)
            | SignedTransaction::PostEip155Legacy(_)
            | SignedTransaction::Eip2930(_) => None,
            SignedTransaction::Eip1559(tx) => Some(tx.max_priority_fee_per_gas),
            SignedTransaction::Eip4844(tx) => Some(tx.max_priority_fee_per_gas),
        }
    }

    /// Retrieves the max fee per blob gas of the transaction, if any.
    pub fn max_fee_per_blob_gas(&self) -> Option<U256> {
        match self {
            SignedTransaction::PreEip155Legacy(_)
            | SignedTransaction::PostEip155Legacy(_)
            | SignedTransaction::Eip2930(_)
            | SignedTransaction::Eip1559(_) => None,
            SignedTransaction::Eip4844(tx) => Some(tx.max_fee_per_blob_gas),
        }
    }

    /// Retrieves the blob hashes of the transaction, if any.
    pub fn blob_hashes(&self) -> Option<Vec<B256>> {
        match self {
            SignedTransaction::PreEip155Legacy(_)
            | SignedTransaction::PostEip155Legacy(_)
            | SignedTransaction::Eip2930(_)
            | SignedTransaction::Eip1559(_) => None,
            SignedTransaction::Eip4844(tx) => Some(tx.blob_hashes.clone()),
        }
    }

    /// Upfront cost of the transaction
    pub fn upfront_cost(&self) -> U256 {
        self.max_cost().saturating_add(self.value())
    }

    /// Returns the nonce of the transaction.
    pub fn nonce(&self) -> u64 {
        match self {
            SignedTransaction::PreEip155Legacy(t) => t.nonce,
            SignedTransaction::PostEip155Legacy(t) => t.nonce,
            SignedTransaction::Eip2930(t) => t.nonce,
            SignedTransaction::Eip1559(t) => t.nonce,
            SignedTransaction::Eip4844(t) => t.nonce,
        }
    }

    /// Returns the chain id of the transaction.
    pub fn chain_id(&self) -> Option<u64> {
        match self {
            SignedTransaction::PreEip155Legacy(_) => None,
            SignedTransaction::PostEip155Legacy(t) => Some(t.chain_id()),
            SignedTransaction::Eip2930(t) => Some(t.chain_id),
            SignedTransaction::Eip1559(t) => Some(t.chain_id),
            SignedTransaction::Eip4844(t) => Some(t.chain_id),
        }
    }

    pub fn as_legacy(&self) -> Option<&LegacySignedTransaction> {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => Some(tx),
            _ => None,
        }
    }

    /// Returns whether this is a legacy transaction
    pub fn is_legacy(&self) -> bool {
        matches!(self, SignedTransaction::PreEip155Legacy(_))
    }

    /// Returns whether this is an EIP-1559 transaction
    pub fn is_eip1559(&self) -> bool {
        matches!(self, SignedTransaction::Eip1559(_))
    }

    /// Computes the hash of the transaction.
    pub fn hash(&self) -> &B256 {
        match self {
            SignedTransaction::PreEip155Legacy(t) => t.hash(),
            SignedTransaction::PostEip155Legacy(t) => t.hash(),
            SignedTransaction::Eip2930(t) => t.hash(),
            SignedTransaction::Eip1559(t) => t.hash(),
            SignedTransaction::Eip4844(t) => t.hash(),
        }
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.recover(),
            SignedTransaction::PostEip155Legacy(tx) => tx.recover(),
            SignedTransaction::Eip2930(tx) => tx.recover(),
            SignedTransaction::Eip1559(tx) => tx.recover(),
            SignedTransaction::Eip4844(tx) => tx.recover(),
        }
    }

    /// Returns what kind of transaction this is
    pub fn kind(&self) -> TransactionKind {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.kind,
            SignedTransaction::PostEip155Legacy(tx) => tx.kind,
            SignedTransaction::Eip2930(tx) => tx.kind,
            SignedTransaction::Eip1559(tx) => tx.kind,
            SignedTransaction::Eip4844(tx) => TransactionKind::Call(tx.to),
        }
    }

    /// Returns the callee if this transaction is a call
    pub fn to(&self) -> Option<Address> {
        self.kind().as_call().copied()
    }

    /// Returns the [`Signature`] of the transaction
    pub fn signature(&self) -> Signature {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.signature,
            SignedTransaction::PostEip155Legacy(tx) => tx.signature,
            SignedTransaction::Eip2930(tx) => Signature {
                r: tx.r,
                s: tx.s,
                v: u64::from(tx.odd_y_parity),
            },
            SignedTransaction::Eip1559(tx) => Signature {
                r: tx.r,
                s: tx.s,
                v: u64::from(tx.odd_y_parity),
            },
            SignedTransaction::Eip4844(tx) => Signature {
                r: tx.r,
                s: tx.s,
                v: u64::from(tx.odd_y_parity),
            },
        }
    }

    pub fn transaction_type(&self) -> u64 {
        match self {
            SignedTransaction::PreEip155Legacy(_) | SignedTransaction::PostEip155Legacy(_) => 0,
            SignedTransaction::Eip2930(_) => 1,
            SignedTransaction::Eip1559(_) => 2,
            SignedTransaction::Eip4844(_) => 3,
        }
    }
}

impl Decodable for SignedTransaction {
    fn decode(buf: &mut &[u8]) -> alloy_rlp::Result<Self> {
        fn is_list(byte: u8) -> bool {
            byte >= 0xc0
        }

        let first = buf.first().ok_or(alloy_rlp::Error::InputTooShort)?;

        match *first {
            0x01 => {
                buf.advance(1);

                Ok(SignedTransaction::Eip2930(
                    Eip2930SignedTransaction::decode(buf)?,
                ))
            }
            0x02 => {
                buf.advance(1);

                Ok(SignedTransaction::Eip1559(
                    Eip1559SignedTransaction::decode(buf)?,
                ))
            }
            0x03 => {
                buf.advance(1);

                Ok(SignedTransaction::Eip4844(
                    Eip4844SignedTransaction::decode(buf)?,
                ))
            }
            byte if is_list(byte) => {
                let tx = LegacySignedTransaction::decode(buf)?;
                if tx.signature.v >= 35 {
                    Ok(SignedTransaction::PostEip155Legacy(tx.into()))
                } else {
                    Ok(SignedTransaction::PreEip155Legacy(tx))
                }
            }
            _ => Err(alloy_rlp::Error::Custom("invalid tx type")),
        }
    }
}

impl alloy_rlp::Encodable for SignedTransaction {
    fn encode(&self, out: &mut dyn BufMut) {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.encode(out),
            SignedTransaction::PostEip155Legacy(tx) => tx.encode(out),
            SignedTransaction::Eip2930(tx) => enveloped(1, tx, out),
            SignedTransaction::Eip1559(tx) => enveloped(2, tx, out),
            SignedTransaction::Eip4844(tx) => enveloped(3, tx, out),
        }
    }

    fn length(&self) -> usize {
        match self {
            SignedTransaction::PreEip155Legacy(tx) => tx.length(),
            SignedTransaction::PostEip155Legacy(tx) => tx.length(),
            SignedTransaction::Eip2930(tx) => tx.length() + 1,
            SignedTransaction::Eip1559(tx) => tx.length() + 1,
            SignedTransaction::Eip4844(tx) => tx.length() + 1,
        }
    }
}

impl From<LegacySignedTransaction> for SignedTransaction {
    fn from(transaction: LegacySignedTransaction) -> Self {
        Self::PreEip155Legacy(transaction)
    }
}

impl From<Eip155SignedTransaction> for SignedTransaction {
    fn from(transaction: Eip155SignedTransaction) -> Self {
        Self::PostEip155Legacy(transaction)
    }
}

impl From<Eip2930SignedTransaction> for SignedTransaction {
    fn from(transaction: Eip2930SignedTransaction) -> Self {
        Self::Eip2930(transaction)
    }
}

impl From<Eip1559SignedTransaction> for SignedTransaction {
    fn from(transaction: Eip1559SignedTransaction) -> Self {
        Self::Eip1559(transaction)
    }
}

impl From<Eip4844SignedTransaction> for SignedTransaction {
    fn from(transaction: Eip4844SignedTransaction) -> Self {
        Self::Eip4844(transaction)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::OnceLock;

    use revm_primitives::Bytes;

    use super::*;

    #[test]
    fn can_recover_sender() {
        let bytes = hex::decode("f85f800182520894095e7baea6a6c7c4c2dfeb977efac326af552d870a801ba048b55bfa915ac795c431978d8a6a992b628d557da5ff759b307d495a36649353a0efffd310ac743f371de3b9f7f9cb56c0b28ad43601b4ab949f53faa07bd2c804").unwrap();

        let tx = SignedTransaction::decode(&mut bytes.as_slice())
            .expect("decoding TypedTransaction failed");
        let tx = match tx {
            SignedTransaction::PreEip155Legacy(tx) => tx,
            _ => panic!("Invalid typed transaction"),
        };
        assert_eq!(tx.input, Bytes::new());
        assert_eq!(tx.gas_price, U256::from(0x01u64));
        assert_eq!(tx.gas_limit, 0x5208u64);
        assert_eq!(tx.nonce, 0x00u64);
        if let TransactionKind::Call(ref to) = tx.kind {
            assert_eq!(
                *to,
                "0x095e7baea6a6c7c4c2dfeb977efac326af552d87"
                    .parse::<Address>()
                    .unwrap()
            );
        } else {
            panic!();
        }
        assert_eq!(tx.value, U256::from(0x0au64));
        assert_eq!(
            tx.recover().unwrap(),
            "0x0f65fe9276bc9a24ae7083ae28e2660ef72df99e"
                .parse::<Address>()
                .unwrap()
        );
    }

    macro_rules! impl_test_signed_transaction_encoding_round_trip {
        ($(
            $name:ident => $transaction:expr,
        )+) => {
            $(
                paste::item! {
                    #[test]
                    fn [<signed_transaction_encoding_round_trip_ $name>]() {
                        let transaction = $transaction;

                        let encoded = alloy_rlp::encode(&transaction);
                        let decoded = SignedTransaction::decode(&mut encoded.as_slice()).unwrap();

                        assert_eq!(decoded, transaction);
                    }
                }
            )+
        };
    }

    impl_test_signed_transaction_encoding_round_trip! {
            pre_eip155 => SignedTransaction::PreEip155Legacy(LegacySignedTransaction {
                nonce: 0,
                gas_price: U256::from(1),
                gas_limit: 2,
                kind: TransactionKind::Call(Address::default()),
                value: U256::from(3),
                input: Bytes::from(vec![1, 2]),
                signature: Signature {
                    r: U256::default(),
                    s: U256::default(),
                    v: 1,
                },
                hash: OnceLock::new(),
            }),
            post_eip155 => SignedTransaction::PostEip155Legacy(Eip155SignedTransaction {
                nonce: 0,
                gas_price: U256::from(1),
                gas_limit: 2,
                kind: TransactionKind::Create,
                value: U256::from(3),
                input: Bytes::from(vec![1, 2]),
                signature: Signature {
                    r: U256::default(),
                    s: U256::default(),
                    v: 37,
                },
                hash: OnceLock::new(),
            }),
            eip2930 => SignedTransaction::Eip2930(Eip2930SignedTransaction {
                chain_id: 1,
                nonce: 0,
                gas_price: U256::from(1),
                gas_limit: 2,
                kind: TransactionKind::Call(Address::random()),
                value: U256::from(3),
                input: Bytes::from(vec![1, 2]),
                odd_y_parity: true,
                r: U256::default(),
                s: U256::default(),
                access_list: vec![].into(),
                hash: OnceLock::new(),
            }),
            eip1559 => SignedTransaction::Eip1559(Eip1559SignedTransaction {
                chain_id: 1,
                nonce: 0,
                max_priority_fee_per_gas: U256::from(1),
                max_fee_per_gas: U256::from(2),
                gas_limit: 3,
                kind: TransactionKind::Create,
                value: U256::from(4),
                input: Bytes::from(vec![1, 2]),
                access_list: vec![].into(),
                odd_y_parity: true,
                r: U256::default(),
                s: U256::default(),
                hash: OnceLock::new(),
            }),
            eip4844 => SignedTransaction::Eip4844(Eip4844SignedTransaction {
                chain_id: 1,
                nonce: 0,
                max_priority_fee_per_gas: U256::from(1),
                max_fee_per_gas: U256::from(2),
                max_fee_per_blob_gas: U256::from(7),
                gas_limit: 3,
                to: Address::random(),
                value: U256::from(4),
                input: Bytes::from(vec![1, 2]),
                access_list: vec![].into(),
                blob_hashes: vec![B256::random(), B256::random()],
                odd_y_parity: true,
                r: U256::default(),
                s: U256::default(),
                hash: OnceLock::new(),
            }),
    }

    #[test]
    fn test_signed_transaction_decode_multiple_networks() {
        use std::str::FromStr;

        let bytes_first = hex::decode("f86b02843b9aca00830186a094d3e8763675e4c425df46cc3b5c0f6cbdac39604687038d7ea4c68000802ba00eb96ca19e8a77102767a41fc85a36afd5c61ccb09911cec5d3e86e193d9c5aea03a456401896b1b6055311536bf00a718568c744d8c1f9df59879e8350220ca18").unwrap();
        let expected = SignedTransaction::PostEip155Legacy(Eip155SignedTransaction {
            nonce: 2u64,
            gas_price: U256::from(1000000000u64),
            gas_limit: 100000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap(),
            )),
            value: U256::from(1000000000000000u64),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "0xeb96ca19e8a77102767a41fc85a36afd5c61ccb09911cec5d3e86e193d9c5ae",
                )
                .unwrap(),
                s: U256::from_str(
                    "0x3a456401896b1b6055311536bf00a718568c744d8c1f9df59879e8350220ca18",
                )
                .unwrap(),
            },
            hash: OnceLock::new(),
        });
        assert_eq!(
            expected,
            SignedTransaction::decode(&mut bytes_first.as_slice()).unwrap()
        );

        let bytes_second = hex::decode("f86b01843b9aca00830186a094d3e8763675e4c425df46cc3b5c0f6cbdac3960468702769bb01b2a00802ba0e24d8bd32ad906d6f8b8d7741e08d1959df021698b19ee232feba15361587d0aa05406ad177223213df262cb66ccbb2f46bfdccfdfbbb5ffdda9e2c02d977631da").unwrap();
        let expected = SignedTransaction::PostEip155Legacy(Eip155SignedTransaction {
            nonce: 1,
            gas_price: U256::from(1000000000u64),
            gas_limit: 100000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap(),
            )),
            value: U256::from(693361000000000u64),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "0xe24d8bd32ad906d6f8b8d7741e08d1959df021698b19ee232feba15361587d0a",
                )
                .unwrap(),
                s: U256::from_str(
                    "0x5406ad177223213df262cb66ccbb2f46bfdccfdfbbb5ffdda9e2c02d977631da",
                )
                .unwrap(),
            },
            hash: OnceLock::new(),
        });
        assert_eq!(
            expected,
            SignedTransaction::decode(&mut bytes_second.as_slice()).unwrap()
        );

        let bytes_third = hex::decode("f86b0384773594008398968094d3e8763675e4c425df46cc3b5c0f6cbdac39604687038d7ea4c68000802ba0ce6834447c0a4193c40382e6c57ae33b241379c5418caac9cdc18d786fd12071a03ca3ae86580e94550d7c071e3a02eadb5a77830947c9225165cf9100901bee88").unwrap();
        let expected = SignedTransaction::PostEip155Legacy(Eip155SignedTransaction {
            nonce: 3,
            gas_price: U256::from(2000000000u64),
            gas_limit: 10000000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap(),
            )),
            value: U256::from(1000000000000000u64),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "0xce6834447c0a4193c40382e6c57ae33b241379c5418caac9cdc18d786fd12071",
                )
                .unwrap(),
                s: U256::from_str(
                    "0x3ca3ae86580e94550d7c071e3a02eadb5a77830947c9225165cf9100901bee88",
                )
                .unwrap(),
            },
            hash: OnceLock::new(),
        });
        assert_eq!(
            expected,
            SignedTransaction::decode(&mut bytes_third.as_slice()).unwrap()
        );

        let bytes_fourth = hex::decode("02f872041a8459682f008459682f0d8252089461815774383099e24810ab832a5b2a5425c154d58829a2241af62c000080c001a059e6b67f48fb32e7e570dfb11e042b5ad2e55e3ce3ce9cd989c7e06e07feeafda0016b83f4f980694ed2eee4d10667242b1f40dc406901b34125b008d334d47469").unwrap();
        let expected = SignedTransaction::Eip1559(Eip1559SignedTransaction {
            chain_id: 4,
            nonce: 26,
            max_priority_fee_per_gas: U256::from(1500000000u64),
            max_fee_per_gas: U256::from(1500000013u64),
            gas_limit: 21000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("61815774383099e24810ab832a5b2a5425c154d5").unwrap(),
            )),
            value: U256::from(3000000000000000000u64),
            input: Bytes::default(),
            access_list: AccessList::default(),
            odd_y_parity: true,
            r: U256::from_str("0x59e6b67f48fb32e7e570dfb11e042b5ad2e55e3ce3ce9cd989c7e06e07feeafd")
                .unwrap(),
            s: U256::from_str("0x016b83f4f980694ed2eee4d10667242b1f40dc406901b34125b008d334d47469")
                .unwrap(),
            hash: OnceLock::new(),
        });
        assert_eq!(
            expected,
            SignedTransaction::decode(&mut bytes_fourth.as_slice()).unwrap()
        );

        let bytes_fifth = hex::decode("f8650f84832156008287fb94cf7f9e66af820a19257a2108375b180b0ec491678204d2802ca035b7bfeb9ad9ece2cbafaaf8e202e706b4cfaeb233f46198f00b44d4a566a981a0612638fb29427ca33b9a3be2a0a561beecfe0269655be160d35e72d366a6a860").unwrap();
        let expected = SignedTransaction::PostEip155Legacy(Eip155SignedTransaction {
            nonce: 15u64,
            gas_price: U256::from(2200000000u64),
            gas_limit: 34811,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("cf7f9e66af820a19257a2108375b180b0ec49167").unwrap(),
            )),
            value: U256::from(1234u64),
            input: Bytes::default(),
            signature: Signature {
                v: 44,
                r: U256::from_str(
                    "0x35b7bfeb9ad9ece2cbafaaf8e202e706b4cfaeb233f46198f00b44d4a566a981",
                )
                .unwrap(),
                s: U256::from_str(
                    "0x612638fb29427ca33b9a3be2a0a561beecfe0269655be160d35e72d366a6a860",
                )
                .unwrap(),
            },
            hash: OnceLock::new(),
        });
        assert_eq!(
            expected,
            SignedTransaction::decode(&mut bytes_fifth.as_slice()).unwrap()
        );
    }

    // <https://github.com/gakonst/ethers-rs/issues/1732>
    #[test]
    fn test_recover_legacy_tx() {
        let raw_tx = "f9015482078b8505d21dba0083022ef1947a250d5630b4cf539739df2c5dacb4c659f2488d880c46549a521b13d8b8e47ff36ab50000000000000000000000000000000000000000000066ab5a608bd00a23f2fe000000000000000000000000000000000000000000000000000000000000008000000000000000000000000048c04ed5691981c42154c6167398f95e8f38a7ff00000000000000000000000000000000000000000000000000000000632ceac70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006c6ee5e31d828de241282b9606c8e98ea48526e225a0c9077369501641a92ef7399ff81c21639ed4fd8fc69cb793cfa1dbfab342e10aa0615facb2f1bcf3274a354cfe384a38d0cc008a11c2dd23a69111bc6930ba27a8";

        let tx: SignedTransaction =
            SignedTransaction::decode(&mut hex::decode(raw_tx).unwrap().as_slice()).unwrap();
        let recovered = tx.recover().unwrap();
        let expected: Address = "0xa12e1462d0ced572f396f58b6e2d03894cd7c8a4"
            .parse()
            .unwrap();
        assert_eq!(expected, recovered);
    }

    #[test]
    fn from_is_implemented_for_all_variants() {
        fn _compile_test(transaction: SignedTransaction) -> SignedTransaction {
            match transaction {
                SignedTransaction::PreEip155Legacy(transaction) => transaction.into(),
                SignedTransaction::PostEip155Legacy(transaction) => transaction.into(),
                SignedTransaction::Eip2930(transaction) => transaction.into(),
                SignedTransaction::Eip1559(transaction) => transaction.into(),
                SignedTransaction::Eip4844(transaction) => transaction.into(),
            }
        }
    }
}
