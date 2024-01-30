// Part of this code was adapted from foundry and is distributed under their
// licenss:
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-APACHE
// - https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/LICENSE-MIT
// For the original context see: https://github.com/foundry-rs/foundry/blob/01b16238ff87dc7ca8ee3f5f13e389888c2a2ee4/anvil/core/src/eth/block.rs

mod difficulty;
mod options;
mod reorg;
mod reward;

use std::sync::OnceLock;

use alloy_rlp::{BufMut, Decodable, RlpDecodable, RlpEncodable};
use revm_primitives::{calc_excess_blob_gas, keccak256};

use self::difficulty::calculate_ethash_canonical_difficulty;
pub use self::{
    options::BlockOptions,
    reorg::{
        block_time, is_safe_block_number, largest_safe_block_number, safe_block_depth,
        IsSafeBlockNumberArgs, LargestSafeBlockNumberArgs,
    },
    reward::miner_reward,
};
use crate::{
    transaction::SignedTransaction,
    trie::{self, KECCAK_NULL_RLP},
    withdrawal::Withdrawal,
    Address, Bloom, Bytes, SpecId, B256, B64, U256,
};

/// Ethereum block
#[derive(Clone, Debug, Eq)]
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
    /// Constructs a new block from the provided partial header, transactions,
    /// and ommers.
    pub fn new(
        mut partial_header: PartialHeader,
        transactions: Vec<SignedTransaction>,
        ommers: Vec<Header>,
        withdrawals: Option<Vec<Withdrawal>>,
    ) -> Self {
        let ommers_hash = keccak256(alloy_rlp::encode(&ommers));
        let transactions_root = trie::ordered_trie_root(transactions.iter().map(alloy_rlp::encode));

        if let Some(withdrawals) = withdrawals.as_ref() {
            partial_header.withdrawals_root = Some(trie::ordered_trie_root(
                withdrawals.iter().map(alloy_rlp::encode),
            ));
        }

        Self {
            header: Header::new(partial_header, ommers_hash, transactions_root),
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
#[derive(Clone, Debug, Default, PartialEq, Eq, RlpDecodable, RlpEncodable)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
#[rlp(trailing)]
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
    pub number: u64,
    /// The block's gas limit
    pub gas_limit: u64,
    /// The amount of gas used by the block
    pub gas_used: u64,
    /// The block's timestamp
    pub timestamp: u64,
    /// The block's extra data
    pub extra_data: Bytes,
    /// The block's mix hash
    pub mix_hash: B256,
    /// The block's nonce
    // #[cfg_attr(feature = "serde", serde(with = "crate::serde::u64"))]
    pub nonce: B64,
    /// BaseFee was added by EIP-1559 and is ignored in legacy headers.
    pub base_fee_per_gas: Option<U256>,
    /// WithdrawalsHash was added by EIP-4895 and is ignored in legacy headers.
    pub withdrawals_root: Option<B256>,
    /// Blob gas was added by EIP-4844 and is ignored in older headers.
    #[cfg_attr(feature = "serde", serde(flatten))]
    pub blob_gas: Option<BlobGas>,
    /// The hash tree root of the parent beacon block for the given execution
    /// block (EIP-4788).
    pub parent_beacon_block_root: Option<B256>,
}

/// Information about the blob gas used in a block.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct BlobGas {
    /// The total amount of blob gas consumed by the transactions within the
    /// block.
    pub gas_used: u64,
    /// The running total of blob gas consumed in excess of the target, prior to
    /// the block. Blocks with above-target blob gas consumption increase this
    /// value, blocks with below-target blob gas consumption decrease it
    /// (bounded at 0).
    pub excess_gas: u64,
}

// We need a custom implementation to avoid the struct being treated as an RLP
// list.
impl Decodable for BlobGas {
    fn decode(buf: &mut &[u8]) -> alloy_rlp::Result<Self> {
        let blob_gas = Self {
            gas_used: u64::decode(buf)?,
            excess_gas: u64::decode(buf)?,
        };

        Ok(blob_gas)
    }
}

