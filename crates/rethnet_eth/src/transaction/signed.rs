mod eip1559;
mod eip2930;
mod legacy;

use bytes::Bytes;
use revm_primitives::{Address, B256, U256};

use crate::{
    access_list::AccessList,
    signature::{Signature, SignatureError},
    utils::enveloped,
};

use super::{kind::TransactionKind, TransactionEssentials};

pub use self::{
    eip1559::EIP1559SignedTransaction, eip2930::EIP2930SignedTransaction,
    legacy::LegacySignedTransaction,
};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum SignedTransaction {
    /// Legacy transaction type
    Legacy(LegacySignedTransaction),
    /// EIP-2930 transaction
    EIP2930(EIP2930SignedTransaction),
    /// EIP-1559 transaction
    EIP1559(EIP1559SignedTransaction),
}

impl SignedTransaction {
    pub fn gas_price(&self) -> U256 {
        match self {
            SignedTransaction::Legacy(tx) => tx.gas_price,
            SignedTransaction::EIP2930(tx) => tx.gas_price,
            SignedTransaction::EIP1559(tx) => tx.max_fee_per_gas,
        }
    }

    pub fn gas_limit(&self) -> u64 {
        match self {
            SignedTransaction::Legacy(tx) => tx.gas_limit,
            SignedTransaction::EIP2930(tx) => tx.gas_limit,
            SignedTransaction::EIP1559(tx) => tx.gas_limit,
        }
    }

    pub fn value(&self) -> U256 {
        match self {
            SignedTransaction::Legacy(tx) => tx.value,
            SignedTransaction::EIP2930(tx) => tx.value,
            SignedTransaction::EIP1559(tx) => tx.value,
        }
    }

    pub fn data(&self) -> &Bytes {
        match self {
            SignedTransaction::Legacy(tx) => &tx.input,
            SignedTransaction::EIP2930(tx) => &tx.input,
            SignedTransaction::EIP1559(tx) => &tx.input,
        }
    }

    pub fn access_list(&self) -> Option<&AccessList> {
        match self {
            SignedTransaction::Legacy(_) => None,
            SignedTransaction::EIP2930(tx) => Some(&tx.access_list),
            SignedTransaction::EIP1559(tx) => Some(&tx.access_list),
        }
    }

    /// Max cost of the transaction
    pub fn max_cost(&self) -> U256 {
        U256::from(self.gas_limit()).saturating_mul(self.gas_price())
    }

    /// Returns a helper type that contains commonly used values as fields
    pub fn essentials(&self) -> TransactionEssentials {
        match self {
            SignedTransaction::Legacy(t) => TransactionEssentials {
                kind: t.kind,
                input: t.input.clone(),
                nonce: t.nonce,
                gas_limit: t.gas_limit,
                gas_price: Some(t.gas_price),
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                value: t.value,
                chain_id: t.chain_id(),
                access_list: Default::default(),
            },
            SignedTransaction::EIP2930(t) => TransactionEssentials {
                kind: t.kind,
                input: t.input.clone(),
                nonce: t.nonce,
                gas_limit: t.gas_limit,
                gas_price: Some(t.gas_price),
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                value: t.value,
                chain_id: Some(t.chain_id),
                access_list: t.access_list.clone(),
            },
            SignedTransaction::EIP1559(t) => TransactionEssentials {
                kind: t.kind,
                input: t.input.clone(),
                nonce: t.nonce,
                gas_limit: t.gas_limit,
                gas_price: None,
                max_fee_per_gas: Some(t.max_fee_per_gas),
                max_priority_fee_per_gas: Some(t.max_priority_fee_per_gas),
                value: t.value,
                chain_id: Some(t.chain_id),
                access_list: t.access_list.clone(),
            },
        }
    }

    pub fn nonce(&self) -> &u64 {
        match self {
            SignedTransaction::Legacy(t) => t.nonce(),
            SignedTransaction::EIP2930(t) => t.nonce(),
            SignedTransaction::EIP1559(t) => t.nonce(),
        }
    }

