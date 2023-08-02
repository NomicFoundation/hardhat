#![cfg(feature = "serde")]

// Parts of this code were adapted from github.com/gakonst/ethers-rs and are distributed under its
// licenses:
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3/LICENSE-MIT
// For the original context, see https://github.com/gakonst/ethers-rs/tree/7e6c3ba98363bdf6131e8284f186cc2c70ff48c3

/// input types for EIP-712 message signing
pub mod eip712;

use std::{fmt::Debug, ops::Deref};

use revm_primitives::ruint::aliases::B64;

use crate::{
    access_list::AccessListItem,
    block::BlockAndCallers,
    receipt::{EIP658Receipt, TypedReceipt},
    signature::Signature,
    transaction::{
        EIP1559SignedTransaction, EIP2930SignedTransaction, LegacySignedTransaction,
        SignedTransaction, TransactionKind,
    },
    Address, Bloom, Bytes, B256, U256,
};

use super::{serde_with_helpers::optional_u64_from_hex, withdrawal::Withdrawal};

/// transaction
#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    /// hash of the transaction
    pub hash: B256,
    /// the number of transactions made by the sender prior to this one
    #[serde(deserialize_with = "u64_from_hex")]
    pub nonce: u64,
    /// hash of the block where this transaction was in
    pub block_hash: Option<B256>,
    /// block number where this transaction was in
    pub block_number: Option<U256>,
    /// integer of the transactions index position in the block. null when its pending
    #[serde(deserialize_with = "optional_u64_from_hex")]
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
    pub input: Bytes,
    /// ECDSA recovery id
    #[serde(deserialize_with = "u64_from_hex")]
    pub v: u64,
    /// ECDSA signature r
    pub r: U256,
    /// ECDSA signature s
    pub s: U256,
    /// chain ID
    #[serde(default, deserialize_with = "optional_u64_from_hex")]
    pub chain_id: Option<u64>,
    /// integer of the transaction type, 0x0 for legacy transactions, 0x1 for access list types, 0x2 for dynamic fees
    #[serde(rename = "type", default, deserialize_with = "u64_from_hex")]
    pub transaction_type: u64,
    /// access list
    #[serde(default)]
    pub access_list: Option<Vec<AccessListItem>>,
    /// max fee per gas
    #[serde(default)]
    pub max_fee_per_gas: Option<U256>,
    /// max priority fee per gas
    #[serde(default)]
    pub max_priority_fee_per_gas: Option<U256>,
}

fn u64_from_hex<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: &str = serde::Deserialize::deserialize(deserializer)?;
    Ok(u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"))
}

/// log object used in `TransactionReceipt`
#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct Log {
    #[serde(flatten)]
    inner: crate::log::Log,
    /// block hash
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_hash: Option<B256>,
    /// block number
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_number: Option<U256>,
    /// transaction hash
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<B256>,
    /// transaction index
    #[serde(
        skip_serializing_if = "Option::is_none",
        deserialize_with = "optional_u64_from_hex"
    )]
    pub transaction_index: Option<u64>,
    /// log index
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_index: Option<U256>,
    /// transaction log index
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_log_index: Option<U256>,
    /// log type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_type: Option<String>,
    /// removed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed: Option<bool>,
}

impl Deref for Log {
    type Target = crate::log::Log;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

/// object returned by `eth_getTransactionReceipt`
#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct TransactionReceipt {
    /// hash of the block where this transaction was in
    pub block_hash: Option<B256>,
    /// block number where this transaction was in
    pub block_number: Option<U256>,
    /// The contract address created, if the transaction was a contract creation, otherwise null.
    pub contract_address: Option<Address>,
    /// The total amount of gas used when this transaction was executed in the block.
    pub cumulative_gas_used: U256,
    /// The sum of the base fee and tip paid per unit of gas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_gas_price: Option<U256>,
    /// address of the sender
    pub from: Address,
    /// The amount of gas used by this specific transaction alone.
    pub gas_used: Option<U256>,
    /// Array of log objects, which this transaction generated.
    pub logs: Vec<Log>,
    /// Bloom filter for light clients to quickly retrieve related logs.
    pub logs_bloom: Bloom,
    /// 32 bytes of post-transaction stateroot (pre Byzantium)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub root: Option<B256>,
    /// either 1 (success) or 0 (failure)
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub status: Option<u64>,
    /// address of the receiver. null when its a contract creation transaction.
    pub to: Option<Address>,
    /// hash of the transaction
    pub transaction_hash: B256,
    /// integer of the transactions index position in the block
    #[serde(deserialize_with = "u64_from_hex")]
    pub transaction_index: u64,
    /// integer of the transaction type, 0x0 for legacy transactions, 0x1 for access list types, 0x2 for dynamic fees.
    #[serde(rename = "type", default, deserialize_with = "u64_from_hex")]
    pub transaction_type: u64,
}

/// Error that occurs when trying to convert the JSON-RPC [`TransactionReceipt`] type.
#[derive(Debug, thiserror::Error)]
pub enum ReceiptConversionError {
    /// The transaction type is not supported.
    #[error("Unsupported type {0}")]
    UnsupportedType(u64),
}

impl TryFrom<TransactionReceipt> for TypedReceipt {
    type Error = ReceiptConversionError;