// We need a custom implementation to avoid the struct being treated as an RLP
// list.
impl alloy_rlp::Encodable for BlobGas {
    fn encode(&self, out: &mut dyn BufMut) {
        self.gas_used.encode(out);
        self.excess_gas.encode(out);
    }

    fn length(&self) -> usize {
        self.gas_used.length() + self.excess_gas.length()
    }
}

impl Header {
    /// Constructs a header from the provided [`PartialHeader`], ommers' root
    /// hash, transactions' root hash, and withdrawals' root hash.
    pub fn new(partial_header: PartialHeader, ommers_hash: B256, transactions_root: B256) -> Self {
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
            withdrawals_root: partial_header.withdrawals_root,
            blob_gas: partial_header.blob_gas,
            parent_beacon_block_root: partial_header.parent_beacon_block_root,
        }
    }

    /// Calculates the block's hash.
    pub fn hash(&self) -> B256 {
        let encoded = alloy_rlp::encode(self);
        keccak256(encoded)
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
    pub number: u64,
    /// The block's gas limit
    pub gas_limit: u64,
    /// The amount of gas used by the block
    pub gas_used: u64,
    /// The block's timestamp
    pub timestamp: u64,
    /// The block's extra data
    pub extra_data: Bytes,
    /// The block's mix hash
    pub mix_hash: B256,
    /// The block's nonce
    pub nonce: B64,
    /// BaseFee was added by EIP-1559 and is ignored in legacy headers.
    pub base_fee: Option<U256>,
    /// WithdrawalsHash was added by EIP-4895 and is ignored in legacy headers.
    pub withdrawals_root: Option<B256>,
    /// Blob gas was added by EIP-4844 and is ignored in older headers.
    pub blob_gas: Option<BlobGas>,
    /// The hash tree root of the parent beacon block for the given execution
    /// block (EIP-4788).
    pub parent_beacon_block_root: Option<B256>,
}