    pub fn chain_id(&self) -> Option<u64> {
        match self {
            SignedTransaction::Legacy(t) => t.chain_id(),
            SignedTransaction::EIP2930(t) => Some(t.chain_id),
            SignedTransaction::EIP1559(t) => Some(t.chain_id),
        }
    }

    pub fn as_legacy(&self) -> Option<&LegacySignedTransaction> {
        match self {
            SignedTransaction::Legacy(tx) => Some(tx),
            _ => None,
        }
    }

    /// Returns true whether this tx is a legacy transaction
    pub fn is_legacy(&self) -> bool {
        matches!(self, SignedTransaction::Legacy(_))
    }

    /// Returns true whether this tx is a EIP1559 transaction
    pub fn is_eip1559(&self) -> bool {
        matches!(self, SignedTransaction::EIP1559(_))
    }

    pub fn hash(&self) -> B256 {
        match self {
            SignedTransaction::Legacy(t) => t.hash(),
            SignedTransaction::EIP2930(t) => t.hash(),
            SignedTransaction::EIP1559(t) => t.hash(),
        }
    }

    /// Recovers the Ethereum address which was used to sign the transaction.
    pub fn recover(&self) -> Result<Address, SignatureError> {
        match self {
            SignedTransaction::Legacy(tx) => tx.recover(),
            SignedTransaction::EIP2930(tx) => tx.recover(),
            SignedTransaction::EIP1559(tx) => tx.recover(),
        }
    }

    /// Returns what kind of transaction this is
    pub fn kind(&self) -> &TransactionKind {
        match self {
            SignedTransaction::Legacy(tx) => &tx.kind,
            SignedTransaction::EIP2930(tx) => &tx.kind,
            SignedTransaction::EIP1559(tx) => &tx.kind,
        }
    }

    /// Returns the callee if this transaction is a call
    pub fn to(&self) -> Option<&Address> {
        self.kind().as_call()
    }

    /// Returns the Signature of the transaction
    pub fn signature(&self) -> Signature {
        match self {
            SignedTransaction::Legacy(tx) => tx.signature,
            SignedTransaction::EIP2930(tx) => {
                let v = tx.odd_y_parity as u8;
                let r = U256::from_be_bytes(tx.r.0);
                let s = U256::from_be_bytes(tx.s.0);
                Signature { r, s, v: v.into() }
            }
            SignedTransaction::EIP1559(tx) => {
                let v = tx.odd_y_parity as u8;
                let r = U256::from_be_bytes(tx.r.0);
                let s = U256::from_be_bytes(tx.s.0);
                Signature { r, s, v: v.into() }
            }
        }
    }
}

impl rlp::Encodable for SignedTransaction {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        match self {
            SignedTransaction::Legacy(tx) => tx.rlp_append(s),
            SignedTransaction::EIP2930(tx) => enveloped(1, tx, s),
            SignedTransaction::EIP1559(tx) => enveloped(2, tx, s),
        }
    }
}

