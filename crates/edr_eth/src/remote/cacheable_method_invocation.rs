use sha3::{digest::FixedOutput, Digest, Sha3_256};

use super::filter::OneOrMore;
use crate::{
    block::{is_safe_block_number, IsSafeBlockNumberArgs},
    remote::{
        eth::GetLogsInput, request_methods::RequestMethod, BlockSpec, BlockTag, Eip1898BlockSpec,
        PreEip1898BlockSpec,
    },
    Address, B256, U256,
};

pub(super) fn try_read_cache_key(method: &RequestMethod) -> Option<ReadCacheKey> {
    CacheableRequestMethod::try_from(method)
        .ok()
        .and_then(CacheableRequestMethod::read_cache_key)
}

pub(super) fn try_write_cache_key(method: &RequestMethod) -> Option<WriteCacheKey> {
    CacheableRequestMethod::try_from(method)
        .ok()
        .and_then(CacheableRequestMethod::write_cache_key)
}

/// Potentially cacheable Ethereum JSON-RPC methods.
#[derive(Clone, Debug)]
enum CacheableRequestMethod<'a> {
    /// eth_chainId
    ChainId,
    /// eth_getBalance
    GetBalance {
        address: &'a Address,
        block_spec: CacheableBlockSpec<'a>,
    },
    /// eth_getBlockByNumber
    GetBlockByNumber {
        block_spec: CacheableBlockSpec<'a>,

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
    /// eth_getCode
    GetCode {
        address: &'a Address,
        block_spec: CacheableBlockSpec<'a>,
    },
    /// eth_getLogs
    GetLogs { params: CacheableGetLogsInput<'a> },
    /// eth_getStorageAt
    GetStorageAt {
        address: &'a Address,
        position: &'a U256,
        block_spec: CacheableBlockSpec<'a>,
    },
    /// eth_getTransactionByHash
    GetTransactionByHash { transaction_hash: &'a B256 },
    /// eth_getTransactionCount
    GetTransactionCount {
        address: &'a Address,
        block_spec: CacheableBlockSpec<'a>,
    },
    /// eth_getTransactionReceipt
    GetTransactionReceipt { transaction_hash: &'a B256 },
    /// net_version
    NetVersion,
}

impl<'a> CacheableRequestMethod<'a> {
    fn read_cache_key(self) -> Option<ReadCacheKey> {
        let cache_key = Hasher::new().hash_method(&self).ok()?.finalize();
        Some(ReadCacheKey(cache_key))
    }

    #[allow(clippy::match_same_arms)]
    fn write_cache_key(self) -> Option<WriteCacheKey> {
        match Hasher::new().hash_method(&self) {
            Err(SymbolicBlogTagError) => WriteCacheKey::needs_block_number(self),
            Ok(hasher) => match self {
                CacheableRequestMethod::ChainId => Some(WriteCacheKey::finalize(hasher)),
                CacheableRequestMethod::GetBalance {
                    address: _,
                    block_spec,
                } => WriteCacheKey::needs_safety_check(hasher, block_spec),
                CacheableRequestMethod::GetBlockByNumber {
                    block_spec,
                    include_tx_data: _,
                } => WriteCacheKey::needs_safety_check(hasher, block_spec),
                CacheableRequestMethod::GetBlockByHash {
                    block_hash: _,
                    include_tx_data: _,
                } => Some(WriteCacheKey::finalize(hasher)),
                CacheableRequestMethod::GetCode {
                    address: _,
                    block_spec,
                } => WriteCacheKey::needs_safety_check(hasher, block_spec),
                CacheableRequestMethod::GetLogs {
                    params,
                    // TODO should we check that to < from?
                } => WriteCacheKey::needs_safety_check(hasher, params.to_block),
                CacheableRequestMethod::GetStorageAt {
                    address: _,
                    position: _,
                    block_spec,
                } => WriteCacheKey::needs_safety_check(hasher, block_spec),
                CacheableRequestMethod::GetTransactionByHash {
                    transaction_hash: _,
                } => Some(WriteCacheKey::finalize(hasher)),
                CacheableRequestMethod::GetTransactionCount {
                    address: _,
                    block_spec,
                } => WriteCacheKey::needs_safety_check(hasher, block_spec),
                CacheableRequestMethod::GetTransactionReceipt {
                    transaction_hash: _,
                } => Some(WriteCacheKey::finalize(hasher)),
                CacheableRequestMethod::NetVersion => Some(WriteCacheKey::finalize(hasher)),
            },
        }
    }
}

/// Error type for [`CacheableRequestMethod::try_from`].
#[derive(thiserror::Error, Debug)]
enum MethodNotCacheableError {
    #[error(transparent)]
    BlockSpec(#[from] BlockSpecNotCacheableError),
    #[error("Method is not cacheable: {0:?}")]
    RequestMethod(RequestMethod),
    #[error("Get logs input is not cacheable: {0:?}")]
    GetLogsInput(#[from] GetLogsInputNotCacheableError),
    #[error(transparent)]
    PreEip18989BlockSpec(#[from] PreEip1898BlockSpecNotCacheableError),
}

impl<'a> TryFrom<&'a RequestMethod> for CacheableRequestMethod<'a> {
    type Error = MethodNotCacheableError;

    fn try_from(value: &'a RequestMethod) -> Result<Self, Self::Error> {
        match value {
            RequestMethod::ChainId(_) => Ok(CacheableRequestMethod::ChainId),
            RequestMethod::GetBalance(address, block_spec) => {
                Ok(CacheableRequestMethod::GetBalance {
                    address,
                    block_spec: block_spec.try_into()?,
                })
            }
            RequestMethod::GetBlockByNumber(block_spec, include_tx_data) => {
                Ok(CacheableRequestMethod::GetBlockByNumber {
                    block_spec: block_spec.try_into()?,
                    include_tx_data: *include_tx_data,
                })
            }
            RequestMethod::GetBlockByHash(block_hash, include_tx_data) => {
                Ok(CacheableRequestMethod::GetBlockByHash {
                    block_hash,
                    include_tx_data: *include_tx_data,
                })
            }
            RequestMethod::GetCode(address, block_spec) => Ok(CacheableRequestMethod::GetCode {
                address,
                block_spec: block_spec.try_into()?,
            }),
            RequestMethod::GetLogs(params) => Ok(CacheableRequestMethod::GetLogs {
                params: params.try_into()?,
            }),
            RequestMethod::GetStorageAt(address, position, block_spec) => {
                Ok(CacheableRequestMethod::GetStorageAt {
                    address,
                    position,
                    block_spec: block_spec.try_into()?,
                })
            }
            RequestMethod::GetTransactionByHash(transaction_hash) => {
                Ok(CacheableRequestMethod::GetTransactionByHash { transaction_hash })
            }
            RequestMethod::GetTransactionCount(address, block_spec) => {
                Ok(CacheableRequestMethod::GetTransactionCount {
                    address,
                    block_spec: block_spec.try_into()?,
                })
            }
            RequestMethod::GetTransactionReceipt(transaction_hash) => {
                Ok(CacheableRequestMethod::GetTransactionReceipt { transaction_hash })
            }
            RequestMethod::NetVersion(_) => Ok(CacheableRequestMethod::NetVersion),

            // Explicit to make sure if a new method is added, it is not forgotten here.
            RequestMethod::BlockNumber(_) | RequestMethod::FeeHistory(_, _, _) => {
                Err(MethodNotCacheableError::RequestMethod(value.clone()))
            }
        }
    }
}

/// A block argument specification that is potentially cacheable.
#[derive(Clone, Debug)]
enum CacheableBlockSpec<'a> {
    /// Block number
    Number { block_number: u64 },
    /// Block hash
    Hash {
        block_hash: &'a B256,
        require_canonical: Option<bool>,
    },
    /// "earliest" block tag
    Earliest,
    /// "safe" block tag
    Safe,
    /// "finalized" block tag
    Finalized,
}

/// Error type for [`CacheableBlockSpec::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Block spec is not cacheable: {0:?}")]
struct BlockSpecNotCacheableError(Option<BlockSpec>);

impl<'a> TryFrom<&'a BlockSpec> for CacheableBlockSpec<'a> {
    type Error = BlockSpecNotCacheableError;

    fn try_from(value: &'a BlockSpec) -> Result<Self, Self::Error> {
        match value {
            BlockSpec::Number(block_number) => Ok(CacheableBlockSpec::Number {
                block_number: *block_number,
            }),
            BlockSpec::Tag(tag) => match tag {
                // Latest and pending can be never resolved to a safe block number.
                BlockTag::Latest | BlockTag::Pending => {
                    Err(BlockSpecNotCacheableError(Some(value.clone())))
                }
                // Earliest, safe and finalized are potentially resolvable to a safe block number.
                BlockTag::Earliest => Ok(CacheableBlockSpec::Earliest),
                BlockTag::Safe => Ok(CacheableBlockSpec::Safe),
                BlockTag::Finalized => Ok(CacheableBlockSpec::Finalized),
            },
            BlockSpec::Eip1898(spec) => match spec {
                Eip1898BlockSpec::Hash {
                    block_hash,
                    require_canonical,
                } => Ok(CacheableBlockSpec::Hash {
                    block_hash,
                    require_canonical: *require_canonical,
                }),
                Eip1898BlockSpec::Number { block_number } => Ok(CacheableBlockSpec::Number {
                    block_number: *block_number,
                }),
            },
        }
    }
}

impl<'a> TryFrom<&'a Option<BlockSpec>> for CacheableBlockSpec<'a> {
    type Error = BlockSpecNotCacheableError;

    fn try_from(value: &'a Option<BlockSpec>) -> Result<Self, Self::Error> {
        match value {
            None => Err(BlockSpecNotCacheableError(None)),
            Some(block_spec) => CacheableBlockSpec::try_from(block_spec),
        }
    }
}

/// Error type for [`CacheableBlockSpec::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Block spec is not cacheable: {0:?}")]
struct PreEip1898BlockSpecNotCacheableError(PreEip1898BlockSpec);

impl<'a> TryFrom<&'a PreEip1898BlockSpec> for CacheableBlockSpec<'a> {
    type Error = PreEip1898BlockSpecNotCacheableError;

    fn try_from(value: &'a PreEip1898BlockSpec) -> Result<Self, Self::Error> {
        match value {
            PreEip1898BlockSpec::Number(block_number) => Ok(CacheableBlockSpec::Number {
                block_number: *block_number,
            }),
            PreEip1898BlockSpec::Tag(tag) => match tag {
                // Latest and pending can never be resolved to a safe block number.
                BlockTag::Latest | BlockTag::Pending => {
                    Err(PreEip1898BlockSpecNotCacheableError(value.clone()))
                }
                // Earliest, safe and finalized are potentially resolvable to a safe block number.
                BlockTag::Earliest => Ok(CacheableBlockSpec::Earliest),
                BlockTag::Safe => Ok(CacheableBlockSpec::Safe),
                BlockTag::Finalized => Ok(CacheableBlockSpec::Finalized),
            },
        }
    }
}

/// A cacheable input for the `eth_getLogs` method.
#[derive(Clone, Debug)]
struct CacheableGetLogsInput<'a> {
    /// The from block argument
    from_block: CacheableBlockSpec<'a>,
    /// The to block argument
    to_block: CacheableBlockSpec<'a>,
    /// The address
    address: Vec<&'a Address>,
    /// The topics
    topics: Vec<Option<Vec<&'a B256>>>,
}