impl PartialHeader {
    /// Constructs a new instance based on the provided [`BlockOptions`] and
    /// parent [`Header`] for the given [`SpecId`].
    pub fn new(spec_id: SpecId, options: BlockOptions, parent: Option<&Header>) -> Self {
        let timestamp = options.timestamp.unwrap_or_default();
        let number = options.number.unwrap_or({
            if let Some(parent) = &parent {
                parent.number + 1
            } else {
                0
            }
        });

        let parent_hash = options.parent_hash.unwrap_or_else(|| {
            if let Some(parent) = parent {
                parent.hash()
            } else {
                B256::ZERO
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
                    calculate_ethash_canonical_difficulty(spec_id, parent, number, timestamp)
                } else {
                    U256::from(1)
                }
            }),
            number,
            gas_limit: options.gas_limit.unwrap_or(1_000_000),
            gas_used: 0,
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
            withdrawals_root: options.withdrawals_root.or_else(|| {
                if spec_id >= SpecId::SHANGHAI {
                    Some(KECCAK_NULL_RLP)
                } else {
                    None
                }
            }),
            blob_gas: if spec_id >= SpecId::CANCUN {
                let excess_gas = parent.and_then(|parent| parent.blob_gas.as_ref()).map_or(
                    // For the first (post-fork) block, both parent.blob_gas_used and
                    // parent.excess_blob_gas are evaluated as 0.
                    0,
                    |BlobGas {
                         gas_used,
                         excess_gas,
                     }| calc_excess_blob_gas(*excess_gas, *gas_used),
                );

                Some(BlobGas {
                    gas_used: 0,
                    excess_gas,
                })
            } else {
                None
            },
            parent_beacon_block_root: options.parent_beacon_block_root.or_else(|| {
                if spec_id >= SpecId::CANCUN {
                    Some(B256::ZERO)
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
            number: u64::default(),
            gas_limit: DEFAULT_GAS,
            gas_used: u64::default(),
            timestamp: u64::default(),
            extra_data: Bytes::default(),
            mix_hash: B256::default(),
            nonce: B64::default(),
            base_fee: None,
            withdrawals_root: None,
            blob_gas: None,
            parent_beacon_block_root: None,
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
            withdrawals_root: header.withdrawals_root,
            blob_gas: header.blob_gas,
            parent_beacon_block_root: header.parent_beacon_block_root,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;
    use crate::trie::KECCAK_RLP_EMPTY_ARRAY;

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
            number: 124,
            gas_limit: u64::default(),
            gas_used: 1337,
            timestamp: 0,
            extra_data: Bytes::default(),
            mix_hash: B256::default(),
            nonce: B64::from(99u64),
            base_fee_per_gas: None,
            withdrawals_root: None,
            blob_gas: None,
            parent_beacon_block_root: None,
        };

        let encoded = alloy_rlp::encode(&header);
        let decoded = Header::decode(&mut encoded.as_slice()).unwrap();
        assert_eq!(header, decoded);

        header.base_fee_per_gas = Some(U256::from(12345));

        let encoded = alloy_rlp::encode(&header);
        let decoded = Header::decode(&mut encoded.as_slice()).unwrap();
        assert_eq!(header, decoded);
    }

    #[test]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_encode_block_header() {
        let expected = hex::decode("f901f9a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008208ae820d0582115c8215b3821a0a827788a00000000000000000000000000000000000000000000000000000000000000000880000000000000000").unwrap();

        let header = Header {
            parent_hash: B256::ZERO,
            ommers_hash: B256::ZERO,
            beneficiary: Address::ZERO,
            state_root: B256::ZERO,
            transactions_root: B256::ZERO,
            receipts_root: B256::ZERO,
            logs_bloom: Bloom::ZERO,
            difficulty: U256::from(0x8aeu64),
            number: 0xd05u64,
            gas_limit: 0x115cu64,
            gas_used: 0x15b3u64,
            timestamp: 0x1a0au64,
            extra_data: hex::decode("7788").unwrap().into(),
            mix_hash: B256::ZERO,
            nonce: B64::ZERO,
            base_fee_per_gas: None,
            withdrawals_root: None,
            blob_gas: None,
            parent_beacon_block_root: None,
        };
        let encoded = alloy_rlp::encode(&header);
        assert_eq!(encoded, expected);
    }

    #[test]
    // Test vector from: https://github.com/ethereum/tests/blob/f47bbef4da376a49c8fc3166f09ab8a6d182f765/BlockchainTests/ValidBlocks/bcEIP1559/baseFee.json#L15-L36
    fn test_eip1559_block_header_hash() {
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
            logs_bloom: Bloom::ZERO,
            difficulty: U256::from(0x020000u64),
            number: 0x01,
            gas_limit: 0x016345785d8a0000,
            gas_used: 0x015534,
            timestamp: 0x079e,
            extra_data: hex::decode("42").unwrap().into(),
            mix_hash: B256::ZERO,
            nonce: B64::ZERO,
            base_fee_per_gas: Some(U256::from(0x036bu64)),
            withdrawals_root: None,
            blob_gas: None,
            parent_beacon_block_root: None,
        };
        assert_eq!(header.hash(), expected_hash);
    }

