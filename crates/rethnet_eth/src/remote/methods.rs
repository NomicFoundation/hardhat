use crate::{
    remote::{
        eth::eip712,
        filter::{FilterOptions, SubscriptionType},
        BlockSpec,
    },
    serde::{
        optional_single_to_sequence, sequence_to_optional_single, sequence_to_single,
        single_to_sequence, ZeroXPrefixedBytes,
    },
    Address, B256, U256,
};
use std::hash::{Hash, Hasher};

/// for specifying input to methods requiring a transaction object, like `eth_call`,
/// `eth_sendTransaction` and `eth_estimateGas`
#[derive(Clone, Debug, PartialEq, Eq, Hash, serde::Deserialize, serde::Serialize)]
pub struct TransactionInput {
    /// the address from which the transaction should be sent
    pub from: Option<Address>,
    /// the address to which the transaction should be sent
    pub to: Option<Address>,
    /// gas
    pub gas: Option<U256>,
    /// gas price
    #[serde(rename = "gasPrice")]
    pub gas_price: Option<U256>,
    /// transaction value
    pub value: Option<U256>,
    /// transaction data
    pub data: Option<ZeroXPrefixedBytes>,
}

mod optional_block_spec_resolved {
    use super::BlockSpec;

    pub fn latest() -> Option<BlockSpec> {
        Some(BlockSpec::latest())
    }

    pub fn pending() -> Option<BlockSpec> {
        Some(BlockSpec::pending())
    }
}

/// For an invoking a method on a remote ethereum node
#[derive(Clone, Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum MethodInvocation {
    /// A potentially cacheable method invocation
    Cacheable(CacheableMethodInvocation),
    /// A non-cacheable method invocation
    NonCacheable(NonCacheableMethodInvocation),
}

impl From<CacheableMethodInvocation> for MethodInvocation {
    fn from(value: CacheableMethodInvocation) -> Self {
        Self::Cacheable(value)
    }
}

impl From<NonCacheableMethodInvocation> for MethodInvocation {
    fn from(value: NonCacheableMethodInvocation) -> Self {
        Self::NonCacheable(value)
    }
}

/// These method invocations are hashable and can be potentially cached.
#[derive(Clone, Debug, PartialEq, Eq, Hash, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
pub enum CacheableMethodInvocation {
    /// eth_call
    #[serde(rename = "eth_call")]
    Call(
        TransactionInput,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_chainId
    #[serde(rename = "eth_chainId")]
    ChainId(),
    /// eth_estimateGas
    #[serde(rename = "eth_estimateGas")]
    EstimateGas(
        TransactionInput,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::pending"
        )]
        Option<BlockSpec>,
    ),
    /// eth_feeHistory
    #[serde(rename = "eth_feeHistory")]
    FeeHistory(
        /// block count
        U256,
        /// newest block
        BlockSpec,
        /// reward percentiles
        Percentiles,
    ),
    /// eth_getBalance
    #[serde(rename = "eth_getBalance")]
    GetBalance(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getBlockByNumber
    #[serde(rename = "eth_getBlockByNumber")]
    GetBlockByNumber(
        BlockSpec,
        /// include transaction data
        bool,
    ),
    /// eth_getBlockByHash
    #[serde(rename = "eth_getBlockByHash")]
    GetBlockByHash(
        /// hash
        B256,
        /// include transaction data
        bool,
    ),
    /// eth_getBlockTransactionCountByHash
    #[serde(
        rename = "eth_getBlockTransactionCountByHash",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetBlockTransactionCountByHash(B256),
    /// eth_getBlockTransactionCountByNumber
    #[serde(
        rename = "eth_getBlockTransactionCountByNumber",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetBlockTransactionCountByNumber(BlockSpec),
    /// eth_getCode
    #[serde(rename = "eth_getCode")]
    GetCode(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getFilterLogs
    #[serde(
        rename = "eth_getFilterLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetFilterLogs(U256),
    /// eth_getLogs
    #[serde(
        rename = "eth_getLogs",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetLogs(GetLogsInput),
    /// eth_getStorageAt
    #[serde(rename = "eth_getStorageAt")]
    GetStorageAt(
        Address,
        /// position
        U256,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionByBlockHashAndIndex
    #[serde(rename = "eth_getTransactionByBlockHashAndIndex")]
    GetTransactionByBlockHashAndIndex(B256, U256),
    /// eth_getTransactionByBlockNumberAndIndex
    #[serde(rename = "eth_getTransactionByBlockNumberAndIndex")]
    GetTransactionByBlockNumberAndIndex(U256, U256),
    /// eth_getTransactionByHash
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionByHash(B256),
    /// eth_getTransactionCount
    #[serde(rename = "eth_getTransactionCount")]
    GetTransactionCount(
        Address,
        #[serde(
            skip_serializing_if = "Option::is_none",
            default = "optional_block_spec_resolved::latest"
        )]
        Option<BlockSpec>,
    ),
    /// eth_getTransactionReceipt
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetTransactionReceipt(B256),
    /// net_version
    #[serde(rename = "net_version")]
    NetVersion(),
}