/// Error type for [`CacheableBlockSpec::try_from`].
#[derive(thiserror::Error, Debug)]
#[error("Method is not cacheable: {0:?}")]
struct GetLogsInputNotCacheableError(GetLogsInput);

impl<'a> TryFrom<&'a GetLogsInput> for CacheableGetLogsInput<'a> {
    type Error = GetLogsInputNotCacheableError;

    fn try_from(value: &'a GetLogsInput) -> Result<Self, Self::Error> {
        let map_err = |_| GetLogsInputNotCacheableError(value.clone());
        Ok(Self {
            from_block: (&value.from_block).try_into().map_err(map_err)?,
            to_block: (&value.to_block).try_into().map_err(map_err)?,
            address: value
                .address
                .as_ref()
                .map_or(Vec::new(), |address| match address {
                    OneOrMore::One(address) => vec![address],
                    OneOrMore::Many(addresses) => addresses.iter().collect(),
                }),
            topics: value.topics.as_ref().map_or(Vec::new(), |topics| {
                topics
                    .iter()
                    .map(|options| {
                        options.as_ref().map(|options| match options {
                            OneOrMore::One(topic) => vec![topic],
                            OneOrMore::Many(topics) => topics.iter().collect(),
                        })
                    })
                    .collect()
            }),
        })
    }
}

