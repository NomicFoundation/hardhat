use revm_primitives::{Address, B256};
use sha3::digest::FixedOutput;
use sha3::{Digest, Sha3_256};
use std::fmt;

use crate::remote::methods::{GetLogsInput, MethodInvocation};
use crate::remote::{BlockSpec, Eip1898BlockSpec};
use crate::U256;

/// Potentially cacheable Ethereum JSON-RPC method invocation.
#[derive(Clone, Debug)]
pub(super) enum CacheableMethodInvocation<'a> {
    /// eth_chainId
    ChainId,
    /// eth_getBalance
    GetBalance {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    },
    /// eth_getBlockByNumber
    GetBlockByNumber {
        block_spec: &'a BlockSpec,

        /// include transaction data
        include_tx_data: bool,
    },
    /// eth_getBlockByHash
    GetBlockByHash {
        /// hash
        block_hash: &'a B256,
        /// include transaction data
        include_tx_data: bool,
    },
    /// eth_getBlockTransactionCountByHash
    GetBlockTransactionCountByHash { block_hash: &'a B256 },
    /// eth_getBlockTransactionCountByNumber
    GetBlockTransactionCountByNumber { block_spec: &'a BlockSpec },
    /// eth_getCode
    GetCode {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    },
    /// eth_getLogs
    GetLogs { params: &'a GetLogsInput },
    /// eth_getStorageAt
    GetStorageAt {
        address: &'a Address,
        position: &'a U256,
        block_spec: &'a Option<BlockSpec>,
    },
    /// eth_getTransactionByBlockHashAndIndex
    GetTransactionByBlockHashAndIndex {
        block_hash: &'a B256,
        index: &'a U256,
    },
    /// eth_getTransactionByBlockNumberAndIndex
    GetTransactionByBlockNumberAndIndex {
        block_number: &'a U256,
        index: &'a U256,
    },
    /// eth_getTransactionByHash
    GetTransactionByHash { transaction_hash: &'a B256 },
    /// eth_getTransactionCount
    GetTransactionCount {
        address: &'a Address,
        block_spec: &'a Option<BlockSpec>,
    },
    /// eth_getTransactionReceipt
    GetTransactionReceipt { transaction_hash: &'a B256 },
    /// net_version
    NetVersion,
}

impl<'a> CacheableMethodInvocation<'a> {
    pub(super) fn cache_key(&self) -> Option<CacheKey> {
        Some(Hasher::new().hash_method_invocation(self)?.finalize())
    }
}

/// Error type for [`CacheableMethodInvocation::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Method is not cacheable: {0:?}")]
pub(super) struct MethodNotCacheableError(MethodInvocation);

impl<'a> TryFrom<&'a MethodInvocation> for CacheableMethodInvocation<'a> {
    type Error = MethodNotCacheableError;

    fn try_from(value: &'a MethodInvocation) -> Result<Self, Self::Error> {
        match value {
            MethodInvocation::ChainId() => Ok(CacheableMethodInvocation::ChainId),
            MethodInvocation::GetBalance(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetBalance {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetBlockByNumber(block_spec, include_tx_data) => {
                Ok(CacheableMethodInvocation::GetBlockByNumber {
                    block_spec,
                    include_tx_data: *include_tx_data,
                })
            }
            MethodInvocation::GetBlockByHash(block_hash, include_tx_data) => {
                Ok(CacheableMethodInvocation::GetBlockByHash {
                    block_hash,
                    include_tx_data: *include_tx_data,
                })
            }
            MethodInvocation::GetBlockTransactionCountByHash(block_hash) => {
                Ok(CacheableMethodInvocation::GetBlockTransactionCountByHash { block_hash })
            }
            MethodInvocation::GetBlockTransactionCountByNumber(block_spec) => {
                Ok(CacheableMethodInvocation::GetBlockTransactionCountByNumber { block_spec })
            }
            MethodInvocation::GetCode(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetCode {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetLogs(params) => Ok(CacheableMethodInvocation::GetLogs { params }),
            MethodInvocation::GetStorageAt(address, position, block_spec) => {
                Ok(CacheableMethodInvocation::GetStorageAt {
                    address,
                    position,
                    block_spec,
                })
            }
            MethodInvocation::GetTransactionByBlockHashAndIndex(block_hash, index) => Ok(
                CacheableMethodInvocation::GetTransactionByBlockHashAndIndex { block_hash, index },
            ),
            MethodInvocation::GetTransactionByBlockNumberAndIndex(block_number, index) => Ok(
                CacheableMethodInvocation::GetTransactionByBlockNumberAndIndex {
                    block_number,
                    index,
                },
            ),
            MethodInvocation::GetTransactionByHash(transaction_hash) => {
                Ok(CacheableMethodInvocation::GetTransactionByHash { transaction_hash })
            }
            MethodInvocation::GetTransactionCount(address, block_spec) => {
                Ok(CacheableMethodInvocation::GetTransactionCount {
                    address,
                    block_spec,
                })
            }
            MethodInvocation::GetTransactionReceipt(transaction_hash) => {
                Ok(CacheableMethodInvocation::GetTransactionReceipt { transaction_hash })
            }
            MethodInvocation::NetVersion() => Ok(CacheableMethodInvocation::NetVersion),

            // Explicit to make sure if a new method is added, it is not forgotten here.
            MethodInvocation::Accounts()
            | MethodInvocation::BlockNumber()
            | MethodInvocation::Call(_, _)
            | MethodInvocation::Coinbase()
            | MethodInvocation::EstimateGas(_, _)
            | MethodInvocation::FeeHistory(_, _, _)
            | MethodInvocation::GasPrice()
            | MethodInvocation::GetFilterChanges(_)
            | MethodInvocation::GetFilterLogs(_)
            | MethodInvocation::Mining()
            | MethodInvocation::NetListening()
            | MethodInvocation::NetPeerCount()
            | MethodInvocation::NewBlockFilter()
            | MethodInvocation::NewFilter(_)
            | MethodInvocation::NewPendingTransactionFilter()
            | MethodInvocation::PendingTransactions()
            | MethodInvocation::SendRawTransaction(_)
            | MethodInvocation::SendTransaction(_)
            | MethodInvocation::Sign(_, _)
            | MethodInvocation::SignTypedDataV4(_, _)
            | MethodInvocation::Subscribe(_)
            | MethodInvocation::Syncing()
            | MethodInvocation::UninstallFilter(_)
            | MethodInvocation::Unsubscribe(_)
            | MethodInvocation::Web3ClientVersion()
            | MethodInvocation::Web3Sha3(_)
            | MethodInvocation::EvmIncreaseTime(_)
            | MethodInvocation::EvmMine(_)
            | MethodInvocation::EvmSetAutomine(_)
            | MethodInvocation::EvmSetIntervalMining(_)
            | MethodInvocation::EvmSetNextBlockTimestamp(_)
            | MethodInvocation::EvmSnapshot() => Err(MethodNotCacheableError(value.clone())),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[repr(transparent)]
pub(super) struct CacheKey(String);

impl fmt::Display for CacheKey {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

#[derive(Debug)]
struct Hasher {
    hasher: Sha3_256,
}

// The methods take `mut self` instead of `&mut self` to make sure no hash is constructed if one of
// the method arguments are invalid (in which case the method returns None and consumes self).
//
// Before variants of an enum are hashed, a variant marker is hashed before hashing the values of
// the variants to distinguish between them. E.g. the hash of `Enum::Foo(1u8)` should not equal the
// hash of `Enum::Bar(1u8)`, since these are not logically equivalent. This matches the behavior of
// the `Hash` derivation of the Rust standard library for enums.
//
// Instead of ignoring `None` values, the same pattern is followed for Options in order to let us
// distinguish between `[None, Some("a")]` and `[Some("a")]`. Note that if we use the cache key
// variant `0u8` for `None`, it's ok if `None` and `0u8`, hash to the same values since a type where
// `Option` and `u8` are valid values must be wrapped in an enum in Rust and the enum cache key
// variant prefix will distinguish between them. This wouldn't be the case with JSON though.
//
// When adding new types such as sequences or strings, [prefix
// collisions](https://doc.rust-lang.org/std/hash/trait.Hash.html#prefix-collisions) should be
// considered.
impl Hasher {
    fn new() -> Self {
        Self {
            hasher: Sha3_256::new(),
        }
    }

    fn hash_bytes(mut self, bytes: impl AsRef<[u8]>) -> Self {
        self.hasher.update(bytes);

        self
    }

    fn hash_u8(self, value: u8) -> Self {
        self.hash_bytes(value.to_le_bytes())
    }

    fn hash_bool(self, value: &bool) -> Self {
        self.hash_u8(u8::from(*value))
    }

    fn hash_address(self, address: &Address) -> Self {
        self.hash_bytes(address.as_bytes())
    }

    fn hash_u256(self, value: &U256) -> Self {
        self.hash_bytes(value.as_le_bytes())
    }

    fn hash_b256(self, value: &B256) -> Self {
        self.hash_bytes(value.as_bytes())
    }

    fn hash_block_spec(self, block_spec: &BlockSpec) -> Option<Self> {
        let this = self.hash_u8(block_spec.cache_key_variant());

        let this = match block_spec {
            BlockSpec::Number(block_number) => Some(this.hash_u256(block_number)),
            // Cannot construct cache key from block tags as they're ambiguous.
            BlockSpec::Tag(_) => None,
            BlockSpec::Eip1898(value) => {
                let this = this.hash_u8(value.cache_key_variant());

                match value {
                    Eip1898BlockSpec::Hash {
                        block_hash,
                        require_canonical,
                    } => {
                        let this = this
                            .hash_b256(block_hash)
                            .hash_u8(require_canonical.cache_key_variant());
                        match require_canonical {
                            Some(require_canonical) => Some(this.hash_bool(require_canonical)),
                            None => Some(this),
                        }
                    }
                    Eip1898BlockSpec::Number { block_number } => Some(this.hash_u256(block_number)),
                }
            }
        }?;
        Some(this)
    }

    fn hash_maybe_block_spec(self, block_spec: &Option<BlockSpec>) -> Option<Self> {
        let this = self.hash_u8(block_spec.cache_key_variant());
        match block_spec {
            Some(block_spec) => this.hash_block_spec(block_spec),
            None => Some(this),
        }
    }

    fn hash_get_logs_input(self, params: &GetLogsInput) -> Option<Self> {
        // Destructuring to make sure we get a compiler error here if the fields change.
        let GetLogsInput {
            from_block,
            to_block,
            address,
        } = params;

        let this = self
            .hash_block_spec(from_block)?
            .hash_block_spec(to_block)?
            .hash_bytes(address.as_bytes());
        Some(this)
    }

    fn hash_method_invocation(self, method: &CacheableMethodInvocation<'_>) -> Option<Self> {
        let this = self.hash_u8(method.cache_key_variant());

        let this = match method {
            CacheableMethodInvocation::ChainId | CacheableMethodInvocation::NetVersion => this,
            CacheableMethodInvocation::GetBlockByNumber {
                block_spec,
                include_tx_data,
            } => this.hash_block_spec(block_spec)?.hash_bool(include_tx_data),
            CacheableMethodInvocation::GetBlockByHash {
                block_hash,
                include_tx_data,
            } => this.hash_b256(block_hash).hash_bool(include_tx_data),
            CacheableMethodInvocation::GetBlockTransactionCountByHash { block_hash } => {
                this.hash_b256(block_hash)
            }
            CacheableMethodInvocation::GetBlockTransactionCountByNumber { block_spec } => {
                this.hash_block_spec(block_spec)?
            }
            CacheableMethodInvocation::GetBalance {
                address,
                block_spec,
            }
            | CacheableMethodInvocation::GetCode {
                address,
                block_spec,
            }
            | CacheableMethodInvocation::GetTransactionCount {
                address,
                block_spec,
            } => this
                .hash_address(address)
                .hash_maybe_block_spec(block_spec)?,
            CacheableMethodInvocation::GetLogs { params } => this.hash_get_logs_input(params)?,
            CacheableMethodInvocation::GetStorageAt {
                address,
                position,
                block_spec,
            } => this
                .hash_address(address)
                .hash_u256(position)
                .hash_maybe_block_spec(block_spec)?,
            CacheableMethodInvocation::GetTransactionByBlockHashAndIndex { block_hash, index } => {
                this.hash_b256(block_hash).hash_u256(index)
            }
            CacheableMethodInvocation::GetTransactionByBlockNumberAndIndex {
                block_number,
                index,
            } => this.hash_u256(block_number).hash_u256(index),
            CacheableMethodInvocation::GetTransactionByHash { transaction_hash }
            | CacheableMethodInvocation::GetTransactionReceipt { transaction_hash } => {
                this.hash_b256(transaction_hash)
            }
        };

        Some(this)
    }

    fn finalize(self) -> CacheKey {
        CacheKey(hex::encode(self.hasher.finalize_fixed()))
    }
}

// This could be replaced by the unstable
// [`core::intrinsics::discriminant_value`](https://dev-doc.rust-lang.org/beta/core/intrinsics/fn.discriminant_value.html)
// function once it becomes stable.
trait CacheKeyVariant {
    fn cache_key_variant(&self) -> u8;
}

impl<T> CacheKeyVariant for Option<T> {
    fn cache_key_variant(&self) -> u8 {
        match self {
            None => 0,
            Some(_) => 1,
        }
    }
}

impl<'a> CacheKeyVariant for &'a CacheableMethodInvocation<'a> {
    fn cache_key_variant(&self) -> u8 {
        match self {
            CacheableMethodInvocation::ChainId => 0,
            CacheableMethodInvocation::GetBalance { .. } => 1,
            CacheableMethodInvocation::GetBlockByNumber { .. } => 2,
            CacheableMethodInvocation::GetBlockByHash { .. } => 3,
            CacheableMethodInvocation::GetBlockTransactionCountByHash { .. } => 4,
            CacheableMethodInvocation::GetBlockTransactionCountByNumber { .. } => 5,
            CacheableMethodInvocation::GetCode { .. } => 6,
            CacheableMethodInvocation::GetLogs { .. } => 7,
            CacheableMethodInvocation::GetStorageAt { .. } => 8,
            CacheableMethodInvocation::GetTransactionByBlockHashAndIndex { .. } => 9,
            CacheableMethodInvocation::GetTransactionByBlockNumberAndIndex { .. } => 10,
            CacheableMethodInvocation::GetTransactionByHash { .. } => 11,
            CacheableMethodInvocation::GetTransactionCount { .. } => 12,
            CacheableMethodInvocation::GetTransactionReceipt { .. } => 13,
            CacheableMethodInvocation::NetVersion => 14,
        }
    }
}

impl CacheKeyVariant for BlockSpec {
    fn cache_key_variant(&self) -> u8 {
        match self {
            BlockSpec::Number(_) => 0,
            BlockSpec::Tag(_) => 1,
            BlockSpec::Eip1898(_) => 2,
        }
    }
}

impl CacheKeyVariant for Eip1898BlockSpec {
    fn cache_key_variant(&self) -> u8 {
        match self {
            Eip1898BlockSpec::Hash { .. } => 0,
            Eip1898BlockSpec::Number { .. } => 1,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::remote::BlockTag;

    #[test]
    fn test_hash_length() {
        let hash = Hasher::new().hash_u8(0).finalize();
        // 32 bytes as hex
        assert_eq!(hash.0.len(), 2 * 32);
    }

    #[test]
    fn test_hasher_block_spec_tag() {
        let result = Hasher::new().hash_block_spec(&BlockSpec::Tag(BlockTag::Latest));

        assert!(result.is_none());
    }

    #[test]
    fn test_hasher_block_spec_number_variants_not_equal() {
        let block_number = U256::default();

        let hash_one = Hasher::new()
            .hash_block_spec(&BlockSpec::Number(block_number))
            .unwrap()
            .finalize();
        let hash_two = Hasher::new()
            .hash_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Number {
                block_number,
            }))
            .unwrap()
            .finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_hasher_block_spec_eip1898_variants_not_equal() {
        let block_number = U256::default();
        let block_hash = B256::default();

        assert_eq!(block_number.as_le_bytes(), block_hash.as_bytes());

        let hash_one = Hasher::new()
            .hash_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Hash {
                block_hash,
                require_canonical: None,
            }))
            .unwrap()
            .finalize();
        let hash_two = Hasher::new()
            .hash_block_spec(&BlockSpec::Eip1898(Eip1898BlockSpec::Number {
                block_number,
            }))
            .unwrap()
            .finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_hash_maybe_block_spec() {
        let hash_one = Hasher::new()
            .hash_maybe_block_spec(&None)
            .unwrap()
            .finalize();
        let hash_two = Hasher::new().finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_get_logs_input_from_to_matters() {
        let from = BlockSpec::Number(U256::try_from(1).unwrap());
        let to = BlockSpec::Number(U256::try_from(2).unwrap());
        let address = Address::default();

        let hash_one = Hasher::new()
            .hash_get_logs_input(&GetLogsInput {
                from_block: from.clone(),
                to_block: to.clone(),
                address,
            })
            .unwrap()
            .finalize();

        let hash_two = Hasher::new()
            .hash_get_logs_input(&GetLogsInput {
                from_block: to,
                to_block: from,
                address,
            })
            .unwrap()
            .finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_no_arguments_keys_not_equal() {
        let key_one = CacheableMethodInvocation::ChainId.cache_key().unwrap();
        let key_two = CacheableMethodInvocation::NetVersion.cache_key().unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_same_arguments_keys_not_equal() {
        let value = B256::default();
        let key_one = CacheableMethodInvocation::GetTransactionByHash {
            transaction_hash: &value,
        }
        .cache_key()
        .unwrap();
        let key_two = CacheableMethodInvocation::GetTransactionReceipt {
            transaction_hash: &value,
        }
        .cache_key()
        .unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_get_storage_at_block_spec_is_taken_into_account() {
        let address = Address::default();
        let position = U256::default();

        let key_one = CacheableMethodInvocation::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: &None,
        }
        .cache_key()
        .unwrap();

        let key_two = CacheableMethodInvocation::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: &Some(BlockSpec::Number(U256::default())),
        }
        .cache_key()
        .unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_get_storage_at_block_same_matches() {
        let address = Address::default();
        let position = U256::default();
        let block_spec = Some(BlockSpec::Number(U256::default()));

        let key_one = CacheableMethodInvocation::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: &block_spec,
        }
        .cache_key()
        .unwrap();

        let key_two = CacheableMethodInvocation::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: &block_spec,
        }
        .cache_key()
        .unwrap();

        assert_eq!(key_one, key_two);
    }
}
