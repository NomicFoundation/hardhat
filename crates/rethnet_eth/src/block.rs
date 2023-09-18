// Part of this code was adapted from foundry and is distributed under their licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/block.rs

mod difficulty;
mod options;
mod reorg;

use std::sync::OnceLock;

use revm_primitives::{keccak256, ruint::aliases::U160, SpecId};
use rlp::Decodable;

use crate::{
    transaction::SignedTransaction,
    trie::{self, KECCAK_NULL_RLP},
    withdrawal::Withdrawal,
    Address, Bloom, Bytes, B256, B64, U256,
};

use self::difficulty::calculate_ethash_canonical_difficulty;
pub use self::{
    options::BlockOptions,
    reorg::{
        block_time, is_safe_block_number, largest_safe_block_number, safe_block_depth,
        IsSafeBlockNumberArgs, LargestSafeBlockNumberArgs,
    },
};

/// Ethereum block
#[derive(Clone, Debug, Eq)]
#[cfg_attr(
    feature = "fastrlp",
    derive(open_fastrlp::RlpEncodable, open_fastrlp::RlpDecodable)
)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Block {
    /// The block's header
    pub header: Header,
    /// The block's transactions
    pub transactions: Vec<SignedTransaction>,
    /// The block's ommers' headers
    pub ommers: Vec<Header>,
    /// The block's withdrawals
    pub withdrawals: Option<Vec<Withdrawal>>,
    #[cfg_attr(feature = "serde", serde(skip))]
    /// The cached block hash
    hash: OnceLock<B256>,
}

impl Block {
    /// Constructs a new block from the provided partial header, transactions, and ommers.
    pub fn new(
        partial_header: PartialHeader,
        transactions: Vec<SignedTransaction>,
        ommers: Vec<Header>,
        withdrawals: Option<Vec<Withdrawal>>,
    ) -> Self {
        let ommers_hash = keccak256(&rlp::encode_list(&ommers)[..]);
        let transactions_root =
            trie::ordered_trie_root(transactions.iter().map(|r| rlp::encode(r).freeze()));

        let withdrawals_root = withdrawals.as_ref().map(|withdrawals| {
            trie::ordered_trie_root(withdrawals.iter().map(|r| rlp::encode(r).freeze()))
        });

        Self {
            header: Header::new(
                partial_header,
                ommers_hash,
                transactions_root,
                withdrawals_root,
            ),
            transactions,
            ommers,
            withdrawals,
            hash: OnceLock::new(),
        }
    }

    /// Retrieves the block's hash.
    pub fn hash(&self) -> &B256 {
        self.hash.get_or_init(|| self.header.hash())
    }
}

impl PartialEq for Block {
    fn eq(&self, other: &Self) -> bool {
        self.header == other.header
            && self.transactions == other.transactions
            && self.ommers == other.ommers
            && self.withdrawals == other.withdrawals
    }
}

/// ethereum block header
#[derive(Clone, Debug, Default, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct Header {
    /// The parent block's hash
    pub parent_hash: B256,
    /// The ommers' root hash
    pub ommers_hash: B256,
    /// The block's beneficiary address
    pub beneficiary: Address,
    /// The state's root hash
    pub state_root: B256,
    /// The transactions' root hash
    pub transactions_root: B256,
    /// The receipts' root hash
    pub receipts_root: B256,
    /// The logs' bloom
    pub logs_bloom: Bloom,
    /// The block's difficulty
    pub difficulty: U256,
    /// The block's number
    pub number: U256,
    /// The block's gas limit
    pub gas_limit: U256,
    /// The amount of gas used by the block
    pub gas_used: U256,
    /// The block's timestamp
    pub timestamp: U256,
    /// The block's extra data
    pub extra_data: Bytes,
    /// The block's mix hash
    pub mix_hash: B256,
    /// The block's nonce
    #[cfg_attr(feature = "serde", serde(with = "B64Def"))]
    pub nonce: B64,
    /// BaseFee was added by EIP-1559 and is ignored in legacy headers.
    pub base_fee_per_gas: Option<U256>,
    /// WithdrawalsHash was added by EIP-4895 and is ignored in legacy headers.
    pub withdrawals_root: Option<B256>,
}