#[derive(Debug, Clone)]
pub(super) enum WriteCacheKey {
    /// It needs to be checked whether the block number is safe (reorg-free)
    /// before writing to the cache.
    NeedsSafetyCheck(CacheKeyForUncheckedBlockNumber),
    /// The method invocation contains a symbolic block spec (e.g. "finalized")
    /// that needs to be resolved to a block number before the result can be
    /// cached.
    NeedsBlockNumber(CacheKeyForSymbolicBlockTag),
    /// The cache key is fully resolved and can be used to write to the cache.
    Resolved(String),
}

impl WriteCacheKey {
    fn finalize(hasher: Hasher) -> Self {
        Self::Resolved(hasher.finalize())
    }

    fn needs_safety_check(hasher: Hasher, block_spec: CacheableBlockSpec<'_>) -> Option<Self> {
        match block_spec {
            CacheableBlockSpec::Number { block_number } => {
                Some(Self::NeedsSafetyCheck(CacheKeyForUncheckedBlockNumber {
                    hasher: Box::new(hasher),
                    block_number,
                }))
            }
            CacheableBlockSpec::Hash { .. } => Some(Self::finalize(hasher)),
            CacheableBlockSpec::Earliest
            | CacheableBlockSpec::Safe
            | CacheableBlockSpec::Finalized => None,
        }
    }