/// These method invocations cannot be stored in a cache are not required to be hashable.
#[derive(Clone, Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(tag = "method", content = "params")]
pub enum NonCacheableMethodInvocation {
    /// eth_accounts
    #[serde(rename = "eth_accounts")]
    Accounts(),
    /// eth_block_number
    #[serde(rename = "eth_blockNumber")]
    BlockNumber(),
    /// eth_coinbase
    #[serde(rename = "eth_coinbase")]
    Coinbase(),
    /// eth_gasPrice
    #[serde(rename = "eth_gasPrice")]
    GasPrice(),
    /// eth_getFilterChanges
    #[serde(
        rename = "eth_getFilterChanges",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    GetFilterChanges(U256),
    /// eth_mining
    #[serde(rename = "eth_mining")]
    Mining(),
    /// net_listening
    #[serde(rename = "net_listening")]
    NetListening(),
    /// net_peerCount
    #[serde(rename = "net_peerCount")]
    NetPeerCount(),
    /// eth_newBlockFilter
    #[serde(rename = "eth_newBlockFilter")]
    NewBlockFilter(),
    /// eth_newFilter
    #[serde(
        rename = "eth_newFilter",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    NewFilter(FilterOptions),
    /// eth_newPendingTransactionFilter
    #[serde(rename = "eth_newPendingTransactionFilter")]
    NewPendingTransactionFilter(),
    /// eth_pendingTransactions
    #[serde(rename = "eth_pendingTransactions")]
    PendingTransactions(),
    /// eth_sendRawTransaction
    #[serde(
        rename = "eth_sendRawTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SendRawTransaction(ZeroXPrefixedBytes),
    /// eth_sendTransaction
    #[serde(
        rename = "eth_sendTransaction",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    SendTransaction(TransactionInput),
    /// eth_sign
    #[serde(rename = "eth_sign", alias = "personal_sign")]
    Sign(Address, ZeroXPrefixedBytes),
    /// eth_signTypedData_v4
    #[serde(rename = "eth_signTypedData_v4")]
    SignTypedDataV4(Address, eip712::Message),
    /// eth_subscribe
    #[serde(
        rename = "eth_subscribe",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Subscribe(Vec<SubscriptionType>),
    /// eth_syncing
    #[serde(rename = "eth_syncing")]
    Syncing(),
    /// eth_uninstallFilter
    #[serde(
        rename = "eth_uninstallFilter",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    UninstallFilter(U256),
    /// eth_unsubscribe
    #[serde(
        rename = "eth_unsubscribe",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Unsubscribe(U256),
    /// web3_clientVersion
    #[serde(rename = "web3_clientVersion")]
    Web3ClientVersion(),
    /// web3_sha3
    #[serde(
        rename = "web3_sha3",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    Web3Sha3(ZeroXPrefixedBytes),
    /// evm_increaseTime
    #[serde(
        rename = "evm_increaseTime",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmIncreaseTime(U256OrUsize),
    /// evm_mine
    #[serde(
        rename = "evm_mine",
        serialize_with = "optional_single_to_sequence",
        deserialize_with = "sequence_to_optional_single"
    )]
    EvmMine(Option<U256OrUsize>),
    /// evm_setAutomine
    #[serde(
        rename = "evm_setAutomine",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmSetAutomine(bool),
    /// evm_setNextBlockTimestamp
    #[serde(
        rename = "evm_setNextBlockTimestamp",
        serialize_with = "single_to_sequence",
        deserialize_with = "sequence_to_single"
    )]
    EvmSetNextBlockTimestamp(U256OrUsize),
    /// evm_snapshot
    #[serde(rename = "evm_snapshot")]
    EvmSnapshot(),
}

/// an input that can be either a U256 or a usize
#[derive(Clone, Debug, PartialEq, Eq, Hash, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum U256OrUsize {
    /// usize
    Usize(usize),
    /// U256
    U256(U256),
}

impl From<U256OrUsize> for U256 {
    fn from(either: U256OrUsize) -> Self {
        match either {
            U256OrUsize::U256(u) => u,
            U256OrUsize::Usize(u) => Self::from(u),
        }
    }
}

/// for specifying the inputs to `eth_getLogs`
#[derive(Clone, Debug, PartialEq, Eq, Hash, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLogsInput {
    /// starting block for get_logs request
    pub from_block: BlockSpec,
    /// ending block for get_logs request
    pub to_block: BlockSpec,
    /// address for get_logs request
    pub address: Address,
}