#[cfg(feature = "serde")]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(remote = "B64")]
struct B64Def(#[serde(getter = "B64::as_uint")] revm_primitives::ruint::aliases::U64);

#[cfg(feature = "serde")]
impl From<B64Def> for B64 {
    fn from(def: B64Def) -> Self {
        def.0.into()
    }
}

impl Header {
    /// Constructs a [`Header`] from the provided [`PartialHeader`], ommers' root hash, transactions' root hash, and withdrawals' root hash.
    pub fn new(
        partial_header: PartialHeader,
        ommers_hash: B256,
        transactions_root: B256,
        withdrawals_root: Option<B256>,
    ) -> Self {
        Self {
            parent_hash: partial_header.parent_hash,
            ommers_hash,
            beneficiary: partial_header.beneficiary,
            state_root: partial_header.state_root,
            transactions_root,
            receipts_root: partial_header.receipts_root,
            logs_bloom: partial_header.logs_bloom,
            difficulty: partial_header.difficulty,
            number: partial_header.number,
            gas_limit: partial_header.gas_limit,
            gas_used: partial_header.gas_used,
            timestamp: partial_header.timestamp,
            extra_data: partial_header.extra_data,
            mix_hash: partial_header.mix_hash,
            nonce: partial_header.nonce,
            base_fee_per_gas: partial_header.base_fee,
            withdrawals_root,
        }
    }

    /// Calculates the block's hash.
    pub fn hash(&self) -> B256 {
        let encoded = rlp::encode(self);
        keccak256(&encoded)
    }

    /// Returns the rlp length of the Header body, _not including_ trailing EIP155 fields or the
    /// rlp list header
    /// To get the length including the rlp list header, refer to the Encodable implementation.
    #[cfg(feature = "fastrlp")]
    pub(crate) fn header_payload_length(&self) -> usize {
        use open_fastrlp::Encodable;

        let mut length = 0;
        length += self.parent_hash.length();
        length += self.ommers_hash.length();
        length += self.beneficiary.length();
        length += self.state_root.length();
        length += self.transactions_root.length();
        length += self.receipts_root.length();
        length += self.logs_bloom.length();
        length += self.difficulty.length();
        length += self.number.length();
        length += self.gas_limit.length();
        length += self.gas_used.length();
        length += self.timestamp.length();
        length += self.extra_data.length();
        length += self.mix_hash.length();
        length += self.nonce.length();
        length += self
            .base_fee_per_gas
            .map(|fee| fee.length())
            .unwrap_or_default();
        length += self
            .withdrawals_root
            .map(|root| root.length())
            .unwrap_or_default();
        length
    }
}

impl rlp::Encodable for Header {
    fn rlp_append(&self, s: &mut rlp::RlpStream) {
        s.begin_list(if self.base_fee_per_gas.is_none() {
            15
        } else if self.withdrawals_root.is_none() {
            16
        } else {
            17
        });

        s.append(&self.parent_hash.as_bytes());
        s.append(&self.ommers_hash.as_bytes());
        s.append(&self.beneficiary.as_bytes());
        s.append(&self.state_root.as_bytes());
        s.append(&self.transactions_root.as_bytes());
        s.append(&self.receipts_root.as_bytes());
        s.append(&self.logs_bloom);
        s.append(&self.difficulty);
        s.append(&self.number);
        s.append(&self.gas_limit);
        s.append(&self.gas_used);
        s.append(&self.timestamp);
        s.append(&self.extra_data);
        s.append(&self.mix_hash.as_bytes());
        s.append(&self.nonce.to_le_bytes::<8>().as_ref());
        if let Some(ref base_fee) = self.base_fee_per_gas {
            s.append(base_fee);
        }
        if let Some(ref root) = self.withdrawals_root {
            s.append(&root.as_bytes());
        }
    }
}

impl rlp::Decodable for Header {
    fn decode(rlp: &rlp::Rlp<'_>) -> Result<Self, rlp::DecoderError> {
        let result = Header {
            parent_hash: B256::from(rlp.val_at::<U256>(0)?.to_be_bytes()),
            ommers_hash: B256::from(rlp.val_at::<U256>(1)?.to_be_bytes()),
            beneficiary: Address::from(rlp.val_at::<U160>(2)?.to_be_bytes()),
            state_root: B256::from(rlp.val_at::<U256>(3)?.to_be_bytes()),
            transactions_root: B256::from(rlp.val_at::<U256>(4)?.to_be_bytes()),
            receipts_root: B256::from(rlp.val_at::<U256>(5)?.to_be_bytes()),
            logs_bloom: rlp.val_at(6)?,
            difficulty: rlp.val_at(7)?,
            number: rlp.val_at(8)?,
            gas_limit: rlp.val_at(9)?,
            gas_used: rlp.val_at(10)?,
            timestamp: rlp.val_at(11)?,
            extra_data: rlp.val_at::<Vec<u8>>(12)?.into(),
            mix_hash: B256::from(rlp.val_at::<U256>(13)?.to_be_bytes()),
            nonce: B64::try_from_le_slice(&rlp.val_at::<Vec<u8>>(14)?)
                .ok_or(rlp::DecoderError::Custom("Invalid nonce byte length"))?,
            base_fee_per_gas: if let Ok(base_fee) = rlp.at(15) {
                Some(<U256 as Decodable>::decode(&base_fee)?)
            } else {
                None
            },
            withdrawals_root: if let Ok(root) = rlp.at(16) {
                Some(B256::from(
                    <U256 as Decodable>::decode(&root)?.to_be_bytes(),
                ))
            } else {
                None
            },
        };
        Ok(result)
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Encodable for Header {
    fn length(&self) -> usize {
        // add each of the fields' rlp encoded lengths
        let mut length = 0;
        length += self.header_payload_length();
        length += open_fastrlp::length_of_length(length);

        length
    }

    fn encode(&self, out: &mut dyn open_fastrlp::BufMut) {
        let list_header = open_fastrlp::Header {
            list: true,
            payload_length: self.header_payload_length(),
        };
        list_header.encode(out);
        self.parent_hash.encode(out);
        self.ommers_hash.encode(out);
        self.beneficiary.encode(out);
        self.state_root.encode(out);
        self.transactions_root.encode(out);
        self.receipts_root.encode(out);
        self.logs_bloom.encode(out);
        self.difficulty.encode(out);
        self.number.encode(out);
        self.gas_limit.encode(out);
        self.gas_used.encode(out);
        self.timestamp.encode(out);
        self.extra_data.encode(out);
        self.mix_hash.encode(out);
        self.nonce.encode(out);
        if let Some(base_fee_per_gas) = self.base_fee_per_gas {
            base_fee_per_gas.encode(out);
        }
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Decodable for Header {
    fn decode(buf: &mut &[u8]) -> Result<Self, open_fastrlp::DecodeError> {
        // slice out the rlp list header
        let header = open_fastrlp::Header::decode(buf)?;
        let start_len = buf.len();

        Ok(Header {
            parent_hash: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            ommers_hash: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            beneficiary: <Address as open_fastrlp::Decodable>::decode(buf)?,
            state_root: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            transactions_root: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            receipts_root: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            logs_bloom: <Bloom as open_fastrlp::Decodable>::decode(buf)?,
            difficulty: <U256 as open_fastrlp::Decodable>::decode(buf)?,
            number: <U256 as open_fastrlp::Decodable>::decode(buf)?,
            gas_limit: <U256 as open_fastrlp::Decodable>::decode(buf)?,
            gas_used: <U256 as open_fastrlp::Decodable>::decode(buf)?,
            timestamp: <u64 as open_fastrlp::Decodable>::decode(buf)?,
            extra_data: <Bytes as open_fastrlp::Decodable>::decode(buf)?,
            mix_hash: <B256 as open_fastrlp::Decodable>::decode(buf)?,
            nonce: <H64 as open_fastrlp::Decodable>::decode(buf)?,
            base_fee_per_gas: if start_len - header.payload_length < buf.len() {
                // if there is leftover data in the payload, decode the base fee
                Some(<U256 as open_fastrlp::Decodable>::decode(buf)?)
            } else {
                None
            },
        })
    }
}

/// Partial header definition without ommers hash and transactions root
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PartialHeader {
    /// The parent block's hash
    pub parent_hash: B256,
    /// The block's beneficiary address
    pub beneficiary: Address,
    /// The state's root hash
    pub state_root: B256,
    /// The receipts' root hash
    pub receipts_root: B256,
    /// The logs' bloom
    pub logs_bloom: Bloom,
    /// The block's difficulty
    pub difficulty: U256,
    /// The block's number
    pub number: U256,
    /// The block's gas limit
    pub gas_limit: U256,
    /// The amount of gas used by the block
    pub gas_used: U256,
    /// The block's timestamp
    pub timestamp: U256,
    /// The block's extra data
    pub extra_data: Bytes,
    /// The block's mix hash
    pub mix_hash: B256,
    /// The block's nonce
    pub nonce: B64,
    /// BaseFee was added by EIP-1559 and is ignored in legacy headers.
    pub base_fee: Option<U256>,
}

impl PartialHeader {
    /// Constructs a new instance based on the provided [`BlockOptions`] and parent [`Header`] for the given [`SpecId`].
    pub fn new(spec_id: SpecId, options: BlockOptions, parent: Option<&Header>) -> Self {
        let timestamp = options.timestamp.unwrap_or_default();
        let number = options.number.unwrap_or_else(|| {
            if let Some(parent) = &parent {
                parent.number + U256::from(1)
            } else {
                U256::ZERO
            }
        });

        let parent_hash = options.parent_hash.unwrap_or_else(|| {
            if let Some(parent) = parent {
                parent.hash()
            } else {
                B256::zero()
            }
        });

        Self {
            parent_hash,
            beneficiary: options.beneficiary.unwrap_or_default(),
            state_root: options.state_root.unwrap_or(KECCAK_NULL_RLP),
            receipts_root: options.receipts_root.unwrap_or(KECCAK_NULL_RLP),
            logs_bloom: options.logs_bloom.unwrap_or_default(),
            difficulty: options.difficulty.unwrap_or_else(|| {
                if spec_id >= SpecId::MERGE {
                    U256::ZERO
                } else if let Some(parent) = parent {
                    calculate_ethash_canonical_difficulty(spec_id, parent, &number, &timestamp)
                } else {
                    U256::from(1)
                }
            }),
            number,
            gas_limit: options.gas_limit.unwrap_or(U256::from(1_000_000)),
            gas_used: U256::ZERO,
            timestamp,
            extra_data: options.extra_data.unwrap_or_default(),
            mix_hash: options.mix_hash.unwrap_or_default(),
            nonce: options.nonce.unwrap_or_default(),
            base_fee: options.base_fee.or_else(|| {
                if spec_id >= SpecId::LONDON {
                    Some(U256::from(7))
                } else {
                    None
                }
            }),
        }
    }
}

impl Default for PartialHeader {
    fn default() -> Self {
        const DEFAULT_GAS: u64 = 0xffffffffffffff;

        Self {
            parent_hash: B256::default(),
            beneficiary: Address::default(),
            state_root: B256::default(),
            receipts_root: KECCAK_NULL_RLP,
            logs_bloom: Bloom::default(),
            difficulty: U256::default(),
            number: U256::default(),
            gas_limit: U256::from(DEFAULT_GAS),
            gas_used: U256::default(),
            timestamp: U256::default(),
            extra_data: Bytes::default(),
            mix_hash: B256::default(),
            nonce: B64::default(),
            base_fee: Option::default(),
        }
    }
}

impl From<Header> for PartialHeader {
    fn from(header: Header) -> PartialHeader {
        Self {
            parent_hash: header.parent_hash,
            beneficiary: header.beneficiary,
            state_root: header.state_root,
            receipts_root: header.receipts_root,
            logs_bloom: header.logs_bloom,
            difficulty: header.difficulty,
            number: header.number,
            gas_limit: header.gas_limit,
            gas_used: header.gas_used,
            timestamp: header.timestamp,
            extra_data: header.extra_data,
            mix_hash: header.mix_hash,
            nonce: header.nonce,
            base_fee: header.base_fee_per_gas,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use revm_primitives::ruint::aliases::U64;

    use super::*;

    #[test]
    fn header_rlp_roundtrip() {
        let mut header = Header {
            parent_hash: B256::default(),
            ommers_hash: B256::default(),
            beneficiary: Address::default(),
            state_root: B256::default(),
            transactions_root: B256::default(),
            receipts_root: B256::default(),
            logs_bloom: Bloom::default(),
            difficulty: U256::default(),
            number: U256::from(124),
            gas_limit: U256::default(),
            gas_used: U256::from(1337),
            timestamp: U256::ZERO,
            extra_data: Bytes::default(),
            mix_hash: B256::default(),
            nonce: B64::from_limbs([99u64.to_be()]),
            base_fee_per_gas: None,
            withdrawals_root: None,
        };

        let encoded = rlp::encode(&header);
        let decoded: Header = rlp::decode(encoded.as_ref()).unwrap();
        assert_eq!(header, decoded);

        header.base_fee_per_gas = Some(U256::from(12345));

        let encoded = rlp::encode(&header);
        let decoded: Header = rlp::decode(encoded.as_ref()).unwrap();
        assert_eq!(header, decoded);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    fn header_fastrlp_roundtrip() {
        let mut header = Header {
            parent_hash: Default::default(),
            ommers_hash: Default::default(),
            beneficiary: Default::default(),
            state_root: Default::default(),
            transactions_root: Default::default(),
            receipts_root: Default::default(),
            logs_bloom: Default::default(),
            difficulty: Default::default(),
            number: 124u64.into(),
            gas_limit: Default::default(),
            gas_used: 1337u64.into(),
            timestamp: 0,
            extra_data: Default::default(),
            mix_hash: Default::default(),
            nonce: H64::from_low_u64_be(99u64),
            base_fee_per_gas: None,
        };

        let mut encoded = vec![];
        <Header as open_fastrlp::Encodable>::encode(&header, &mut encoded);
        let decoded: Header =
            <Header as open_fastrlp::Decodable>::decode(&mut encoded.as_slice()).unwrap();
        assert_eq!(header, decoded);

        header.base_fee_per_gas = Some(12345u64.into());

        encoded.clear();
        <Header as open_fastrlp::Encodable>::encode(&header, &mut encoded);
        let decoded: Header =
            <Header as open_fastrlp::Decodable>::decode(&mut encoded.as_slice()).unwrap();
        assert_eq!(header, decoded);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_encode_block_header() {
        use open_fastrlp::Encodable;

        let expected = hex::decode("f901f9a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008208ae820d0582115c8215b3821a0a827788a00000000000000000000000000000000000000000000000000000000000000000880000000000000000").unwrap();
        let mut data = vec![];
        let header = Header {
            parent_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            ommers_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            beneficiary: H160::from_str("0000000000000000000000000000000000000000").unwrap(),
            state_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            transactions_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            receipts_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            logs_bloom: <[u8; 256]>::from_hex("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000").unwrap().into(),
            difficulty: 0x8aeu64.into(),
            number: 0xd05u64.into(),
            gas_limit: 0x115cu64.into(),
            gas_used: 0x15b3u64.into(),
            timestamp: 0x1a0au64,
            extra_data: hex::decode("7788").unwrap().into(),
            mix_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            nonce: U64::from(0x0),
            base_fee_per_gas: None,
        };
        header.encode(&mut data);
        assert_eq!(hex::encode(&data), hex::encode(expected));
        assert_eq!(header.length(), data.len());
    }

    #[test]
    // Test vector from: https://github.com/ethereum/tests/blob/f47bbef4da376a49c8fc3166f09ab8a6d182f765/BlockchainTests/ValidBlocks/bcEIP1559/baseFee.json#L15-L36
    fn test_eip1559_block_header_hash() {
        use hex::FromHex;

        let expected_hash =
            B256::from_str("0x6a251c7c3c5dca7b42407a3752ff48f3bbca1fab7f9868371d9918daf1988d1f")
                .unwrap();
        let header = Header {
            parent_hash: B256::from_str(
                "0xe0a94a7a3c9617401586b1a27025d2d9671332d22d540e0af72b069170380f2a",
            )
            .unwrap(),
            ommers_hash: B256::from_str(
                "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
            )
            .unwrap(),
            beneficiary: Address::from_str("0xba5e000000000000000000000000000000000000").unwrap(),
            state_root: B256::from_str(
                "0xec3c94b18b8a1cff7d60f8d258ec723312932928626b4c9355eb4ab3568ec7f7",
            )
            .unwrap(),
            transactions_root: B256::from_str(
                "0x50f738580ed699f0469702c7ccc63ed2e51bc034be9479b7bff4e68dee84accf",
            )
            .unwrap(),
            receipts_root: B256::from_str(
                "0x29b0562f7140574dd0d50dee8a271b22e1a0a7b78fca58f7c60370d8317ba2a9",
            )
            .unwrap(),
            logs_bloom: <[u8; 256]>::from_hex("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000").unwrap().into(),
            difficulty: U256::from(0x020000u64),
            number: U256::from(0x01u64),
            gas_limit: U256::from_str("0x016345785d8a0000").unwrap(),
            gas_used: U256::from(0x015534u64),
            timestamp: U256::from(0x079eu64),
            extra_data: hex::decode("42").unwrap().into(),
            mix_hash: B256::from_str(
                "0000000000000000000000000000000000000000000000000000000000000000",
            )
            .unwrap(),
            nonce: B64::from(U64::ZERO),
            base_fee_per_gas: Some(U256::from(0x036bu64)),
            withdrawals_root: None,
        };
        assert_eq!(header.hash(), expected_hash);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_decode_block_header() {
        let data = hex::decode("f901f9a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008208ae820d0582115c8215b3821a0a827788a00000000000000000000000000000000000000000000000000000000000000000880000000000000000").unwrap();
        let expected = Header {
            parent_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            ommers_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            beneficiary: H160::from_str("0000000000000000000000000000000000000000").unwrap(),
            state_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            transactions_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            receipts_root: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            logs_bloom: <[u8; 256]>::from_hex("00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000").unwrap().into(),
            difficulty: 0x8aeu64.into(),
            number: 0xd05u64.into(),
            gas_limit: 0x115cu64.into(),
            gas_used: 0x15b3u64.into(),
            timestamp: 0x1a0au64,
            extra_data: hex::decode("7788").unwrap().into(),
            mix_hash: B256::from_str("0000000000000000000000000000000000000000000000000000000000000000").unwrap(),
            nonce: U64::from(0x0),
            base_fee_per_gas: None,
        };
        let header = <Header as open_fastrlp::Decodable>::decode(&mut data.as_slice()).unwrap();
        assert_eq!(header, expected);
    }

    #[test]
    #[cfg(feature = "fastrlp")]
    // Test vector from network
    fn block_network_fastrlp_roundtrip() {
        use open_fastrlp::Encodable;

        let data = hex::decode("f9034df90348a0fbdbd8d2d0ac5f14bd5fa90e547fe6f1d15019c724f8e7b60972d381cd5d9cf8a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794c9577e7945db22e38fc060909f2278c7746b0f9ba05017cfa3b0247e35197215ae8d610265ffebc8edca8ea66d6567eb0adecda867a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018355bb7b871fffffffffffff808462bd0e1ab9014bf90148a00000000000000000000000000000000000000000000000000000000000000000f85494319fa8f1bc4e53410e92d10d918659b16540e60a945a573efb304d04c1224cd012313e827eca5dce5d94a9c831c5a268031176ebf5f3de5051e8cba0dbfe94c9577e7945db22e38fc060909f2278c7746b0f9b808400000000f8c9b841a6946f2d16f68338cbcbd8b117374ab421128ce422467088456bceba9d70c34106128e6d4564659cf6776c08a4186063c0a05f7cffd695c10cf26a6f301b67f800b8412b782100c18c35102dc0a37ece1a152544f04ad7dc1868d18a9570f744ace60870f822f53d35e89a2ea9709ccbf1f4a25ee5003944faa845d02dde0a41d5704601b841d53caebd6c8a82456e85c2806a9e08381f959a31fb94a77e58f00e38ad97b2e0355b8519ab2122662cbe022f2a4ef7ff16adc0b2d5dcd123181ec79705116db300a063746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365880000000000000000c0c0").unwrap();

        let block = <Block as open_fastrlp::Decodable>::decode(&mut data.as_slice()).unwrap();

        // encode and check that it matches the original data
        let mut encoded = Vec::new();
        block.encode(&mut encoded);
        assert_eq!(data, encoded);

        // check that length of encoding is the same as the output of `length`
        assert_eq!(block.length(), encoded.len());
    }
}