    fn needs_block_number(method: CacheableRequestMethod<'_>) -> Option<Self> {
        Some(Self::NeedsBlockNumber(CacheKeyForSymbolicBlockTag {
            method: MethodWithResolvableSymbolicBlockSpec::new(method)?,
        }))
    }
}

#[derive(Debug, Clone)]
pub(super) struct CacheKeyForUncheckedBlockNumber {
    // Boxed to keep the size of the enum small.
    hasher: Box<Hasher>,
    pub(super) block_number: u64,
}

impl CacheKeyForUncheckedBlockNumber {
    /// Check whether the block number is safe to cache before returning a cache
    /// key.
    pub fn validate_block_number(self, chain_id: u64, latest_block_number: u64) -> Option<String> {
        let is_safe = is_safe_block_number(IsSafeBlockNumberArgs {
            chain_id,
            latest_block_number,
            block_number: self.block_number,
        });
        if is_safe {
            Some(self.hasher.finalize())
        } else {
            None
        }
    }
}

#[derive(Debug, Clone)]
pub(super) enum ResolvedSymbolicTag {
    /// It needs to be checked whether the block number is safe (reorg-free)
    /// before writing to the cache.
    NeedsSafetyCheck(CacheKeyForUncheckedBlockNumber),
    /// The cache key is fully resolved and can be used to write to the cache.
    Resolved(String),
}

#[derive(Debug, Clone)]
pub(super) struct CacheKeyForSymbolicBlockTag {
    method: MethodWithResolvableSymbolicBlockSpec,
}