/// Invalid percentile value error
#[derive(thiserror::Error, Debug)]
pub enum PercentileError {
    /// Out of bounds value error
    #[error("Percentile must be between 0 and 100 inclusive, instead it is {0}")]
    OutOfBounds(f64),
    /// Non-finite value error
    #[error("Percentile must be a finite value, instead it is {0}")]
    NonFiniteValue(f64),
}

/// The `rewardPercentiles` argument for `eth_feeHistory`.
#[derive(Clone, Debug, PartialEq, Eq, Hash, serde::Deserialize, serde::Serialize)]
#[repr(transparent)]
#[serde(transparent)]
pub struct Percentiles(Vec<Percentile>);

impl TryFrom<Vec<f64>> for Percentiles {
    type Error = PercentileError;

    fn try_from(value: Vec<f64>) -> Result<Self, Self::Error> {
        let percentiles = value
            .into_iter()
            .map(Percentile::try_from)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self(percentiles))
    }
}

/// A reward percentile value for `eth_feeHistory`. It's a floating point value in the range [0,
/// 100] as per the Ethereum docs: https://ethereum.github.io/execution-apis/api-documentation/
#[derive(Clone, Copy, Debug, serde::Deserialize, serde::Serialize)]
#[repr(transparent)]
#[serde(transparent)]
pub struct Percentile(f64);

impl Percentile {
    /// Treat the percentile as a u64 for equality and hashing purposes.
    /// This is safe since we check on construction that it's a finite value in the [0, 100] range
    /// and we don't perform any arithmetic on it which could lead to surprising results.
    fn key(&self) -> u64 {
        self.0.to_bits()
    }
}

impl TryFrom<f64> for Percentile {
    type Error = PercentileError;

    fn try_from(value: f64) -> Result<Self, Self::Error> {
        if !value.is_finite() {
            Err(PercentileError::NonFiniteValue(value))
        } else if !(0. ..=100.).contains(&value) {
            Err(PercentileError::OutOfBounds(value))
        } else {
            Ok(Self(value))
        }
    }
}

impl PartialEq for Percentile {
    fn eq(&self, other: &Self) -> bool {
        self.key() == other.key()
    }
}

impl Eq for Percentile {}

impl Hash for Percentile {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.key().hash(state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::hash_map::DefaultHasher;

    #[test]
    #[should_panic(expected = "string \\\"deadbeef\\\" does not have a '0x' prefix")]
    fn test_zero_x_prefixed_bytes_deserialization_without_0x_prefix() {
        serde_json::from_str::<ZeroXPrefixedBytes>("\"deadbeef\"").unwrap();
    }

    #[test]
    #[should_panic(expected = "string \\\"0deadbeef\\\" does not have a '0x' prefix")]
    fn test_zero_x_prefixed_bytes_deserialization_with_0_prefix_but_no_x() {
        serde_json::from_str::<ZeroXPrefixedBytes>("\"0deadbeef\"").unwrap();
    }

    #[test]
    fn test_infinite_percentile() {
        assert!(Percentile::try_from(f64::INFINITY).is_err());
    }

    #[test]
    fn test_nan_percentile() {
        assert!(Percentile::try_from(f64::INFINITY).is_err());
    }

    #[test]
    fn test_negative_percentile() {
        assert!(Percentile::try_from(-1.).is_err());
    }

    #[test]
    fn test_too_large_percentile() {
        assert!(Percentile::try_from(1000.).is_err());
    }

    #[test]
    fn test_zero_percentile() {
        assert!(Percentile::try_from(0.).is_ok());
    }

    #[test]
    fn test_hundred_percentile() {
        assert!(Percentile::try_from(100.).is_ok());
    }

    #[test]
    fn test_percentile_serialization() {
        let n = 12.34;
        let percentile = Percentile::try_from(n).unwrap();
        assert_eq!(
            serde_json::to_string(&percentile).unwrap(),
            serde_json::to_string(&n).unwrap()
        );
    }

    #[test]
    fn test_percentile_eq() {
        let n = 12.34;
        assert_eq!(
            Percentile::try_from(n).unwrap(),
            Percentile::try_from(n).unwrap()
        );
    }

    #[test]
    fn test_percentile_neq() {
        assert_ne!(
            Percentile::try_from(12.34).unwrap(),
            Percentile::try_from(12.345).unwrap()
        );
    }

    fn calculate_hash<T: Hash>(t: &T) -> u64 {
        let mut s = DefaultHasher::new();
        t.hash(&mut s);
        s.finish()
    }

    #[test]
    fn test_percentile_hash_eq() {
        let n = 12.34;
        assert_eq!(
            calculate_hash(&Percentile::try_from(n).unwrap()),
            calculate_hash(&Percentile::try_from(n).unwrap())
        );
    }

    #[test]
    fn test_percentile_hash_neq() {
        assert_ne!(
            calculate_hash(&Percentile::try_from(12.34).unwrap()),
            calculate_hash(&Percentile::try_from(12.345).unwrap())
        );
    }
}