    #[test]
    // Test vector from: https://eips.ethereum.org/EIPS/eip-2481
    fn test_decode_block_header() {
        let data = hex::decode("f901f9a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008208ae820d0582115c8215b3821a0a827788a00000000000000000000000000000000000000000000000000000000000000000880000000000000000").unwrap();

        let expected = Header {
            parent_hash: B256::ZERO,
            ommers_hash: B256::ZERO,
            beneficiary: Address::ZERO,
            state_root: B256::ZERO,
            transactions_root: B256::ZERO,
            receipts_root: B256::ZERO,
            logs_bloom: Bloom::ZERO,
            difficulty: U256::from(0x8aeu64),
            number: 0xd05u64,
            gas_limit: 0x115cu64,
            gas_used: 0x15b3u64,
            timestamp: 0x1a0au64,
            extra_data: hex::decode("7788").unwrap().into(),
            mix_hash: B256::ZERO,
            nonce: B64::ZERO,
            base_fee_per_gas: None,
            withdrawals_root: None,
            blob_gas: None,
            parent_beacon_block_root: None,
        };
        let decoded = Header::decode(&mut data.as_slice()).unwrap();
        assert_eq!(decoded, expected);
    }

    // Test vector from https://github.com/ethereum/tests/blob/a33949df17a1c382ffee5666e66d26bde7a089f9/EIPTests/Pyspecs/cancun/eip4844_blobs/correct_increasing_blob_gas_costs.json#L16
    #[test]
    fn block_header_rlp_encoding_cancun() {
        let expected_encoding = hex::decode("f90242a0258811d02512e87e09253a948330eff05da06b7656143a211fa3687901217f57a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347942adc25665018aa1fe0e6bc666dac8fc2697ff9baa06a086c92bb1d4ee6dc4ca73e66529037591bd4d6590350f6c904bc78dc21b75ca0dc387fc6ef9e3eb53baa85df89a1f9b91a4a9ab472ee7e928b4b7fdc06dfa5d1a0eaa8c40899a61ae59615cf9985f5e2194f8fd2b57d273be63bde6733e89b12abb9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800188016345785d8a00008252080c80a0000000000000000000000000000000000000000000000000000000000000000088000000000000000007a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b4218308000083220000a00000000000000000000000000000000000000000000000000000000000000000").unwrap();
        let expected_hash =
            B256::from_str("0xd2caf87ef0ecbbf1d8721e4f63d56b3a5b4bf8b5faa0409aa6b99a729affe346")
                .unwrap();

        let header = Header {
            base_fee_per_gas: Some(U256::from(0x07u64)),
            blob_gas: Some(BlobGas {
                gas_used: 0x080000u64,
                excess_gas: 0x220000u64,
            }),
            logs_bloom: Bloom::ZERO,
            beneficiary: Address::from_str("0x2adc25665018aa1fe0e6bc666dac8fc2697ff9ba").unwrap(),
            difficulty: U256::ZERO,
            extra_data: Bytes::default(),
            gas_limit: 0x016345785d8a0000u64,
            gas_used: 0x5208u64,
            mix_hash: B256::ZERO,
            nonce: B64::ZERO,
            number: 0x01u64,
            parent_beacon_block_root: Some(B256::ZERO),
            parent_hash: B256::from_str(
                "0x258811d02512e87e09253a948330eff05da06b7656143a211fa3687901217f57",
            )
            .unwrap(),
            receipts_root: B256::from_str(
                "0xeaa8c40899a61ae59615cf9985f5e2194f8fd2b57d273be63bde6733e89b12ab",
            )
            .unwrap(),
            state_root: B256::from_str(
                "0x6a086c92bb1d4ee6dc4ca73e66529037591bd4d6590350f6c904bc78dc21b75c",
            )
            .unwrap(),
            timestamp: 0x0cu64,
            transactions_root: B256::from_str(
                "0xdc387fc6ef9e3eb53baa85df89a1f9b91a4a9ab472ee7e928b4b7fdc06dfa5d1",
            )
            .unwrap(),
            ommers_hash: KECCAK_RLP_EMPTY_ARRAY,
            withdrawals_root: Some(KECCAK_NULL_RLP),
        };

        let encoded = alloy_rlp::encode(&header);
        assert_eq!(encoded, expected_encoding);
        assert_eq!(header.hash(), expected_hash);
    }
}