    fn try_from(value: TransactionReceipt) -> Result<Self, Self::Error> {
        let receipt = EIP658Receipt {
            // Not supported for pre-Byzantium hardforks
            status_code: value
                .status
                .unwrap_or(1)
                .try_into()
                .expect("Is either 1 or 0"),
            gas_used: value.cumulative_gas_used,
            logs_bloom: value.logs_bloom,
            logs: value.logs.into_iter().map(|log| log.inner).collect(),
        };

        match value.transaction_type {
            0 => Ok(TypedReceipt::Legacy(receipt)),
            1 => Ok(TypedReceipt::EIP2930(receipt)),
            2 => Ok(TypedReceipt::EIP1559(receipt)),
            r#type => Err(ReceiptConversionError::UnsupportedType(r#type)),
        }
    }
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
    pub number: Option<U256>,
    /// the total used gas by all transactions in this block
    pub gas_used: U256,
    /// the maximum gas allowed in this block
    pub gas_limit: U256,
    /// the "extra data" field of this block
    pub extra_data: Bytes,
    /// the bloom filter for the logs of the block. None when its pending block.
    pub logs_bloom: Bloom,
    /// the unix timestamp for when the block was collated
    pub timestamp: U256,
    /// integer of the difficulty for this block
    pub difficulty: U256,
    /// integer of the total difficulty of the chain until this block
    pub total_difficulty: Option<U256>,
    /// Array of uncle hashes
    #[serde(default)]
    pub uncles: Vec<B256>,
    /// Array of transaction objects, or 32 Bytes transaction hashes depending on the last given parameter
    #[serde(default)]
    pub transactions: Vec<TX>,
    /// integer the size of this block in bytes
    pub size: U256,
    /// mix hash
    pub mix_hash: B256,
    /// hash of the generated proof-of-work. null when its pending block.
    #[serde(deserialize_with = "optional_u64_from_hex")]
    pub nonce: Option<u64>,
    /// base fee per gas
    pub base_fee_per_gas: Option<U256>,
    /// the address of the beneficiary to whom the mining rewards were given
    pub miner: Option<Address>,
    #[serde(default)]
    /// withdrawals
    pub withdrawals: Vec<Withdrawal>,
    /// withdrawals root
    pub withdrawals_root: Option<B256>,
}

/// Error that occurs when trying to convert the JSON-RPC `Transaction` type.
#[derive(Debug, thiserror::Error)]
pub enum TransactionConversionError {
    /// Missing access list
    #[error("Missing access list")]
    MissingAccessList,
    /// Missing chain ID
    #[error("Missing chain ID")]
    MissingChainId,
    /// Missing max fee per gas
    #[error("Missing max fee per gas")]
    MissingMaxFeePerGas,
    /// Missing max priority fee per gas
    #[error("Missing max priority fee per gas")]
    MissingMaxPriorityFeePerGas,
    /// The transaction type is not supported.
    #[error("Unsupported type {0}")]
    UnsupportedType(u64),
}

impl TryFrom<Transaction> for (SignedTransaction, Address) {
    type Error = TransactionConversionError;

    fn try_from(value: Transaction) -> Result<Self, Self::Error> {
        let kind = if let Some(to) = value.to {
            TransactionKind::Call(to)
        } else {
            TransactionKind::Create
        };

        let transaction = match value.transaction_type {
            0 => SignedTransaction::Legacy(LegacySignedTransaction {
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
            }),
            1 => SignedTransaction::EIP2930(EIP2930SignedTransaction {
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
                odd_y_parity: value.v != 0,
                r: B256::from(value.r),
                s: B256::from(value.s),
            }),
            2 => SignedTransaction::EIP1559(EIP1559SignedTransaction {
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
                odd_y_parity: value.v != 0,
                r: B256::from(value.r),
                s: B256::from(value.s),
            }),
            r#type => {
                return Err(TransactionConversionError::UnsupportedType(r#type));
            }
        };

        Ok((transaction, value.from))
    }
}

/// Error that occurs when trying to convert the JSON-RPC `Block` type.
#[derive(Debug, thiserror::Error)]
pub enum BlockConversionError {
    /// Missing miner
    #[error("Missing miner")]
    MissingMiner,
    /// Missing nonce
    #[error("Missing nonce")]
    MissingNonce,
    /// Missing number
    #[error("Missing numbeer")]
    MissingNumber,
    /// Transaction conversion error
    #[error(transparent)]
    TransactionConversionError(#[from] TransactionConversionError),
}

impl TryFrom<Block<Transaction>> for BlockAndCallers {
    type Error = BlockConversionError;

    fn try_from(value: Block<Transaction>) -> Result<Self, Self::Error> {
        let (transactions, transaction_callers): (Vec<SignedTransaction>, Vec<Address>) =
            itertools::process_results(
                value.transactions.into_iter().map(TryInto::try_into),
                #[allow(clippy::redundant_closure_for_method_calls)]
                |iter| iter.unzip(),
            )?;

        let block = crate::block::Block {
            header: crate::block::Header {
                parent_hash: value.parent_hash,
                ommers_hash: value.sha3_uncles,
                beneficiary: value.miner.ok_or(BlockConversionError::MissingMiner)?,
                state_root: value.state_root,
                transactions_root: value.transactions_root,
                receipts_root: value.receipts_root,
                logs_bloom: value.logs_bloom,
                difficulty: value.difficulty,
                number: value.number.ok_or(BlockConversionError::MissingNumber)?,
                gas_limit: value.gas_limit,
                gas_used: value.gas_used,
                timestamp: value.timestamp,
                extra_data: value.extra_data,
                mix_hash: value.mix_hash,
                nonce: B64::from_limbs([value.nonce.ok_or(BlockConversionError::MissingNonce)?]),
                base_fee_per_gas: value.base_fee_per_gas,
                withdrawals_root: value.withdrawals_root,
            },
            transactions,
            // TODO: Include headers
            ommers: Vec::new(),
        };

        Ok(Self {
            block,
            transaction_callers,
        })
    }
}