impl CacheKeyForSymbolicBlockTag {
    /// Check whether the block number is safe to cache before returning a cache
    /// key.
    pub(super) fn resolve_symbolic_tag(self, block_number: u64) -> Option<ResolvedSymbolicTag> {
        let resolved_block_spec = CacheableBlockSpec::Number { block_number };

        let resolved_method = match self.method {
            MethodWithResolvableSymbolicBlockSpec::GetBlockByNumber {
                include_tx_data, ..
            } => CacheableRequestMethod::GetBlockByNumber {
                block_spec: resolved_block_spec,
                include_tx_data,
            },
        };

        resolved_method.write_cache_key().map(|key| match key {
            WriteCacheKey::NeedsSafetyCheck(cache_key) => {
                ResolvedSymbolicTag::NeedsSafetyCheck(cache_key)
            }
            WriteCacheKey::Resolved(cache_key) => ResolvedSymbolicTag::Resolved(cache_key),
            WriteCacheKey::NeedsBlockNumber(_) => {
                unreachable!("resolved block spec should not need block number")
            }
        })
    }
}

/// Method invocations where, if the block spec argument is symbolic, it can be
/// resolved to a block number from the response.
#[derive(Debug, Clone)]
pub(super) enum MethodWithResolvableSymbolicBlockSpec {
    GetBlockByNumber { include_tx_data: bool },
}

impl<'a> MethodWithResolvableSymbolicBlockSpec {
    fn new(method: CacheableRequestMethod<'a>) -> Option<Self> {
        match method {
            CacheableRequestMethod::GetBlockByNumber {
                include_tx_data,
                block_spec: _,
            } => Some(Self::GetBlockByNumber { include_tx_data }),
            _ => None,
        }
    }
}

/// A cache key that can be used to read from the cache.
/// It's based on not-fully resolved data, so it's not safe to write to this
/// cache key. Specifically, it's not checked whether the block number is safe
/// to cache (safe from reorgs). This is ok for reading from the cache, since
/// the result will be a cache miss if the block number is not safe to cache and
/// not having to resolve this data for reading offers performance advantages.
#[derive(Debug, Clone, PartialEq, Eq)]
#[repr(transparent)]
pub(super) struct ReadCacheKey(String);

impl AsRef<str> for ReadCacheKey {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone)]
struct Hasher {
    hasher: Sha3_256,
}

