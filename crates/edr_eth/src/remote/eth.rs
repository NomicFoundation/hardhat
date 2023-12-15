#![cfg(feature = "serde")]

// Parts of this code were adapted from github.com/gakonst/ethers-rs and are
// distributed under its licenses:
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-MIT
// For the original context, see https://github.com/gakonst/ethers-rs/tree/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3

/// Input type for `eth_call` and `eth_estimateGas`
mod call_request;
/// Input types for EIP-712 message signing
pub mod eip712;
mod get_logs;

use std::{fmt::Debug, sync::OnceLock};

pub use call_request::CallRequest;
pub use get_logs::GetLogsInput;

use crate::{
    access_list::AccessListItem,
    signature::Signature,
    transaction::{
        EIP155SignedTransaction, Eip1559SignedTransaction, Eip2930SignedTransaction,
        Eip4844SignedTransaction, LegacySignedTransaction, SignedTransaction, TransactionKind,
    },
    withdrawal::Withdrawal,
    Address, Bloom, Bytes, B256, U256,
};

/// transaction
#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    /// hash of the transaction
    pub hash: B256,
    /// the number of transactions made by the sender prior to this one
    #[serde(with = "crate::serde::u64")]
    pub nonce: u64,
    /// hash of the block where this transaction was in
    pub block_hash: Option<B256>,
    /// block number where this transaction was in
    pub block_number: Option<U256>,
    /// integer of the transactions index position in the block. null when its
    /// pending
    #[serde(with = "crate::serde::optional_u64")]
    pub transaction_index: Option<u64>,
    /// address of the sender
    pub from: Address,
    /// address of the receiver. null when its a contract creation transaction.
    pub to: Option<Address>,
    /// value transferred in Wei
    pub value: U256,
    /// gas price provided by the sender in Wei
    pub gas_price: U256,
    /// gas provided by the sender
    pub gas: U256,
    /// the data sent along with the transaction
    #[serde(with = "crate::serde::bytes")]
    pub input: Bytes,
    /// ECDSA recovery id
    #[serde(with = "crate::serde::u64")]
    pub v: u64,
    /// Y-parity for EIP-2930 and EIP-1559 transactions. In theory these
    /// transactions types shouldn't have a `v` field, but in practice they
    /// are returned by nodes.
    #[serde(
        default,
        rename = "yParity",
        skip_serializing_if = "Option::is_none",
        with = "crate::serde::optional_u64"
    )]
    pub y_parity: Option<u64>,
    /// ECDSA signature r
    pub r: U256,
    /// ECDSA signature s
    pub s: U256,
    /// chain ID
    #[serde(default, with = "crate::serde::optional_u64")]
    pub chain_id: Option<u64>,
    /// integer of the transaction type, 0x0 for legacy transactions, 0x1 for
    /// access list types, 0x2 for dynamic fees
    #[serde(
        rename = "type",
        default,
        skip_serializing_if = "Option::is_none",
        with = "crate::serde::optional_u64"
    )]
    pub transaction_type: Option<u64>,
    /// access list
    #[serde(default)]
    pub access_list: Option<Vec<AccessListItem>>,
    /// max fee per gas
    #[serde(default)]
    pub max_fee_per_gas: Option<U256>,
    /// max priority fee per gas
    #[serde(default)]
    pub max_priority_fee_per_gas: Option<U256>,
    /// The maximum total fee per gas the sender is willing to pay for blob gas
    /// in wei (EIP-4844)
    #[serde(default)]
    pub max_fee_per_blob_gas: Option<U256>,
    /// List of versioned blob hashes associated with the transaction's EIP-4844
    /// data blobs.
    #[serde(default)]
    pub blob_versioned_hashes: Option<Vec<B256>>,
}

impl Transaction {
    /// Returns whether the transaction has odd Y parity.
    pub fn odd_y_parity(&self) -> bool {
        self.v == 1 || self.v == 28
    }

    /// Returns whether the transaction is a legacy transaction.
    pub fn is_legacy(&self) -> bool {
        self.transaction_type == Some(0) && (self.v == 27 || self.v == 28)
    }
}