impl rlp::Decodable for SignedTransaction {
    fn decode(rlp: &rlp::Rlp) -> Result<Self, rlp::DecoderError> {
        let data = rlp.data()?;
        let first = *data
            .first()
            .ok_or(rlp::DecoderError::Custom("empty slice"))?;
        if rlp.is_list() {
            return Ok(SignedTransaction::Legacy(rlp.as_val()?));
        }
        let s = data
            .get(1..)
            .ok_or(rlp::DecoderError::Custom("no tx body"))?;
        if first == 0x01 {
            return rlp::decode(s).map(SignedTransaction::EIP2930);
        }
        if first == 0x02 {
            return rlp::decode(s).map(SignedTransaction::EIP1559);
        }
        Err(rlp::DecoderError::Custom("invalid tx type"))
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Encodable for SignedTransaction {
    fn length(&self) -> usize {
        match self {
            SignedTransaction::Legacy(tx) => tx.length(),
            tx => {
                let payload_len = match tx {
                    SignedTransaction::EIP2930(tx) => tx.length() + 1,
                    SignedTransaction::EIP1559(tx) => tx.length() + 1,
                    _ => unreachable!("legacy tx length already matched"),
                };
                // we include a string header for signed types txs, so include the length here
                payload_len + open_fastrlp::length_of_length(payload_len)
            }
        }
    }
    fn encode(&self, out: &mut dyn open_fastrlp::BufMut) {
        match self {
            SignedTransaction::Legacy(tx) => tx.encode(out),
            tx => {
                let payload_len = match tx {
                    SignedTransaction::EIP2930(tx) => tx.length() + 1,
                    SignedTransaction::EIP1559(tx) => tx.length() + 1,
                    _ => unreachable!("legacy tx length already matched"),
                };

                match tx {
                    SignedTransaction::EIP2930(tx) => {
                        let tx_string_header = open_fastrlp::Header {
                            list: false,
                            payload_length: payload_len,
                        };

                        tx_string_header.encode(out);
                        out.put_u8(0x01);
                        tx.encode(out);
                    }
                    SignedTransaction::EIP1559(tx) => {
                        let tx_string_header = open_fastrlp::Header {
                            list: false,
                            payload_length: payload_len,
                        };

                        tx_string_header.encode(out);
                        out.put_u8(0x02);
                        tx.encode(out);
                    }
                    _ => unreachable!("legacy tx encode already matched"),
                }
            }
        }
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Decodable for SignedTransaction {
    fn decode(buf: &mut &[u8]) -> Result<Self, open_fastrlp::DecodeError> {
        use bytes::Buf;
        use std::cmp::Ordering;

        let first = *buf
            .first()
            .ok_or(open_fastrlp::DecodeError::Custom("empty slice"))?;

        // a signed transaction is either encoded as a string (non legacy) or a list (legacy).
        // We should not consume the buffer if we are decoding a legacy transaction, so let's
        // check if the first byte is between 0x80 and 0xbf.
        match first.cmp(&open_fastrlp::EMPTY_LIST_CODE) {
            Ordering::Less => {
                // strip out the string header
                // NOTE: typed transaction encodings either contain a "rlp header" which contains
                // the type of the payload and its length, or they do not contain a header and
                // start with the tx type byte.
                //
                // This line works for both types of encodings because byte slices starting with
                // 0x01 and 0x02 return a Header { list: false, payload_length: 1 } when input to
                // Header::decode.
                // If the encoding includes a header, the header will be properly decoded and
                // consumed.
                // Otherwise, header decoding will succeed but nothing is consumed.
                let _header = open_fastrlp::Header::decode(buf)?;
                let tx_type = *buf.first().ok_or(open_fastrlp::DecodeError::Custom(
                    "typed tx cannot be decoded from an empty slice",
                ))?;
                if tx_type == 0x01 {
                    buf.advance(1);
                    <EIP2930SignedTransaction as open_fastrlp::Decodable>::decode(buf)
                        .map(SignedTransaction::EIP2930)
                } else if tx_type == 0x02 {
                    buf.advance(1);
                    <EIP1559SignedTransaction as open_fastrlp::Decodable>::decode(buf)
                        .map(SignedTransaction::EIP1559)
                } else {
                    Err(open_fastrlp::DecodeError::Custom("invalid tx type"))
                }
            }
            Ordering::Equal => Err(open_fastrlp::DecodeError::Custom(
                "an empty list is not a valid transaction encoding",
            )),
            Ordering::Greater => <LegacySignedTransaction as open_fastrlp::Decodable>::decode(buf)
                .map(SignedTransaction::Legacy),
        }
    }
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;

    use super::*;

    #[test]
    fn can_recover_sender() {
        let bytes = hex::decode("f85f800182520894095e7baea6a6c7c4c2dfeb977efac326af552d870a801ba048b55bfa915ac795c431978d8a6a992b628d557da5ff759b307d495a36649353a0efffd310ac743f371de3b9f7f9cb56c0b28ad43601b4ab949f53faa07bd2c804").unwrap();

        let tx: SignedTransaction = rlp::decode(&bytes).expect("decoding TypedTransaction failed");
        let tx = match tx {
            SignedTransaction::Legacy(tx) => tx,
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
                    .parse()
                    .unwrap()
            );
        } else {
            panic!();
        }
        assert_eq!(tx.value, U256::from(0x0au64));
        assert_eq!(
            tx.recover().unwrap(),
            "0x0f65fe9276bc9a24ae7083ae28e2660ef72df99e"
                .parse()
                .unwrap()
        );
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn test_decode_fastrlp_create() {
        use bytes::BytesMut;
        use open_fastrlp::Encodable;

        // tests that a contract creation tx encodes and decodes properly

        let tx = SignedTransaction::EIP2930(EIP2930SignedTransaction {
            chain_id: 1u64,
            nonce: 0,
            gas_price: U256::from(1),
            gas_limit: 2,
            kind: TransactionKind::Create,
            value: U256::from(3),
            input: Bytes::from(vec![1, 2]),
            odd_y_parity: true,
            r: B256::default(),
            s: B256::default(),
            access_list: vec![].into(),
        });

        let mut encoded = BytesMut::new();
        tx.encode(&mut encoded);

        let decoded =
            <SignedTransaction as open_fastrlp::Decodable>::decode(&mut &*encoded).unwrap();
        assert_eq!(decoded, tx);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn test_decode_fastrlp_create_goerli() {
        // test that an example create tx from goerli decodes properly
        let tx_bytes =
              hex::decode("02f901ee05228459682f008459682f11830209bf8080b90195608060405234801561001057600080fd5b50610175806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80630c49c36c14610030575b600080fd5b61003861004e565b604051610045919061011d565b60405180910390f35b60606020600052600f6020527f68656c6c6f2073746174656d696e64000000000000000000000000000000000060405260406000f35b600081519050919050565b600082825260208201905092915050565b60005b838110156100be5780820151818401526020810190506100a3565b838111156100cd576000848401525b50505050565b6000601f19601f8301169050919050565b60006100ef82610084565b6100f9818561008f565b93506101098185602086016100a0565b610112816100d3565b840191505092915050565b6000602082019050818103600083015261013781846100e4565b90509291505056fea264697066735822122051449585839a4ea5ac23cae4552ef8a96b64ff59d0668f76bfac3796b2bdbb3664736f6c63430008090033c080a0136ebffaa8fc8b9fda9124de9ccb0b1f64e90fbd44251b4c4ac2501e60b104f9a07eb2999eec6d185ef57e91ed099afb0a926c5b536f0155dd67e537c7476e1471")
                  .unwrap();
        let _decoded =
            <SignedTransaction as open_fastrlp::Decodable>::decode(&mut &tx_bytes[..]).unwrap();
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn test_decode_fastrlp_call() {
        use bytes::BytesMut;
        use open_fastrlp::Encodable;

        let tx = SignedTransaction::EIP2930(EIP2930SignedTransaction {
            chain_id: 1u64,
            nonce: 0,
            gas_price: U256::from(1),
            gas_limit: 2,
            kind: TransactionKind::Call(Address::default()),
            value: U256::from(3),
            input: Bytes::from(vec![1, 2]),
            odd_y_parity: true,
            r: B256::default(),
            s: B256::default(),
            access_list: vec![].into(),
        });

        let mut encoded = BytesMut::new();
        tx.encode(&mut encoded);

        let decoded =
            <SignedTransaction as open_fastrlp::Decodable>::decode(&mut &*encoded).unwrap();
        assert_eq!(decoded, tx);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn decode_transaction_consumes_buffer() {
        let bytes = &mut &hex::decode("b87502f872041a8459682f008459682f0d8252089461815774383099e24810ab832a5b2a5425c154d58829a2241af62c000080c001a059e6b67f48fb32e7e570dfb11e042b5ad2e55e3ce3ce9cd989c7e06e07feeafda0016b83f4f980694ed2eee4d10667242b1f40dc406901b34125b008d334d47469").unwrap()[..];
        let _transaction_res =
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes).unwrap();
        assert_eq!(
            bytes.len(),
            0,
            "did not consume all bytes in the buffer, {:?} remaining",
            bytes.len()
        );
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn decode_multiple_network_txs() {
        use std::str::FromStr;

        let bytes_first = &mut &hex::decode("f86b02843b9aca00830186a094d3e8763675e4c425df46cc3b5c0f6cbdac39604687038d7ea4c68000802ba00eb96ca19e8a77102767a41fc85a36afd5c61ccb09911cec5d3e86e193d9c5aea03a456401896b1b6055311536bf00a718568c744d8c1f9df59879e8350220ca18").unwrap()[..];
        let expected = SignedTransaction::Legacy(LegacySignedTransaction {
            nonce: 2u64,
            gas_price: 1000000000u64.into(),
            gas_limit: 100000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap()[..],
            )),
            value: 1000000000000000u64.into(),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "eb96ca19e8a77102767a41fc85a36afd5c61ccb09911cec5d3e86e193d9c5ae",
                )
                .unwrap(),
                s: U256::from_str(
                    "3a456401896b1b6055311536bf00a718568c744d8c1f9df59879e8350220ca18",
                )
                .unwrap(),
            },
        });
        assert_eq!(
            expected,
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes_first).unwrap()
        );

        let bytes_second = &mut &hex::decode("f86b01843b9aca00830186a094d3e8763675e4c425df46cc3b5c0f6cbdac3960468702769bb01b2a00802ba0e24d8bd32ad906d6f8b8d7741e08d1959df021698b19ee232feba15361587d0aa05406ad177223213df262cb66ccbb2f46bfdccfdfbbb5ffdda9e2c02d977631da").unwrap()[..];
        let expected = SignedTransaction::Legacy(LegacySignedTransaction {
            nonce: 1,
            gas_price: 1000000000u64.into(),
            gas_limit: 100000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap()[..],
            )),
            value: 693361000000000u64.into(),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "e24d8bd32ad906d6f8b8d7741e08d1959df021698b19ee232feba15361587d0a",
                )
                .unwrap(),
                s: U256::from_str(
                    "5406ad177223213df262cb66ccbb2f46bfdccfdfbbb5ffdda9e2c02d977631da",
                )
                .unwrap(),
            },
        });
        assert_eq!(
            expected,
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes_second).unwrap()
        );

        let bytes_third = &mut &hex::decode("f86b0384773594008398968094d3e8763675e4c425df46cc3b5c0f6cbdac39604687038d7ea4c68000802ba0ce6834447c0a4193c40382e6c57ae33b241379c5418caac9cdc18d786fd12071a03ca3ae86580e94550d7c071e3a02eadb5a77830947c9225165cf9100901bee88").unwrap()[..];
        let expected = SignedTransaction::Legacy(LegacySignedTransaction {
            nonce: 3,
            gas_price: 2000000000u64.into(),
            gas_limit: 10000000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("d3e8763675e4c425df46cc3b5c0f6cbdac396046").unwrap()[..],
            )),
            value: 1000000000000000u64.into(),
            input: Bytes::default(),
            signature: Signature {
                v: 43,
                r: U256::from_str(
                    "ce6834447c0a4193c40382e6c57ae33b241379c5418caac9cdc18d786fd12071",
                )
                .unwrap(),
                s: U256::from_str(
                    "3ca3ae86580e94550d7c071e3a02eadb5a77830947c9225165cf9100901bee88",
                )
                .unwrap(),
            },
        });
        assert_eq!(
            expected,
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes_third).unwrap()
        );

        let bytes_fourth = &mut &hex::decode("b87502f872041a8459682f008459682f0d8252089461815774383099e24810ab832a5b2a5425c154d58829a2241af62c000080c001a059e6b67f48fb32e7e570dfb11e042b5ad2e55e3ce3ce9cd989c7e06e07feeafda0016b83f4f980694ed2eee4d10667242b1f40dc406901b34125b008d334d47469").unwrap()[..];
        let expected = SignedTransaction::EIP1559(EIP1559SignedTransaction {
            chain_id: 4,
            nonce: 26,
            max_priority_fee_per_gas: 1500000000u64.into(),
            max_fee_per_gas: 1500000013u64.into(),
            gas_limit: 21000,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("61815774383099e24810ab832a5b2a5425c154d5").unwrap()[..],
            )),
            value: 3000000000000000000u64.into(),
            input: Bytes::default(),
            access_list: AccessList::default(),
            odd_y_parity: true,
            r: B256::from_str("59e6b67f48fb32e7e570dfb11e042b5ad2e55e3ce3ce9cd989c7e06e07feeafd")
                .unwrap(),
            s: B256::from_str("016b83f4f980694ed2eee4d10667242b1f40dc406901b34125b008d334d47469")
                .unwrap(),
        });
        assert_eq!(
            expected,
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes_fourth).unwrap()
        );

        let bytes_fifth = &mut &hex::decode("f8650f84832156008287fb94cf7f9e66af820a19257a2108375b180b0ec491678204d2802ca035b7bfeb9ad9ece2cbafaaf8e202e706b4cfaeb233f46198f00b44d4a566a981a0612638fb29427ca33b9a3be2a0a561beecfe0269655be160d35e72d366a6a860").unwrap()[..];
        let expected = SignedTransaction::Legacy(LegacySignedTransaction {
            nonce: 15u64,
            gas_price: 2200000000u64.into(),
            gas_limit: 34811,
            kind: TransactionKind::Call(Address::from_slice(
                &hex::decode("cf7f9e66af820a19257a2108375b180b0ec49167").unwrap()[..],
            )),
            value: 1234u64.into(),
            input: Bytes::default(),
            signature: Signature {
                v: 44,
                r: U256::from_str(
                    "35b7bfeb9ad9ece2cbafaaf8e202e706b4cfaeb233f46198f00b44d4a566a981",
                )
                .unwrap(),
                s: U256::from_str(
                    "612638fb29427ca33b9a3be2a0a561beecfe0269655be160d35e72d366a6a860",
                )
                .unwrap(),
            },
        });
        assert_eq!(
            expected,
            <SignedTransaction as open_fastrlp::Decodable>::decode(bytes_fifth).unwrap()
        );
    }

    // <https://github.com/gakonst/ethers-rs/issues/1732>
    #[test]
    fn test_recover_legacy_tx() {
        let raw_tx = "f9015482078b8505d21dba0083022ef1947a250d5630b4cf539739df2c5dacb4c659f2488d880c46549a521b13d8b8e47ff36ab50000000000000000000000000000000000000000000066ab5a608bd00a23f2fe000000000000000000000000000000000000000000000000000000000000008000000000000000000000000048c04ed5691981c42154c6167398f95e8f38a7ff00000000000000000000000000000000000000000000000000000000632ceac70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006c6ee5e31d828de241282b9606c8e98ea48526e225a0c9077369501641a92ef7399ff81c21639ed4fd8fc69cb793cfa1dbfab342e10aa0615facb2f1bcf3274a354cfe384a38d0cc008a11c2dd23a69111bc6930ba27a8";

        let tx: SignedTransaction = rlp::decode(&hex::decode(raw_tx).unwrap()).unwrap();
        let recovered = tx.recover().unwrap();
        let expected: Address = "0xa12e1462d0ced572f396f58b6e2d03894cd7c8a4"
            .parse()
            .unwrap();
        assert_eq!(expected, recovered);
    }
}