// The methods take `mut self` instead of `&mut self` to make sure no hash is
// constructed if one of the method arguments are invalid (in which case the
// method returns None and consumes self).
//
// Before variants of an enum are hashed, a variant marker is hashed before
// hashing the values of the variants to distinguish between them. E.g. the hash
// of `Enum::Foo(1u8)` should not equal the hash of `Enum::Bar(1u8)`, since
// these are not logically equivalent. This matches the behavior of the `Hash`
// derivation of the Rust standard library for enums.
//
// Instead of ignoring `None` values, the same pattern is followed for Options
// in order to let us distinguish between `[None, Some("a")]` and `[Some("a")]`.
// Note that if we use the cache key variant `0u8` for `None`, it's ok if `None`
// and `0u8`, hash to the same values since a type where `Option` and `u8` are
// valid values must be wrapped in an enum in Rust and the enum cache key
// variant prefix will distinguish between them. This wouldn't be the case with
// JSON though.
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
        self.hash_bytes(address)
    }

    fn hash_u64(self, value: u64) -> Self {
        self.hash_bytes(value.to_le_bytes())
    }

    fn hash_u256(self, value: &U256) -> Self {
        self.hash_bytes(value.as_le_bytes())
    }

    fn hash_b256(self, value: &B256) -> Self {
        self.hash_bytes(value)
    }

    fn hash_block_spec(
        self,
        block_spec: &CacheableBlockSpec<'_>,
    ) -> Result<Self, SymbolicBlogTagError> {
        let this = self.hash_u8(block_spec.cache_key_variant());

        match block_spec {
            CacheableBlockSpec::Number { block_number } => Ok(this.hash_u64(*block_number)),
            CacheableBlockSpec::Hash {
                block_hash,
                require_canonical,
            } => {
                let this = this
                    .hash_b256(block_hash)
                    .hash_u8(require_canonical.cache_key_variant());
                match require_canonical {
                    Some(require_canonical) => Ok(this.hash_bool(require_canonical)),
                    None => Ok(this),
                }
            }
            CacheableBlockSpec::Earliest
            | CacheableBlockSpec::Safe
            | CacheableBlockSpec::Finalized => Err(SymbolicBlogTagError),
        }
    }

    fn hash_get_logs_input(
        self,
        params: &CacheableGetLogsInput<'_>,
    ) -> Result<Self, SymbolicBlogTagError> {
        // Destructuring to make sure we get a compiler error here if the fields change.
        let CacheableGetLogsInput {
            from_block,
            to_block,
            address,
            topics,
        } = params;

        let mut this = self
            .hash_block_spec(from_block)?
            .hash_block_spec(to_block)?
            .hash_u64(address.len() as u64);

        for address in address {
            this = this.hash_address(address);
        }

        this = this.hash_u64(topics.len() as u64);
        for options in topics {
            this = this.hash_u8(options.cache_key_variant());
            if let Some(options) = options {
                this = this.hash_u64(options.len() as u64);
                for option in options {
                    this = this.hash_b256(option);
                }
            }
        }

        Ok(this)
    }

    // Allow to keep same structure as other RequestMethod and other methods.
    #[allow(clippy::match_same_arms)]
    fn hash_method(
        self,
        method: &CacheableRequestMethod<'_>,
    ) -> Result<Self, SymbolicBlogTagError> {
        let this = self.hash_u8(method.cache_key_variant());

        let this = match method {
            CacheableRequestMethod::ChainId => this,
            CacheableRequestMethod::GetBalance {
                address,
                block_spec,
            } => this.hash_address(address).hash_block_spec(block_spec)?,
            CacheableRequestMethod::GetBlockByNumber {
                block_spec,
                include_tx_data,
            } => this.hash_block_spec(block_spec)?.hash_bool(include_tx_data),
            CacheableRequestMethod::GetBlockByHash {
                block_hash,
                include_tx_data,
            } => this.hash_b256(block_hash).hash_bool(include_tx_data),
            CacheableRequestMethod::GetCode {
                address,
                block_spec,
            } => this.hash_address(address).hash_block_spec(block_spec)?,
            CacheableRequestMethod::GetLogs { params } => this.hash_get_logs_input(params)?,
            CacheableRequestMethod::GetStorageAt {
                address,
                position,
                block_spec,
            } => this
                .hash_address(address)
                .hash_u256(position)
                .hash_block_spec(block_spec)?,
            CacheableRequestMethod::GetTransactionByHash { transaction_hash } => {
                this.hash_b256(transaction_hash)
            }
            CacheableRequestMethod::GetTransactionCount {
                address,
                block_spec,
            } => this.hash_address(address).hash_block_spec(block_spec)?,
            CacheableRequestMethod::GetTransactionReceipt { transaction_hash } => {
                this.hash_b256(transaction_hash)
            }
            CacheableRequestMethod::NetVersion => this,
        };

        Ok(this)
    }

    fn finalize(self) -> String {
        hex::encode(self.hasher.finalize_fixed())
    }
}

#[derive(thiserror::Error, Debug)]
#[error("A symbolic block tag is not hashable.")]
struct SymbolicBlogTagError;

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

impl<'a> CacheKeyVariant for &'a CacheableRequestMethod<'a> {
    fn cache_key_variant(&self) -> u8 {
        match self {
            CacheableRequestMethod::ChainId => 0,
            CacheableRequestMethod::GetBalance { .. } => 1,
            CacheableRequestMethod::GetBlockByNumber { .. } => 2,
            CacheableRequestMethod::GetBlockByHash { .. } => 3,
            // These methods have been removed as they're not currently in use by the RPC client.
            // If they're added back, they should keep their old variant number.
            // CacheableRequestMethod::GetBlockTransactionCountByHash { .. } => 4,
            // CacheableRequestMethod::GetBlockTransactionCountByNumber { .. } => 5,
            CacheableRequestMethod::GetCode { .. } => 6,
            CacheableRequestMethod::GetLogs { .. } => 7,
            CacheableRequestMethod::GetStorageAt { .. } => 8,
            // CacheableRequestMethod::GetTransactionByBlockHashAndIndex { .. } => 9,
            // CacheableRequestMethod::GetTransactionByBlockNumberAndIndex { .. } => 10,
            CacheableRequestMethod::GetTransactionByHash { .. } => 11,
            CacheableRequestMethod::GetTransactionCount { .. } => 12,
            CacheableRequestMethod::GetTransactionReceipt { .. } => 13,
            CacheableRequestMethod::NetVersion => 14,
        }
    }
}