/// Error that occurs when trying to convert the JSON-RPC `Transaction` type.
#[derive(Debug, thiserror::Error)]
pub enum TransactionConversionError {
    /// Missing access list
    #[error("Missing access list")]
    MissingAccessList,
    /// EIP-4844 transaction is missing blob (versioned) hashes
    #[error("Missing blob hashes")]
    MissingBlobHashes,
    /// Missing chain ID
    #[error("Missing chain ID")]
    MissingChainId,
    /// Missing max fee per gas
    #[error("Missing max fee per gas")]
    MissingMaxFeePerGas,
    /// Missing max priority fee per gas
    #[error("Missing max priority fee per gas")]
    MissingMaxPriorityFeePerGas,
    /// EIP-4844 transaction is missing the max fee per blob gas
    #[error("Missing max fee per blob gas")]
    MissingMaxFeePerBlobGas,
    /// EIP-4844 transaction is missing the receiver (to) address
    #[error("Missing receiver (to) address")]
    MissingReceiverAddress,
    /// The transaction type is not supported.
    #[error("Unsupported type {0}")]
    UnsupportedType(u64),
}

impl TryFrom<Transaction> for (SignedTransaction, Address) {
    type Error = TransactionConversionError;

    fn try_from(value: Transaction) -> Result<Self, Self::Error> {
        let kind = if let Some(to) = &value.to {
            TransactionKind::Call(*to)
        } else {
            TransactionKind::Create
        };

        let transaction = match value.transaction_type {
            Some(0) | None => {
                if value.is_legacy() {
                    SignedTransaction::PreEip155Legacy(LegacySignedTransaction {
                        nonce: value.nonce,
                        gas_price: value.gas_price,
                        gas_limit: value.gas.to(),
                        kind,
                        value: value.value,
                        input: value.input,
                        signature: Signature {
                            r: value.r,
                            s: value.s,
                            v: value.v,
                        },
                        hash: OnceLock::from(value.hash),
                    })
                } else {
                    SignedTransaction::PostEip155Legacy(EIP155SignedTransaction {
                        nonce: value.nonce,
                        gas_price: value.gas_price,
                        gas_limit: value.gas.to(),
                        kind,
                        value: value.value,
                        input: value.input,
                        signature: Signature {
                            r: value.r,
                            s: value.s,
                            v: value.v,
                        },
                        hash: OnceLock::from(value.hash),
                    })
                }
            }
            Some(1) => SignedTransaction::Eip2930(Eip2930SignedTransaction {
                odd_y_parity: value.odd_y_parity(),
                chain_id: value
                    .chain_id
                    .ok_or(TransactionConversionError::MissingChainId)?,
                nonce: value.nonce,
                gas_price: value.gas_price,
                gas_limit: value.gas.to(),
                kind,
                value: value.value,
                input: value.input,
                access_list: value
                    .access_list
                    .ok_or(TransactionConversionError::MissingAccessList)?
                    .into(),
                r: value.r,
                s: value.s,
                hash: OnceLock::from(value.hash),
            }),
            Some(2) => SignedTransaction::Eip1559(Eip1559SignedTransaction {
                odd_y_parity: value.odd_y_parity(),
                chain_id: value
                    .chain_id
                    .ok_or(TransactionConversionError::MissingChainId)?,
                nonce: value.nonce,
                max_priority_fee_per_gas: value
                    .max_priority_fee_per_gas
                    .ok_or(TransactionConversionError::MissingMaxPriorityFeePerGas)?,
                max_fee_per_gas: value
                    .max_fee_per_gas
                    .ok_or(TransactionConversionError::MissingMaxFeePerGas)?,
                gas_limit: value.gas.to(),
                kind,
                value: value.value,
                input: value.input,
                access_list: value
                    .access_list
                    .ok_or(TransactionConversionError::MissingAccessList)?
                    .into(),
                r: value.r,
                s: value.s,
                hash: OnceLock::from(value.hash),
            }),
            Some(3) => SignedTransaction::Eip4844(Eip4844SignedTransaction {
                odd_y_parity: value.odd_y_parity(),
                chain_id: value
                    .chain_id
                    .ok_or(TransactionConversionError::MissingChainId)?,
                nonce: value.nonce,
                max_priority_fee_per_gas: value
                    .max_priority_fee_per_gas
                    .ok_or(TransactionConversionError::MissingMaxPriorityFeePerGas)?,
                max_fee_per_gas: value
                    .max_fee_per_gas
                    .ok_or(TransactionConversionError::MissingMaxFeePerGas)?,
                max_fee_per_blob_gas: value
                    .max_fee_per_blob_gas
                    .ok_or(TransactionConversionError::MissingMaxFeePerBlobGas)?,
                gas_limit: value.gas.to(),
                to: value
                    .to
                    .ok_or(TransactionConversionError::MissingReceiverAddress)?,
                value: value.value,
                input: value.input,
                access_list: value
                    .access_list
                    .ok_or(TransactionConversionError::MissingAccessList)?
                    .into(),
                blob_hashes: value
                    .blob_versioned_hashes
                    .ok_or(TransactionConversionError::MissingBlobHashes)?,
                r: value.r,
                s: value.s,
                hash: OnceLock::from(value.hash),
            }),
            Some(r#type) => {
                return Err(TransactionConversionError::UnsupportedType(r#type));
            }
        };

        Ok((transaction, value.from))
    }
}

/// Error that occurs when trying to convert the JSON-RPC `TransactionReceipt`
/// type.
#[derive(Debug, thiserror::Error)]
pub enum ReceiptConversionError {
    /// The transaction type is not supported.
    #[error("Unsupported type {0}")]
    UnsupportedType(u64),
}

/// block object returned by `eth_getBlockBy*`
#[derive(Debug, Default, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Block<TX> {
    /// Hash of the block
    pub hash: Option<B256>,
    /// hash of the parent block.
    pub parent_hash: B256,
    /// SHA3 of the uncles data in the block
    pub sha3_uncles: B256,
    /// the root of the final state trie of the block
    pub state_root: B256,
    /// the root of the transaction trie of the block
    pub transactions_root: B256,
    /// the root of the receipts trie of the block
    pub receipts_root: B256,
    /// the block number. None when its pending block.
    #[serde(with = "crate::serde::optional_u64")]
    pub number: Option<u64>,
    /// the total used gas by all transactions in this block
    #[serde(with = "crate::serde::u64")]
    pub gas_used: u64,
    /// the maximum gas allowed in this block
    #[serde(with = "crate::serde::u64")]
    pub gas_limit: u64,
    /// the "extra data" field of this block
    #[serde(with = "crate::serde::bytes")]
    pub extra_data: Bytes,
    /// the bloom filter for the logs of the block
    pub logs_bloom: Bloom,
    /// the unix timestamp for when the block was collated
    #[serde(with = "crate::serde::u64")]
    pub timestamp: u64,
    /// integer of the difficulty for this blocket
    pub difficulty: U256,
    /// integer of the total difficulty of the chain until this block
    pub total_difficulty: Option<U256>,
    /// Array of uncle hashes
    #[serde(default)]
    pub uncles: Vec<B256>,
    /// Array of transaction objects, or 32 Bytes transaction hashes depending
    /// on the last given parameter
    #[serde(default)]
    pub transactions: Vec<TX>,
    /// the length of the RLP encoding of this block in bytes
    #[serde(with = "crate::serde::u64")]
    pub size: u64,
    /// mix hash
    pub mix_hash: B256,
    /// hash of the generated proof-of-work. null when its pending block.
    #[serde(with = "crate::serde::optional_u64")]
    pub nonce: Option<u64>,
    /// base fee per gas
    pub base_fee_per_gas: Option<U256>,
    /// the address of the beneficiary to whom the mining rewards were given
    pub miner: Option<Address>,
    /// withdrawals
    pub withdrawals: Option<Vec<Withdrawal>>,
    /// withdrawals root
    pub withdrawals_root: Option<B256>,
    /// The total amount of gas used by the transactions.
    #[serde(default, with = "crate::serde::optional_u64")]
    pub blob_gas_used: Option<u64>,
    /// A running total of blob gas consumed in excess of the target, prior to
    /// the block.
    #[serde(default, with = "crate::serde::optional_u64")]
    pub excess_blob_gas: Option<u64>,
    /// Root of the parent beacon block
    pub parent_beacon_block_root: Option<B256>,
}