impl<'a> CacheKeyVariant for CacheableBlockSpec<'a> {
    fn cache_key_variant(&self) -> u8 {
        match self {
            CacheableBlockSpec::Number { .. } => 0,
            CacheableBlockSpec::Hash { .. } => 1,
            CacheableBlockSpec::Earliest => 2,
            CacheableBlockSpec::Safe => 3,
            CacheableBlockSpec::Finalized => 4,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_hash_length() {
        let hash = Hasher::new().hash_u8(0).finalize();
        // 32 bytes as hex
        assert_eq!(hash.len(), 2 * 32);
    }

    #[test]
    fn test_hasher_block_spec_hash_and_number_not_equal() {
        let block_number = u64::default();
        let block_hash = B256::default();

        let hash_one = Hasher::new()
            .hash_block_spec(&CacheableBlockSpec::Hash {
                block_hash: &block_hash,
                require_canonical: None,
            })
            .unwrap()
            .finalize();
        let hash_two = Hasher::new()
            .hash_block_spec(&CacheableBlockSpec::Number { block_number })
            .unwrap()
            .finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_get_logs_input_from_to_matters() {
        let from = CacheableBlockSpec::Number { block_number: 1 };
        let to = CacheableBlockSpec::Number { block_number: 2 };
        let address = Address::default();

        let hash_one = Hasher::new()
            .hash_get_logs_input(&CacheableGetLogsInput {
                from_block: from.clone(),
                to_block: to.clone(),
                address: vec![&address],
                topics: Vec::new(),
            })
            .unwrap()
            .finalize();

        let hash_two = Hasher::new()
            .hash_get_logs_input(&CacheableGetLogsInput {
                from_block: to,
                to_block: from,
                address: vec![&address],
                topics: Vec::new(),
            })
            .unwrap()
            .finalize();

        assert_ne!(hash_one, hash_two);
    }

    #[test]
    fn test_no_arguments_keys_not_equal() {
        let key_one = CacheableRequestMethod::ChainId.read_cache_key().unwrap();
        let key_two = CacheableRequestMethod::NetVersion.read_cache_key().unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_same_arguments_keys_not_equal() {
        let value = B256::default();
        let key_one = CacheableRequestMethod::GetTransactionByHash {
            transaction_hash: &value,
        }
        .read_cache_key()
        .unwrap();
        let key_two = CacheableRequestMethod::GetTransactionReceipt {
            transaction_hash: &value,
        }
        .read_cache_key()
        .unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_get_storage_at_block_spec_is_taken_into_account() {
        let address = Address::default();
        let position = U256::default();

        let key_one = CacheableRequestMethod::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: CacheableBlockSpec::Hash {
                block_hash: &B256::default(),
                require_canonical: None,
            },
        }
        .read_cache_key()
        .unwrap();

        let key_two = CacheableRequestMethod::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: CacheableBlockSpec::Number {
                block_number: u64::default(),
            },
        }
        .read_cache_key()
        .unwrap();

        assert_ne!(key_one, key_two);
    }

    #[test]
    fn test_get_storage_at_block_same_matches() {
        let address = Address::default();
        let position = U256::default();
        let block_number = u64::default();
        let block_spec = CacheableBlockSpec::Number { block_number };

        let key_one = CacheableRequestMethod::GetStorageAt {
            address: &address,
            position: &position,
            block_spec: block_spec.clone(),
        }
        .read_cache_key()
        .unwrap();

        let key_two = CacheableRequestMethod::GetStorageAt {
            address: &address,
            position: &position,
            block_spec,
        }
        .read_cache_key()
        .unwrap();

        assert_eq!(key_one, key_two);
    }
}
